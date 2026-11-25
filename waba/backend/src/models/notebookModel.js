import db from '../../config/db.js';
import * as userModel from './userModel.js';

const VALID_STATUSES = ['ACTIVE', 'CURED', 'COMPLETED'];

const formatJourneyRow = (row) => ({
    id: row.id,
    note_code: row.note_code || null,
    pet_id: row.pet_id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    start_date: row.start_date,
    end_date: row.end_date,
    is_ongoing: Number(row.is_ongoing) === 1,
    status: row.status || (Number(row.is_ongoing) === 1 ? 'ACTIVE' : 'COMPLETED'),
    category: row.category || null,
    goal_summary: row.goal_summary || null,
    completed_at: row.completed_at || null,
    share_slug: row.share_slug,
    share_scope: row.share_scope,
    record_count: Number(row.record_count || 0),
    scrap_count: Number(row.scrap_count || 0),
    comment_count: Number(row.comment_count || 0),
    is_scrapped: Boolean(row.is_scrapped),
    created_at: row.created_at,
    updated_at: row.updated_at
});

const resolveJourneyId = async (idOrCode) => {
    const raw = String(idOrCode || '').trim();
    if (!raw) {
        const error = new Error('NOTEBOOK_NOT_FOUND');
        error.status = 404;
        throw error;
    }
    if (/^\d+$/.test(raw)) {
        return Number(raw);
    }
    const [rows] = await db.query(
        `SELECT id FROM pet_journeys WHERE note_code = ? OR share_slug = ? LIMIT 1`,
        [raw, raw]
    );
    if (!rows[0]) {
        const error = new Error('NOTEBOOK_NOT_FOUND');
        error.status = 404;
        throw error;
    }
    return rows[0].id;
};

export const getNotebooks = async ({
    userId = null,
    tab = 'all',
    status = 'ALL',
    category = '',
    q = '',
    page = 1,
    limit = 12
} = {}) => {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
    const offset = (safePage - 1) * safeLimit;

    if (tab === 'scrapped' && !userId) {
        return { notebooks: [], total: 0, page: safePage, limit: safeLimit };
    }

    const where = ['p.is_deleted = 0'];
    const params = [];

    if (tab === 'scrapped') {
        where.push("pj.share_scope != 'PRIVATE'");
        where.push('EXISTS (SELECT 1 FROM pet_journey_scraps pjs_f WHERE pjs_f.journey_id = pj.id AND pjs_f.user_id = ?)');
        params.push(userId);
    } else {
        where.push("pj.share_scope = 'PUBLIC'");
    }

    const upperStatus = String(status || 'ALL').toUpperCase();
    if (upperStatus !== 'ALL' && VALID_STATUSES.includes(upperStatus)) {
        where.push('pj.status = ?');
        params.push(upperStatus);
    }

    if (category && String(category).trim() && String(category).toUpperCase() !== 'ALL') {
        where.push('pj.category = ?');
        params.push(String(category).trim());
    }

    if (q && String(q).trim()) {
        const like = `%${String(q).trim()}%`;
        where.push('(pj.title LIKE ? OR pj.description LIKE ? OR pj.goal_summary LIKE ? OR p.name LIKE ? OR u.nickname LIKE ?)');
        params.push(like, like, like, like, like);
    }

    const whereSql = where.join(' AND ');
    const orderSql = tab === 'popular'
        ? 'scrap_count DESC, record_count DESC, pj.updated_at DESC, pj.id DESC'
        : 'pj.updated_at DESC, pj.id DESC';

    const countSql = `
        SELECT COUNT(*) AS total
        FROM pet_journeys pj
        JOIN pets p ON pj.pet_id = p.id
        JOIN users u ON pj.user_id = u.id
        WHERE ${whereSql}
    `;
    const [countRows] = await db.query(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    const listSql = `
        SELECT
            pj.id, pj.pet_id, pj.user_id, pj.title, pj.description,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS end_date,
            pj.is_ongoing, pj.status, pj.category, pj.goal_summary, pj.completed_at,
            pj.share_slug, pj.share_scope, pj.note_code, pj.created_at, pj.updated_at,
            p.name AS pet_name, p.species AS pet_species, p.custom_species AS pet_custom_species,
            p.breed AS pet_breed, p.current_avatar_url AS pet_avatar_url,
            u.nickname AS owner_nickname, u.profile_image_url AS owner_profile_image_url,
            (SELECT COUNT(*) FROM pet_histories ph WHERE ph.journey_id = pj.id AND (ph.is_private = 0${userId ? ' OR pj.user_id = ?' : ''})) AS record_count,
            (SELECT COUNT(*) FROM pet_journey_scraps pjs WHERE pjs.journey_id = pj.id) AS scrap_count,
            (SELECT COUNT(*) FROM pet_journey_comments pjc WHERE pjc.journey_id = pj.id AND pjc.is_deleted = 0) AS comment_count,
            ${userId ? 'EXISTS (SELECT 1 FROM pet_journey_scraps pjs_me WHERE pjs_me.journey_id = pj.id AND pjs_me.user_id = ?)' : '0'} AS is_scrapped,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pt.id,
                        'name', pt.name,
                        'species', pt.species,
                        'custom_species', pt.custom_species,
                        'breed', pt.breed,
                        'current_avatar_url', pt.current_avatar_url
                    )
                )
                FROM pet_journey_pets pjp
                JOIN pets pt ON pjp.pet_id = pt.id
                WHERE pjp.journey_id = pj.id AND pt.is_deleted = 0
            ), JSON_ARRAY()) AS pets
        FROM pet_journeys pj
        JOIN pets p ON pj.pet_id = p.id
        JOIN users u ON pj.user_id = u.id
        WHERE ${whereSql}
        ORDER BY ${orderSql}
        LIMIT ? OFFSET ?
    `;
    const listParams = userId ? [userId, userId, ...params, safeLimit, offset] : [...params, safeLimit, offset];
    const [rows] = await db.query(listSql, listParams);

    const notebooks = rows.map((r) => ({
        ...formatJourneyRow(r),
        pet: {
            id: r.pet_id,
            name: r.pet_name,
            species: r.pet_species,
            custom_species: r.pet_custom_species,
            breed: r.pet_breed,
            current_avatar_url: r.pet_avatar_url
        },
        pets: Array.isArray(r.pets) ? r.pets : [],
        owner: {
            id: r.user_id,
            nickname: r.owner_nickname,
            profile_image_url: r.owner_profile_image_url
        }
    }));

    return { notebooks, total, page: safePage, limit: safeLimit };
};

export const getNotebookDetail = async (idOrSlug, userId = null) => {
    const isNumericId = /^\d+$/.test(String(idOrSlug || ''));
    const condition = isNumericId ? 'pj.id = ?' : '(pj.note_code = ? OR pj.share_slug = ?)';
    const lookupVal = isNumericId ? Number(idOrSlug) : String(idOrSlug);
    const lookupParams = isNumericId ? [lookupVal] : [lookupVal, lookupVal];

    const [rows] = await db.query(
        `SELECT
            pj.id, pj.note_code, pj.pet_id, pj.user_id, pj.title, pj.description,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS end_date,
            pj.is_ongoing, pj.status, pj.category, pj.goal_summary, pj.completed_at,
            pj.share_slug, pj.share_scope, pj.note_code, pj.created_at, pj.updated_at,
            p.name AS pet_name, p.species AS pet_species, p.custom_species AS pet_custom_species,
            p.breed AS pet_breed, p.gender AS pet_gender, p.current_avatar_url AS pet_avatar_url,
            p.latest_weight_kg AS pet_latest_weight_kg,
            u.nickname AS owner_nickname, u.profile_image_url AS owner_profile_image_url,
            u.mentor_badge AS owner_mentor_badge, u.vet_license_info AS owner_vet_license_info,
            (SELECT COUNT(*) FROM pet_histories ph WHERE ph.journey_id = pj.id AND (ph.is_private = 0${userId ? ' OR pj.user_id = ?' : ''})) AS record_count,
            (SELECT COUNT(*) FROM pet_journey_scraps pjs WHERE pjs.journey_id = pj.id) AS scrap_count,
            (SELECT COUNT(*) FROM pet_journey_comments pjc WHERE pjc.journey_id = pj.id AND pjc.is_deleted = 0) AS comment_count,
            ${userId ? 'EXISTS (SELECT 1 FROM pet_journey_scraps pjs_me WHERE pjs_me.journey_id = pj.id AND pjs_me.user_id = ?)' : '0'} AS is_scrapped,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pt.id,
                        'name', pt.name,
                        'species', pt.species,
                        'custom_species', pt.custom_species,
                        'breed', pt.breed,
                        'current_avatar_url', pt.current_avatar_url
                    )
                )
                FROM pet_journey_pets pjp
                JOIN pets pt ON pjp.pet_id = pt.id
                WHERE pjp.journey_id = pj.id AND pt.is_deleted = 0
            ), JSON_ARRAY()) AS pets
         FROM pet_journeys pj
         JOIN pets p ON pj.pet_id = p.id
         JOIN users u ON pj.user_id = u.id
         WHERE ${condition} AND p.is_deleted = 0
         LIMIT 1`,
        userId ? [userId, userId, ...lookupParams] : lookupParams
    );

    if (!rows[0]) {
        const error = new Error('NOTEBOOK_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const row = rows[0];
    if (row.share_scope === 'PRIVATE' && row.user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    const [historyRows] = await db.query(
        `SELECT
            ph.id, ph.pet_id, ph.user_id, ph.journey_id,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS date,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS event_date,
            ph.category, ph.title, ph.description, ph.description AS notes,
            ph.hospital_name, ph.weight_kg, ph.is_ai_generated, ph.created_at, ph.updated_at,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pst.id,
                        'title', pst.title,
                        'thumbnail_url', (
                            SELECT pi.image_url
                            FROM post_images pi
                            WHERE pi.post_id = pst.id
                            ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC
                            LIMIT 1
                        )
                    )
                )
                FROM pet_history_posts php
                JOIN posts pst ON php.post_id = pst.id
                WHERE php.history_id = ph.id AND pst.status = 'PUBLISHED'
            ), JSON_ARRAY()) AS posts
         FROM pet_histories ph
         WHERE ph.journey_id = ?${row.user_id !== userId ? ' AND ph.is_private = 0' : ''}
         ORDER BY ph.event_date DESC, ph.id DESC`,
        [row.id]
    );

    const histories = historyRows.map((h) => ({
        ...h,
        weight_kg: h.weight_kg !== null ? Number(h.weight_kg) : null,
        is_ai_generated: Number(h.is_ai_generated) === 1 ? 1 : 0,
        posts: h.posts || []
    }));

    const [commentRows] = await db.query(
        `SELECT
            pjc.id, pjc.journey_id, pjc.user_id, pjc.content, pjc.created_at, pjc.updated_at,
            u.nickname, u.profile_image_url
         FROM pet_journey_comments pjc
         JOIN users u ON pjc.user_id = u.id
         WHERE pjc.journey_id = ? AND pjc.is_deleted = 0
         ORDER BY pjc.created_at ASC, pjc.id ASC`,
        [row.id]
    );

    const comments = commentRows.map((c) => ({
        id: c.id,
        journey_id: c.journey_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        updated_at: c.updated_at,
        author: {
            id: c.user_id,
            nickname: c.nickname,
            profile_image_url: c.profile_image_url
        }
    }));

    return {
        journey: formatJourneyRow(row),
        pet: {
            id: row.pet_id,
            name: row.pet_name,
            species: row.pet_species,
            custom_species: row.pet_custom_species,
            breed: row.pet_breed,
            gender: row.pet_gender,
            current_avatar_url: row.pet_avatar_url,
            latest_weight_kg: row.pet_latest_weight_kg !== null ? Number(row.pet_latest_weight_kg) : null
        },
        pets: Array.isArray(row.pets) ? row.pets : [],
        owner: {
            id: row.user_id,
            nickname: row.owner_nickname,
            profile_image_url: row.owner_profile_image_url,
            mentor_badge: row.owner_mentor_badge,
            vet_license_info: row.owner_vet_license_info
        },
        histories,
        comments
    };
};

const getJourneyMeta = async (journeyId) => {
    const [rows] = await db.query(
        `SELECT pj.* FROM pet_journeys pj JOIN pets p ON pj.pet_id = p.id WHERE pj.id = ? AND p.is_deleted = 0 LIMIT 1`,
        [journeyId]
    );
    if (!rows[0]) {
        const error = new Error('NOTEBOOK_NOT_FOUND');
        error.status = 404;
        throw error;
    }
    return rows[0];
};

export const toggleNotebookScrap = async (idOrCode, userId) => {
    const journeyId = await resolveJourneyId(idOrCode);
    const journey = await getJourneyMeta(journeyId);
    if (journey.share_scope === 'PRIVATE' && journey.user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    const [existing] = await db.query(
        `SELECT id FROM pet_journey_scraps WHERE journey_id = ? AND user_id = ? LIMIT 1`,
        [journeyId, userId]
    );

    let isScrapped = false;
    if (existing.length > 0) {
        await db.query(`DELETE FROM pet_journey_scraps WHERE id = ?`, [existing[0].id]);
        isScrapped = false;
    } else {
        await db.query(`INSERT INTO pet_journey_scraps (journey_id, user_id) VALUES (?, ?)`, [journeyId, userId]);
        isScrapped = true;
    }

    const [cntRows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM pet_journey_scraps WHERE journey_id = ?`,
        [journeyId]
    );

    return {
        is_scrapped: isScrapped,
        scrap_count: Number(cntRows[0]?.cnt || 0)
    };
};

export const updateNotebookStatus = async (idOrCode, userId, { status, goal_summary } = {}) => {
    const journeyId = await resolveJourneyId(idOrCode);
    const journey = await getJourneyMeta(journeyId);
    if (journey.user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    const nextStatus = String(status || '').toUpperCase();
    if (!VALID_STATUSES.includes(nextStatus)) {
        const error = new Error('INVALID_STATUS');
        error.status = 400;
        throw error;
    }

    const nextIsOngoing = nextStatus === 'ACTIVE' ? 1 : 0;
    const nextGoalSummary = goal_summary !== undefined
        ? (goal_summary ? String(goal_summary).trim().slice(0, 255) : null)
        : journey.goal_summary;

    await db.query(
        `UPDATE pet_journeys
         SET status = ?,
             is_ongoing = ?,
             goal_summary = ?,
             completed_at = ${nextStatus === 'ACTIVE' ? 'NULL' : 'NOW()'},
             updated_at = NOW()
         WHERE id = ?`,
        [nextStatus, nextIsOngoing, nextGoalSummary, journeyId]
    );

    const updated = await getJourneyMeta(journeyId);
    return {
        ...updated,
        is_ongoing: Number(updated.is_ongoing) === 1
    };
};

export const createNotebookComment = async (idOrCode, userId, content) => {
    const journeyId = await resolveJourneyId(idOrCode);
    const journey = await getJourneyMeta(journeyId);
    if (journey.share_scope === 'PRIVATE' && journey.user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    const trimmed = String(content || '').trim();
    if (!trimmed) {
        const error = new Error('CONTENT_REQUIRED');
        error.status = 400;
        throw error;
    }

    const [res] = await db.query(
        `INSERT INTO pet_journey_comments (journey_id, user_id, content) VALUES (?, ?, ?)`,
        [journeyId, userId, trimmed]
    );

    const [rows] = await db.query(
        `SELECT pjc.id, pjc.journey_id, pjc.user_id, pjc.content, pjc.created_at, pjc.updated_at,
                u.nickname, u.profile_image_url
         FROM pet_journey_comments pjc
         JOIN users u ON pjc.user_id = u.id
         WHERE pjc.id = ? LIMIT 1`,
        [res.insertId]
    );

    const c = rows[0];
    return {
        id: c.id,
        journey_id: c.journey_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        updated_at: c.updated_at,
        author: {
            id: c.user_id,
            nickname: c.nickname,
            profile_image_url: c.profile_image_url
        }
    };
};

export const deleteNotebookComment = async (idOrCode, commentId, userId) => {
    const journeyId = await resolveJourneyId(idOrCode);
    const journey = await getJourneyMeta(journeyId);
    const [rows] = await db.query(
        `SELECT id, user_id FROM pet_journey_comments WHERE id = ? AND journey_id = ? AND is_deleted = 0 LIMIT 1`,
        [commentId, journeyId]
    );
    if (!rows[0]) {
        const error = new Error('COMMENT_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    if (rows[0].user_id !== userId && journey.user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    await db.query(
        `UPDATE pet_journey_comments SET is_deleted = 1, updated_at = NOW() WHERE id = ?`,
        [commentId]
    );

    return { comment_id: Number(commentId) };
};

export const createNotebookHistory = async (idOrCode, userId, data) => {
    const journeyId = await resolveJourneyId(idOrCode);
    const journey = await getJourneyMeta(journeyId);
    if (journey.user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    const rawDate = data?.event_date || data?.date;
    const rawDescription = data?.description !== undefined ? data.description : data?.notes;
    const { title, category, hospital_name, weight_kg } = data || {};

    if (!rawDate || !String(rawDate).trim()) {
        const error = new Error('EVENT_DATE_REQUIRED');
        error.status = 400;
        throw error;
    }
    if (!title || !String(title).trim()) {
        const error = new Error('TITLE_REQUIRED');
        error.status = 400;
        throw error;
    }

    return await userModel.createPetHistory(userId, journey.pet_id, {
        event_date: String(rawDate).trim(),
        title: String(title).trim(),
        category,
        description: rawDescription ? String(rawDescription).trim() : null,
        hospital_name: hospital_name ? String(hospital_name).trim() : null,
        weight_kg,
        journey_id: Number(journey.id),
        post_ids: [],
        is_ai_generated: 0
    });
};

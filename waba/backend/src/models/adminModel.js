import db from '../../config/db.js';
import {
    normalizeAffiliateDomain,
    parseAllowedSubdomains,
    normalizeSubdomainList,
    getActiveAllowedDomains,
    evaluateAffiliateUrl
} from '../service/affiliateWhitelistService.js';

const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const calcDeltaPct = (current, previous) => {
    if (previous === null || previous === undefined) return null;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

const getPeriodRanges = (period = '7d') => {
    const normalized = ['today', '7d', '30d', 'all'].includes(period) ? period : '7d';
    if (normalized === 'all') {
        return { period: 'all', days: null, currentWhere: () => '1=1', prevWhere: null };
    }
    const days = normalized === 'today' ? 1 : (normalized === '30d' ? 30 : 7);
    return {
        period: normalized,
        days,
        currentWhere: (col) => `${col} >= DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)`,
        prevWhere: (col) => `${col} >= DATE_SUB(CURDATE(), INTERVAL ${days * 2 - 1} DAY) AND ${col} < DATE_SUB(CURDATE(), INTERVAL ${days - 1} DAY)`
    };
};

export const logAdminAction = async ({
    adminUserId,
    action,
    targetType,
    targetId = null,
    summary,
    detail = null,
    ipAddress = null
}) => {
    await db.query(
        `INSERT INTO admin_audit_logs (
            admin_user_id, action, target_type, target_id, summary, detail_json, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            adminUserId,
            action,
            targetType,
            targetId !== null && targetId !== undefined ? String(targetId) : null,
            String(summary || '').slice(0, 255),
            detail ? JSON.stringify(detail) : null,
            ipAddress ? String(ipAddress).slice(0, 45) : null
        ]
    );
};

export const getPendingReportCount = async () => {
    const [[row]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM reports WHERE status = 'PENDING'`
    );
    return Number(row?.cnt || 0);
};

export const getDashboardOverview = async ({ period = '7d', q = '' } = {}) => {
    const range = getPeriodRanges(period);
    const trendDays = range.days === 30 ? 30 : 7;

    // 1. KPI 집계
    const [[userTotalRow]] = await db.query(`SELECT COUNT(*) AS total FROM users`);
    const [[petTotalRow]] = await db.query(`SELECT COUNT(*) AS total FROM pets WHERE is_deleted = 0`);
    const [[newUsersRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM users WHERE ${range.currentWhere('created_at')}`
    );
    let prevNewUsers = null;
    if (range.prevWhere) {
        const [[prevRow]] = await db.query(
            `SELECT COUNT(*) AS cnt FROM users WHERE ${range.prevWhere('created_at')}`
        );
        prevNewUsers = Number(prevRow?.cnt || 0);
    }

    const [[newPostsRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM posts WHERE status = 'PUBLISHED' AND ${range.currentWhere('created_at')}`
    );
    const [[newCommentsRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM comments WHERE status = 'ACTIVE' AND ${range.currentWhere('created_at')}`
    );
    let prevPostsAndComments = null;
    if (range.prevWhere) {
        const [[prevPostsRow]] = await db.query(
            `SELECT COUNT(*) AS cnt FROM posts WHERE status = 'PUBLISHED' AND ${range.prevWhere('created_at')}`
        );
        const [[prevCommentsRow]] = await db.query(
            `SELECT COUNT(*) AS cnt FROM comments WHERE status = 'ACTIVE' AND ${range.prevWhere('created_at')}`
        );
        prevPostsAndComments = Number(prevPostsRow?.cnt || 0) + Number(prevCommentsRow?.cnt || 0);
    }

    const [[sensitiveRow]] = await db.query(
        `SELECT COUNT(*) AS cnt
         FROM post_images pi
         JOIN posts p ON pi.post_id = p.id
         WHERE pi.is_sensitive = 1 AND p.status = 'PUBLISHED'`
    );

    const [[aiHistoriesRow]] = await db.query(
        `SELECT
            SUM(CASE WHEN is_ai_generated = 1 THEN 1 ELSE 0 END) AS ai_cnt,
            COUNT(*) AS total_cnt
         FROM pet_histories
         WHERE ${range.currentWhere('created_at')}`
    );

    const [[publicNotebooksRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM pet_journeys WHERE share_scope = 'PUBLIC'`
    );

    const pendingReportsCount = await getPendingReportCount();
    const [[handledReportsRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM reports WHERE status IN ('RESOLVED', 'DISMISSED')`
    );
    const handledReportsCount = Number(handledReportsRow?.cnt || 0);

    const newUsers = Number(newUsersRow?.cnt || 0);
    const newPostsAndComments = Number(newPostsRow?.cnt || 0) + Number(newCommentsRow?.cnt || 0);
    const aiHistoriesCount = Number(aiHistoriesRow?.ai_cnt || 0);
    const totalHistoriesCount = Number(aiHistoriesRow?.total_cnt || 0);

    const kpi = {
        newUsers,
        newUsersDeltaPct: calcDeltaPct(newUsers, prevNewUsers),
        totalUsers: Number(userTotalRow?.total || 0),
        totalPets: Number(petTotalRow?.total || 0),
        newPostsAndComments,
        newPostsAndCommentsDeltaPct: calcDeltaPct(newPostsAndComments, prevPostsAndComments),
        sensitiveImagesCount: Number(sensitiveRow?.cnt || 0),
        aiHistoriesCount,
        totalHistoriesCount,
        aiAutoRatio: totalHistoriesCount > 0 ? Math.round((aiHistoriesCount / totalHistoriesCount) * 1000) / 10 : 0,
        publicNotebooksCount: Number(publicNotebooksRow?.cnt || 0),
        pendingTotal: pendingReportsCount,
        pendingReportsCount,
        handledReportsCount,
        pendingVerificationsCount: 0
    };

    // 2. 일별 활동 추이 (최근 7일 또는 30일)
    const [dailyPostRows] = await db.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS cnt
         FROM posts
         WHERE status = 'PUBLISHED' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${trendDays - 1} DAY)
         GROUP BY d`
    );
    const [dailyAiRows] = await db.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS cnt
         FROM pet_histories
         WHERE is_ai_generated = 1 AND created_at >= DATE_SUB(CURDATE(), INTERVAL ${trendDays - 1} DAY)
         GROUP BY d`
    );
    const [dailyUserRows] = await db.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS d, COUNT(*) AS cnt
         FROM users
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${trendDays - 1} DAY)
         GROUP BY d`
    );

    const postMap = new Map(dailyPostRows.map((r) => [r.d, Number(r.cnt || 0)]));
    const aiMap = new Map(dailyAiRows.map((r) => [r.d, Number(r.cnt || 0)]));
    const userMap = new Map(dailyUserRows.map((r) => [r.d, Number(r.cnt || 0)]));

    const dailyTrend = [];
    const today = new Date();
    for (let i = trendDays - 1; i >= 0; i--) {
        const dt = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const label = `${dt.getMonth() + 1}.${dd} ${KOREAN_DAYS[dt.getDay()]}`;
        dailyTrend.push({
            date: dateStr,
            label,
            posts: postMap.get(dateStr) || 0,
            aiHistories: aiMap.get(dateStr) || 0,
            newUsers: userMap.get(dateStr) || 0
        });
    }

    // 3. 즉시 확인 필요 (최대 6건)
    const [reportUrgent] = await db.query(
        `SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at
         FROM reports r
         WHERE r.status = 'PENDING'
         ORDER BY r.created_at DESC
         LIMIT 4`
    );
    const [sensitiveUrgent] = await db.query(
        `SELECT pi.id, p.id AS post_id, p.title, pi.created_at
         FROM post_images pi
         JOIN posts p ON pi.post_id = p.id
         WHERE pi.is_sensitive = 1 AND p.status = 'PUBLISHED'
         ORDER BY pi.created_at DESC
         LIMIT 2`
    );

    const urgentQueue = [
        ...reportUrgent.map((r) => ({
            id: `report-${r.id}`,
            type: 'REPORT',
            badge: '신고 접수',
            title: r.reason || '신고 접수',
            subtitle: `${r.target_type} #${r.target_id}`,
            targetUrl: `/admin/reports`,
            createdAt: r.created_at
        })),
        ...sensitiveUrgent.map((s) => ({
            id: `sensitive-${s.id}`,
            type: 'SENSITIVE_IMAGE',
            badge: '민감 이미지',
            title: s.title || '민감 이미지 포함 게시글',
            subtitle: `게시글 #${s.post_id}`,
            targetUrl: `/post/${s.post_id}`,
            createdAt: s.created_at
        }))
    ].slice(0, 6);

    // 4. 최근 게시글 & 큐레이션
    const searchTrimmed = String(q || '').trim();
    const postWhere = [`p.status = 'PUBLISHED'`];
    const postParams = [];
    if (searchTrimmed) {
        const like = `%${searchTrimmed}%`;
        postWhere.push(`(p.title LIKE ? OR u.nickname LIKE ? OR b.name LIKE ?)`);
        postParams.push(like, like, like);
    }

    const [recentPostRows] = await db.query(
        `SELECT
            p.id, p.title, p.board_id, b.name AS board_name,
            u.nickname AS author_nickname,
            p.view_count, p.like_count, p.curation_grade, p.created_at,
            (
                SELECT GROUP_CONCAT(pt.name SEPARATOR ', ')
                FROM post_pets pp
                JOIN pets pt ON pp.pet_id = pt.id
                WHERE pp.post_id = p.id
            ) AS pet_summary,
            EXISTS(
                SELECT 1 FROM post_images pi WHERE pi.post_id = p.id AND pi.is_sensitive = 1
            ) AS has_sensitive_image
         FROM posts p
         JOIN users u ON p.user_id = u.id
         JOIN boards b ON p.board_id = b.id
         WHERE ${postWhere.join(' AND ')}
         ORDER BY p.created_at DESC
         LIMIT 6`,
        postParams
    );

    const recentPosts = recentPostRows.map((p) => ({
        id: p.id,
        title: p.title,
        board_id: p.board_id,
        board_name: p.board_name,
        author_nickname: p.author_nickname,
        pet_summary: p.pet_summary || null,
        view_count: Number(p.view_count || 0),
        like_count: Number(p.like_count || 0),
        curation_grade: p.curation_grade || 'NORMAL_FEED',
        is_curated: p.curation_grade === 'FEATURED',
        has_sensitive_image: Boolean(p.has_sensitive_image),
        created_at: p.created_at
    }));

    const [[curatedRow]] = await db.query(
        `SELECT COUNT(*) AS cnt FROM posts WHERE status = 'PUBLISHED' AND curation_grade = 'FEATURED'`
    );

    // 5. 최근 관리자 감사 로그
    const [auditRows] = await db.query(
        `SELECT a.id, u.nickname AS admin_nickname, a.admin_user_id AS admin_id,
                a.action, a.target_type, a.target_id, a.summary, a.created_at
         FROM admin_audit_logs a
         LEFT JOIN users u ON a.admin_user_id = u.id
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 5`
    );

    // 6. 제휴 도메인 요약
    const [[affiliateRow]] = await db.query(
        `SELECT
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeCount,
            COUNT(*) AS totalCount
         FROM allowed_affiliate_domains`
    );

    return {
        period: range.period,
        kpi,
        dailyTrend,
        urgentQueue,
        recentPosts,
        curatedCount: Number(curatedRow?.cnt || 0),
        recentAuditLogs: auditRows,
        affiliateDomains: {
            activeCount: Number(affiliateRow?.activeCount || 0),
            totalCount: Number(affiliateRow?.totalCount || 0)
        }
    };
};

const VALID_CURATION_GRADES = ['MAIN_LOOKBOOK', 'LOOKBOOK_CANDIDATE', 'NORMAL_FEED'];
const CURATION_SPECIES_LIST = ['DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEAPIG', 'CHINCHILA'];

const parseCurationTargetSpecies = (raw) => {
    if (raw === null || raw === undefined || raw === '') return null;
    let arr = raw;
    if (typeof raw === 'string') {
        try {
            arr = JSON.parse(raw);
        } catch {
            return null;
        }
    }
    if (!Array.isArray(arr)) return null;
    const upper = arr.map((v) => String(v || '').trim().toUpperCase()).filter(Boolean);
    if (upper.includes('ALL')) return ['ALL'];
    return [...new Set(upper.filter((v) => CURATION_SPECIES_LIST.includes(v)))];
};

const normalizeCurationTargetSpeciesInput = (input) => {
    if (input === null || input === undefined) return null;
    if (!Array.isArray(input)) return null;
    const upper = input.map((v) => String(v || '').trim().toUpperCase()).filter(Boolean);
    if (upper.includes('ALL')) return ['ALL'];
    return [...new Set(upper.filter((v) => CURATION_SPECIES_LIST.includes(v)))];
};

const getAutoSpeciesByPostIds = async (postIds = []) => {
    const map = new Map();
    const uniqueIds = [...new Set((postIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return map;

    const placeholders = uniqueIds.map(() => '?').join(', ');
    const [rows] = await db.query(
        `SELECT src.post_id, UPPER(pt.species) AS species
         FROM (
             SELECT post_id, pet_id FROM post_pets WHERE post_id IN (${placeholders})
             UNION
             SELECT pi.post_id, pin.pet_id
             FROM product_pins pin
             JOIN post_images pi ON pin.post_image_id = pi.id
             WHERE pi.post_id IN (${placeholders}) AND pin.pin_type = 'PET' AND pin.pet_id IS NOT NULL
         ) AS src
         JOIN pets pt ON src.pet_id = pt.id`,
        [...uniqueIds, ...uniqueIds]
    );

    for (const r of rows) {
        const sp = String(r.species || '').trim().toUpperCase();
        if (!CURATION_SPECIES_LIST.includes(sp)) continue;
        if (!map.has(r.post_id)) map.set(r.post_id, []);
        const list = map.get(r.post_id);
        if (!list.includes(sp)) list.push(sp);
    }
    return map;
};

export const togglePostCuration = async (postId, payload, adminUser, ipAddress = null) => {
    let nextGrade = null;
    let targetSpeciesInput;
    if (typeof payload === 'boolean') {
        nextGrade = payload ? 'MAIN_LOOKBOOK' : 'NORMAL_FEED';
    } else if (payload && typeof payload === 'object') {
        if (payload.curation_grade !== undefined) {
            nextGrade = String(payload.curation_grade || '').trim().toUpperCase();
        } else if (payload.is_curated !== undefined) {
            nextGrade = payload.is_curated ? 'MAIN_LOOKBOOK' : 'NORMAL_FEED';
        }
        if (payload.curation_target_species !== undefined) {
            targetSpeciesInput = payload.curation_target_species;
        }
    }

    if (!VALID_CURATION_GRADES.includes(nextGrade)) {
        const error = new Error('올바른 큐레이션 등급을 선택해주세요.');
        error.status = 400;
        throw error;
    }

    const [existing] = await db.query(
        `SELECT id, title, curation_target_species FROM posts WHERE id = ? LIMIT 1`,
        [postId]
    );
    if (!existing[0]) {
        const error = new Error('POST_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const isPromoted = nextGrade === 'MAIN_LOOKBOOK' || nextGrade === 'LOOKBOOK_CANDIDATE';
    const hasTargetSpeciesUpdate = targetSpeciesInput !== undefined;
    const normalizedTargetSpecies = hasTargetSpeciesUpdate
        ? normalizeCurationTargetSpeciesInput(targetSpeciesInput)
        : parseCurationTargetSpecies(existing[0].curation_target_species);

    if (hasTargetSpeciesUpdate) {
        const serialized = normalizedTargetSpecies === null ? null : JSON.stringify(normalizedTargetSpecies);
        await db.query(
            `UPDATE posts
             SET curation_grade = ?, curation_target_species = ?, promoted_at = ${isPromoted ? 'NOW()' : 'NULL'}, updated_at = NOW()
             WHERE id = ?`,
            [nextGrade, serialized, postId]
        );
    } else {
        await db.query(
            `UPDATE posts
             SET curation_grade = ?, promoted_at = ${isPromoted ? 'NOW()' : 'NULL'}, updated_at = NOW()
             WHERE id = ?`,
            [nextGrade, postId]
        );
    }

    const [[updated]] = await db.query(`SELECT promoted_at FROM posts WHERE id = ? LIMIT 1`, [postId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POST_CURATION_UPDATE',
        targetType: 'POST',
        targetId: postId,
        summary: `게시글 '${existing[0].title}' 큐레이션 등급 변경 (${nextGrade})`,
        detail: { curation_grade: nextGrade, curation_target_species: normalizedTargetSpecies },
        ipAddress
    });

    return {
        postId,
        curation_grade: nextGrade,
        is_curated: nextGrade === 'MAIN_LOOKBOOK',
        curation_target_species: normalizedTargetSpecies,
        promoted_at: updated?.promoted_at || null
    };
};

const VALID_USER_ROLES = ['USER', 'VET', 'EDITOR', 'ADMIN'];
const VALID_USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'WITHDRAWN'];

export const getAdminUsers = async ({
    q = '',
    role = 'ALL',
    status = 'ALL',
    sort = 'latest',
    page = 1,
    limit = 20
} = {}) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    // 1. KPI 집계
    const [[userKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalUsers,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeUsers,
            SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspendedUsers,
            SUM(CASE WHEN status = 'WITHDRAWN' THEN 1 ELSE 0 END) AS withdrawnUsers,
            SUM(CASE WHEN role = 'VET' THEN 1 ELSE 0 END) AS vetCount,
            SUM(CASE WHEN role = 'EDITOR' THEN 1 ELSE 0 END) AS editorCount,
            SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) AS adminCount,
            SUM(CASE WHEN status = 'SUSPENDED' OR report_count > 0 THEN 1 ELSE 0 END) AS warningUsers
         FROM users`
    );

    const [[petKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalActivePets,
            SUM(CASE WHEN species = 'DOG' THEN 1 ELSE 0 END) AS dogCount,
            SUM(CASE WHEN species = 'CAT' THEN 1 ELSE 0 END) AS catCount,
            SUM(CASE WHEN species IN ('RABBIT','HAMSTER','GUINEAPIG','CHINCHILA','OTHER') THEN 1 ELSE 0 END) AS smallPetCount
         FROM pets
         WHERE is_deleted = 0`
    );

    const vetCount = Number(userKpi?.vetCount || 0);
    const editorCount = Number(userKpi?.editorCount || 0);
    const adminCount = Number(userKpi?.adminCount || 0);

    const kpi = {
        totalUsers: Number(userKpi?.totalUsers || 0),
        activeUsers: Number(userKpi?.activeUsers || 0),
        suspendedUsers: Number(userKpi?.suspendedUsers || 0),
        withdrawnUsers: Number(userKpi?.withdrawnUsers || 0),
        vetCount,
        editorCount,
        adminCount,
        expertTotal: vetCount + editorCount + adminCount,
        warningUsers: Number(userKpi?.warningUsers || 0),
        totalActivePets: Number(petKpi?.totalActivePets || 0),
        dogCount: Number(petKpi?.dogCount || 0),
        catCount: Number(petKpi?.catCount || 0),
        smallPetCount: Number(petKpi?.smallPetCount || 0)
    };

    // 2. 필터 조건
    const whereClauses = ['1=1'];
    const whereParams = [];

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push(`(
            u.nickname LIKE ?
            OR u.email LIKE ?
            OR u.id LIKE ?
            OR EXISTS (SELECT 1 FROM pets pt WHERE pt.user_id = u.id AND pt.name LIKE ?)
        )`);
        whereParams.push(like, like, like, like);
    }

    const upperRole = String(role || 'ALL').toUpperCase();
    if (upperRole !== 'ALL' && VALID_USER_ROLES.includes(upperRole)) {
        whereClauses.push('u.role = ?');
        whereParams.push(upperRole);
    }

    const upperStatus = String(status || 'ALL').toUpperCase();
    if (upperStatus !== 'ALL' && VALID_USER_STATUSES.includes(upperStatus)) {
        whereClauses.push('u.status = ?');
        whereParams.push(upperStatus);
    }

    const whereSql = whereClauses.join(' AND ');

    const [[countRow]] = await db.query(
        `SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`,
        whereParams
    );
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    let orderSql = 'u.created_at DESC, u.id DESC';
    if (sort === 'last_login') {
        orderSql = 'u.last_login_at DESC, u.created_at DESC';
    } else if (sort === 'reports') {
        orderSql = 'u.report_count DESC, u.created_at DESC';
    } else if (sort === 'pets') {
        orderSql = 'pet_count DESC, u.created_at DESC';
    }

    const [userRows] = await db.query(
        `SELECT
            u.id, u.email, u.nickname, u.profile_image_url, u.role,
            u.mentor_badge, u.vet_license_info, u.vet_license_number, u.vet_hospital_name,
            u.admin_title, u.admin_name, u.auto_journal_enabled,
            u.report_count, u.status, u.last_login_at, u.created_at,
            (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id AND p.status = 'PUBLISHED') AS post_count,
            (SELECT COUNT(*) FROM pet_histories ph WHERE ph.user_id = u.id) AS history_count,
            (SELECT COUNT(*) FROM pet_journeys pj WHERE pj.user_id = u.id) AS journey_count,
            (SELECT COUNT(*) FROM pets pt WHERE pt.user_id = u.id AND pt.is_deleted = 0) AS pet_count
         FROM users u
         WHERE ${whereSql}
         ORDER BY ${orderSql}
         LIMIT ? OFFSET ?`,
        [...whereParams, safeLimit, offset]
    );

    const userIds = userRows.map((u) => u.id);
    const petsByUser = new Map();
    if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(', ');
        const [petRows] = await db.query(
            `SELECT id, user_id, name, species, breed, current_avatar_url, is_primary
             FROM pets
             WHERE user_id IN (${placeholders}) AND is_deleted = 0
             ORDER BY is_primary DESC, created_at ASC`,
            userIds
        );
        for (const p of petRows) {
            if (!petsByUser.has(p.user_id)) petsByUser.set(p.user_id, []);
            petsByUser.get(p.user_id).push({
                id: p.id,
                name: p.name,
                species: p.species,
                breed: p.breed,
                current_avatar_url: p.current_avatar_url,
                is_primary: Number(p.is_primary || 0)
            });
        }
    }

    const users = userRows.map((u) => ({
        ...u,
        auto_journal_enabled: Number(u.auto_journal_enabled || 0),
        report_count: Number(u.report_count || 0),
        post_count: Number(u.post_count || 0),
        history_count: Number(u.history_count || 0),
        journey_count: Number(u.journey_count || 0),
        pet_count: Number(u.pet_count || 0),
        pets: petsByUser.get(u.id) || []
    }));

    return {
        kpi,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        },
        users
    };
};

export const getAdminUserDetail = async (userId) => {
    const [userRows] = await db.query(
        `SELECT
            id, email, nickname, profile_image_url, bio, role, mentor_badge,
            vet_license_info, vet_license_number, vet_hospital_name, admin_title, admin_name,
            is_multi_species, auto_journal_enabled, report_count,
            status, last_ip, last_login_at, withdrawn_at, created_at, updated_at
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [userId]
    );
    const user = userRows[0];
    if (!user) {
        const error = new Error('USER_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const [[summaryRow]] = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM pets WHERE user_id = ?) AS petCount,
            (SELECT COUNT(*) FROM pets WHERE user_id = ? AND is_deleted = 0) AS activePetCount,
            (SELECT COUNT(*) FROM posts WHERE user_id = ? AND status = 'PUBLISHED') AS postCount,
            (SELECT COUNT(*) FROM comments WHERE user_id = ? AND status = 'ACTIVE') AS commentCount,
            (SELECT COUNT(*) FROM pet_histories WHERE user_id = ?) AS historyCount,
            (SELECT COUNT(*) FROM pet_journeys WHERE user_id = ?) AS journeyCount`,
        [userId, userId, userId, userId, userId, userId]
    );

    const [pets] = await db.query(
        `SELECT
            id, name, species, custom_species, breed,
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
            gender, is_neutered, latest_weight_kg, current_avatar_url,
            is_primary, is_deleted, ai_private_data_consent, created_at
         FROM pets
         WHERE user_id = ?
         ORDER BY is_deleted ASC, is_primary DESC, created_at ASC`,
        [userId]
    );

    const [postRows] = await db.query(
        `SELECT
            p.id, p.board_id, b.name AS board_name, p.title, p.status,
            p.view_count, p.like_count, p.comment_count, p.created_at,
            p.deleted_at, p.delete_type, p.delete_reason, p.purge_scheduled_at,
            p.admin_extended_days, p.appeal_blocked
         FROM posts p
         LEFT JOIN boards b ON p.board_id = b.id
         WHERE p.user_id = ? AND p.status != 'DRAFT'
         ORDER BY p.created_at DESC
         LIMIT 30`,
        [userId]
    );

    const postIds = postRows.map((p) => p.id);
    const appealsByPost = new Map();
    if (postIds.length > 0) {
        const placeholders = postIds.map(() => '?').join(', ');
        const [appealRows] = await db.query(
            `SELECT id, post_id, attempt_no, reason, status, extended_by_appeal, blocked_reappeal, admin_note, handled_at, created_at
             FROM post_appeals
             WHERE post_id IN (${placeholders})
             ORDER BY attempt_no ASC, id ASC`,
            postIds
        );
        for (const a of appealRows) {
            if (!appealsByPost.has(a.post_id)) appealsByPost.set(a.post_id, []);
            appealsByPost.get(a.post_id).push(a);
        }
    }

    const posts = postRows.map((p) => {
        const appeals = appealsByPost.get(p.id) || [];
        const latest = appeals.length > 0 ? appeals[appeals.length - 1] : null;
        return {
            ...p,
            appeal_blocked: Boolean(Number(p.appeal_blocked || 0)),
            appeals,
            appeal_id: latest?.id || null,
            appeal_status: latest?.status || null,
            appeal_reason: latest?.reason || null,
            appeal_attempt_no: latest?.attempt_no || 0,
            extended_by_appeal: latest ? Number(latest.extended_by_appeal || 0) : 0,
            admin_note: latest?.admin_note || null,
            appeal_created_at: latest?.created_at || null,
            has_approved_appeal: appeals.some((a) => a.status === 'APPROVED')
        };
    });

    const [histories] = await db.query(
        `SELECT
            ph.id, ph.pet_id,
            COALESCE(
                (SELECT GROUP_CONCAT(pt.name SEPARATOR ', ')
                 FROM pet_history_pets php
                 JOIN pets pt ON php.pet_id = pt.id
                 WHERE php.history_id = ph.id),
                (SELECT pt2.name FROM pets pt2 WHERE pt2.id = ph.pet_id LIMIT 1)
            ) AS pet_names,
            ph.journey_id, pj.title AS journey_title,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS event_date,
            ph.category, ph.title, ph.hospital_name, ph.weight_kg,
            ph.is_ai_generated, ph.created_at
         FROM pet_histories ph
         LEFT JOIN pet_journeys pj ON ph.journey_id = pj.id
         WHERE ph.user_id = ?
         ORDER BY ph.event_date DESC, ph.created_at DESC
         LIMIT 30`,
        [userId]
    );

    const [journeys] = await db.query(
        `SELECT
            pj.id, pj.note_code, pj.share_slug, pj.title, pj.category,
            pj.status, pj.share_scope,
            COALESCE(
                (SELECT GROUP_CONCAT(pt.name SEPARATOR ', ')
                 FROM pet_journey_pets pjp
                 JOIN pets pt ON pjp.pet_id = pt.id
                 WHERE pjp.journey_id = pj.id),
                (SELECT pt2.name FROM pets pt2 WHERE pt2.id = pj.pet_id LIMIT 1)
            ) AS pet_names,
            (SELECT COUNT(*) FROM pet_histories ph WHERE ph.journey_id = pj.id) AS history_count,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            pj.created_at
         FROM pet_journeys pj
         WHERE pj.user_id = ?
         ORDER BY pj.created_at DESC
         LIMIT 30`,
        [userId]
    );

    const [reportedPostRows] = await db.query(
        `SELECT * FROM (
            SELECT
                p.id AS post_id,
                MAX(p.title) AS post_title,
                MAX(p.status) AS post_status,
                MAX(p.board_id) AS board_id,
                MAX(b.name) AS board_name,
                MAX(p.user_id) AS author_id,
                MAX(u.nickname) AS author_nickname,
                MAX(u.role) AS author_role,
                MAX(p.deleted_at) AS deleted_at,
                MAX(p.delete_type) AS delete_type,
                MAX(p.delete_reason) AS delete_reason,
                MAX(p.purge_scheduled_at) AS purge_scheduled_at,
                MAX(COALESCE(p.admin_extended_days, 0)) AS admin_extended_days,
                MAX(COALESCE(p.appeal_blocked, 0)) AS appeal_blocked,
                COUNT(r.id) AS total_report_count,
                SUM(CASE WHEN r.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_report_count,
                SUM(CASE WHEN r.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_report_count,
                SUM(CASE WHEN r.status = 'DISMISSED' THEN 1 ELSE 0 END) AS dismissed_report_count,
                MAX(r.created_at) AS latest_report_at,
                SUBSTRING_INDEX(GROUP_CONCAT(r.reason ORDER BY r.created_at DESC, r.id DESC SEPARATOR '|||'), '|||', 1) AS latest_reason,
                COALESCE((SELECT COUNT(*) FROM post_appeals pa WHERE pa.post_id = p.id), 0) AS appeal_count,
                COALESCE((SELECT SUM(CASE WHEN pa.status = 'PENDING' THEN 1 ELSE 0 END) FROM post_appeals pa WHERE pa.post_id = p.id), 0) AS pending_appeal_count,
                (SELECT pa.status FROM post_appeals pa WHERE pa.post_id = p.id ORDER BY pa.attempt_no DESC, pa.id DESC LIMIT 1) AS latest_appeal_status
             FROM posts p
             JOIN reports r ON r.target_type = 'POST' AND r.target_id = p.id
             LEFT JOIN boards b ON p.board_id = b.id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ?
             GROUP BY p.id
         ) AS user_reported_posts
         ORDER BY (pending_report_count > 0) DESC, (pending_appeal_count > 0) DESC, latest_report_at DESC`,
        [userId]
    );

    const reportedPosts = reportedPostRows.map((row) => ({
        ...row,
        appeal_blocked: Boolean(Number(row.appeal_blocked || 0)),
        admin_extended_days: Number(row.admin_extended_days || 0),
        total_report_count: Number(row.total_report_count || 0),
        pending_report_count: Number(row.pending_report_count || 0),
        resolved_report_count: Number(row.resolved_report_count || 0),
        dismissed_report_count: Number(row.dismissed_report_count || 0),
        appeal_count: Number(row.appeal_count || 0),
        pending_appeal_count: Number(row.pending_appeal_count || 0)
    }));

    const pendingReportCount = reportedPosts.reduce((sum, rp) => sum + rp.pending_report_count, 0);

    return {
        user,
        summary: {
            petCount: Number(summaryRow?.petCount || 0),
            activePetCount: Number(summaryRow?.activePetCount || 0),
            postCount: Number(summaryRow?.postCount || 0),
            commentCount: Number(summaryRow?.commentCount || 0),
            historyCount: Number(summaryRow?.historyCount || 0),
            journeyCount: Number(summaryRow?.journeyCount || 0),
            reportedPostCount: reportedPosts.length,
            pendingReportCount
        },
        pets,
        posts,
        reportedPosts,
        histories,
        journeys
    };
};

export const updateAdminUser = async (userId, data = {}, adminUser, ipAddress = null) => {
    const [existingRows] = await db.query(
        `SELECT id, nickname, role, vet_license_info, vet_license_number, vet_hospital_name, admin_title, admin_name, status
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );
    const existing = existingRows[0];
    if (!existing) {
        const error = new Error('USER_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const { role, vet_license_number, vet_hospital_name, admin_title, admin_name, status, reason } = data || {};

    if (role !== undefined && !VALID_USER_ROLES.includes(role)) {
        const error = new Error('INVALID_ROLE');
        error.status = 400;
        throw error;
    }
    if (status !== undefined && !VALID_USER_STATUSES.includes(status)) {
        const error = new Error('INVALID_STATUS');
        error.status = 400;
        throw error;
    }

    if (userId === adminUser.id && ((role !== undefined && role !== 'ADMIN') || (status !== undefined && status !== 'ACTIVE'))) {
        const error = new Error('CANNOT_DEMOTE_SELF');
        error.status = 400;
        throw error;
    }

    const updates = [];
    const params = [];

    const hasRoleOrMetaChange = [role, vet_license_number, vet_hospital_name, admin_title, admin_name]
        .some((v) => v !== undefined);

    if (role !== undefined) {
        updates.push('role = ?');
        params.push(role);
    }

    if (hasRoleOrMetaChange) {
        const effectiveRole = role !== undefined ? role : existing.role;
        if (effectiveRole === 'VET') {
            const license = vet_license_number !== undefined
                ? (vet_license_number ? String(vet_license_number).trim() : null)
                : (existing.vet_license_number || null);
            const hospital = vet_hospital_name !== undefined
                ? (vet_hospital_name ? String(vet_hospital_name).trim() : null)
                : (existing.vet_hospital_name || null);
            const licenseInfo = [license, hospital].filter(Boolean).join(' / ') || null;

            updates.push('vet_license_number = ?', 'vet_hospital_name = ?', 'vet_license_info = ?', 'admin_title = NULL', 'admin_name = NULL');
            params.push(license, hospital, licenseInfo);
        } else if (effectiveRole === 'ADMIN') {
            const nextTitle = admin_title !== undefined
                ? (admin_title ? String(admin_title).trim() : null)
                : (existing.admin_title || null);
            const nextName = admin_name !== undefined
                ? (admin_name ? String(admin_name).trim() : null)
                : (existing.admin_name || null);

            updates.push('admin_title = ?', 'admin_name = ?', 'vet_license_number = NULL', 'vet_hospital_name = NULL', 'vet_license_info = NULL');
            params.push(nextTitle, nextName);
        } else {
            updates.push('vet_license_number = NULL', 'vet_hospital_name = NULL', 'vet_license_info = NULL', 'admin_title = NULL', 'admin_name = NULL');
        }
    }

    if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
        if (status === 'WITHDRAWN') {
            updates.push('withdrawn_at = NOW()');
        } else if (status === 'ACTIVE') {
            updates.push('withdrawn_at = NULL');
        }
    }

    if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        params.push(userId);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        const action = status !== undefined && status !== existing.status ? 'USER_STATUS_CHANGE' : 'USER_ROLE_UPDATE';
        await logAdminAction({
            adminUserId: adminUser.id,
            action,
            targetType: 'USER',
            targetId: userId,
            summary: `회원 '${existing.nickname}' 정보/상태 변경${reason ? ` (${String(reason).slice(0, 80)})` : ''}`,
            detail: { role, vet_license_number, vet_hospital_name, admin_title, admin_name, status, reason: reason || null },
            ipAddress
        });
    }

    const [updatedRows] = await db.query(
        `SELECT id, email, nickname, profile_image_url, role, mentor_badge,
                vet_license_info, vet_license_number, vet_hospital_name, admin_title, admin_name,
                status, withdrawn_at, updated_at
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );
    return updatedRows[0];
};

export const updateAdminPetStatus = async (petId, isDeleted, reason = '', adminUser, ipAddress = null) => {
    const [existingRows] = await db.query(
        `SELECT id, name, user_id, is_deleted FROM pets WHERE id = ? LIMIT 1`,
        [petId]
    );
    const existing = existingRows[0];
    if (!existing) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const nextDeleted = isDeleted ? 1 : 0;
    await db.query(
        `UPDATE pets
         SET is_deleted = ?, deleted_at = ${nextDeleted ? 'NOW()' : 'NULL'}, updated_at = NOW()
         WHERE id = ?`,
        [nextDeleted, petId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: nextDeleted ? 'PET_ADMIN_DELETE' : 'PET_ADMIN_RESTORE',
        targetType: 'PET',
        targetId: petId,
        summary: `반려동물 '${existing.name}' 관리자 ${nextDeleted ? '숨김(삭제)' : '복구'}${reason ? ` (${String(reason).slice(0, 80)})` : ''}`,
        detail: { is_deleted: Boolean(nextDeleted), reason: reason || null },
        ipAddress
    });

    return {
        petId,
        is_deleted: Boolean(nextDeleted)
    };
};

export const extendPostPurge = async (postId, extendDays, reason, adminUser, ipAddress = null) => {
    const days = parseInt(extendDays, 10);
    const trimmedReason = String(reason || '').trim();
    if (!Number.isInteger(days) || days < 1 || days > 30) {
        const err = new Error('INVALID_EXTEND_DAYS');
        err.status = 400;
        throw err;
    }
    if (!trimmedReason) {
        const err = new Error('REASON_REQUIRED');
        err.status = 400;
        throw err;
    }

    const [rows] = await db.query(
        `SELECT id, title, status, purge_scheduled_at, admin_extended_days FROM posts WHERE id = ? LIMIT 1`,
        [postId]
    );
    const post = rows[0];
    if (!post) {
        const err = new Error('POST_NOT_FOUND');
        err.status = 404;
        throw err;
    }
    if (post.status !== 'DELETED' || !post.purge_scheduled_at) {
        const err = new Error('NOT_DELETED_POST');
        err.status = 400;
        throw err;
    }

    const currentExtended = Number(post.admin_extended_days || 0);
    if (currentExtended + days > 30) {
        const remainingAllowed = Math.max(0, 30 - currentExtended);
        const err = new Error(`관리자 연장 한도(최대 30일)를 초과했습니다. 남은 추가 가능 일수: ${remainingAllowed}일`);
        err.status = 400;
        throw err;
    }

    await db.query(
        `UPDATE posts
         SET purge_scheduled_at = DATE_ADD(purge_scheduled_at, INTERVAL ? DAY),
             admin_extended_days = admin_extended_days + ?,
             updated_at = NOW()
         WHERE id = ?`,
        [days, days, postId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POST_PURGE_EXTEND',
        targetType: 'POST',
        targetId: postId,
        summary: `게시글 '${post.title}' 영구 삭제 유예 +${days}일 연장 (${trimmedReason.slice(0, 80)})`,
        detail: { extendDays: days, reason: trimmedReason },
        ipAddress
    });

    const [[updated]] = await db.query(
        `SELECT purge_scheduled_at, admin_extended_days FROM posts WHERE id = ? LIMIT 1`,
        [postId]
    );

    return {
        postId,
        purge_scheduled_at: updated?.purge_scheduled_at,
        admin_extended_days: Number(updated?.admin_extended_days || 0)
    };
};

export const restorePost = async (postId, adminNote = '', adminUser, ipAddress = null) => {
    const [rows] = await db.query(`SELECT id, title FROM posts WHERE id = ? LIMIT 1`, [postId]);
    if (!rows[0]) {
        const err = new Error('POST_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    await db.query(
        `UPDATE posts
         SET status = 'PUBLISHED',
             deleted_at = NULL,
             delete_type = NULL,
             delete_reason = NULL,
             deleted_by = NULL,
             purge_scheduled_at = NULL,
             admin_extended_days = 0,
             appeal_blocked = 0,
             updated_at = NOW()
         WHERE id = ?`,
        [postId]
    );

    const safeNote = adminNote ? String(adminNote).trim().slice(0, 2000) : null;
    await db.query(
        `UPDATE post_appeals
         SET status = 'APPROVED',
             admin_note = COALESCE(?, admin_note),
             handled_by = ?,
             handled_at = NOW()
         WHERE post_id = ? AND status = 'PENDING'`,
        [safeNote, adminUser.id, postId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POST_ADMIN_RESTORE',
        targetType: 'POST',
        targetId: postId,
        summary: `게시글 '${rows[0].title}' 관리자 복구${safeNote ? ` (${safeNote.slice(0, 80)})` : ''}`,
        detail: { adminNote: safeNote },
        ipAddress
    });

    return { postId, status: 'PUBLISHED' };
};

export const rejectPostAppeal = async (postId, reason, blockReappeal = false, adminUser, ipAddress = null) => {
    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) {
        const err = new Error('반려 사유를 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const [appealRows] = await db.query(
        `SELECT id, attempt_no, status
         FROM post_appeals
         WHERE post_id = ? AND status = 'PENDING'
         ORDER BY attempt_no DESC, id DESC
         LIMIT 1`,
        [postId]
    );
    const appeal = appealRows[0];
    if (!appeal) {
        const err = new Error('심사 대기 중인 이의 제기가 없습니다.');
        err.status = 404;
        throw err;
    }

    const attemptNo = Number(appeal.attempt_no || 1);
    if (Boolean(blockReappeal) && attemptNo <= 3) {
        const err = new Error('재이의 제기 차단은 3회 초과(4회차 이상) 이의 제기부터 가능합니다.');
        err.status = 400;
        throw err;
    }

    const shouldBlock = Boolean(blockReappeal) && attemptNo > 3;
    const safeReason = trimmedReason.slice(0, 2000);

    await db.query(
        `UPDATE post_appeals
         SET status = 'REJECTED',
             admin_note = ?,
             blocked_reappeal = ?,
             handled_by = ?,
             handled_at = NOW()
         WHERE id = ?`,
        [safeReason, shouldBlock ? 1 : 0, adminUser.id, appeal.id]
    );

    if (shouldBlock) {
        await db.query(
            `UPDATE posts SET appeal_blocked = 1, updated_at = NOW() WHERE id = ?`,
            [postId]
        );
    }

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POST_APPEAL_REJECT',
        targetType: 'POST',
        targetId: postId,
        summary: `게시글 #${postId} ${attemptNo}차 이의 제기 반려${shouldBlock ? ' (재이의 차단)' : ''}`,
        detail: {
            appealId: appeal.id,
            attemptNo,
            reason: safeReason,
            blockedReappeal: shouldBlock
        },
        ipAddress
    });

    return {
        success: true,
        postId,
        appealId: appeal.id,
        status: 'REJECTED',
        attempt_no: attemptNo,
        appeal_blocked: shouldBlock
    };
};

export const getAdminReports = async ({
    status = 'ALL',
    q = '',
    page = 1,
    limit = 20
} = {}) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const [[kpiRow]] = await db.query(
        `SELECT
            COUNT(*) AS totalCount,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pendingCount,
            SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolvedCount,
            SUM(CASE WHEN status = 'DISMISSED' THEN 1 ELSE 0 END) AS dismissedCount,
            COUNT(DISTINCT CASE WHEN status = 'PENDING' AND target_type = 'POST' THEN target_id ELSE NULL END) AS pendingPostCount
         FROM reports`
    );
    const [[appealKpiRow]] = await db.query(
        `SELECT COUNT(*) AS pendingAppealCount FROM post_appeals WHERE status = 'PENDING'`
    );

    const kpi = {
        totalCount: Number(kpiRow?.totalCount || 0),
        pendingCount: Number(kpiRow?.pendingCount || 0),
        resolvedCount: Number(kpiRow?.resolvedCount || 0),
        dismissedCount: Number(kpiRow?.dismissedCount || 0),
        pendingPostCount: Number(kpiRow?.pendingPostCount || 0),
        pendingAppealCount: Number(appealKpiRow?.pendingAppealCount || 0)
    };

    const whereClauses = ["r.target_type = 'POST'"];
    const whereParams = [];

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push(`(
            reporter.nickname LIKE ?
            OR reporter.email LIKE ?
            OR author.nickname LIKE ?
            OR p.title LIKE ?
            OR r.reason LIKE ?
            OR r.detail LIKE ?
            OR r.target_id LIKE ?
        )`);
        whereParams.push(like, like, like, like, like, like, like);
    }

    const whereSql = whereClauses.join(' AND ');

    const upperStatus = String(status || 'ALL').toUpperCase();
    const havingClauses = [];
    if (upperStatus === 'PENDING') {
        havingClauses.push('pending_report_count > 0');
    } else if (upperStatus === 'APPEAL_PENDING') {
        havingClauses.push('pending_appeal_count > 0');
    } else if (upperStatus === 'RESOLVED') {
        havingClauses.push('pending_report_count = 0 AND resolved_report_count > 0');
    } else if (upperStatus === 'DISMISSED') {
        havingClauses.push('pending_report_count = 0 AND resolved_report_count = 0 AND dismissed_report_count > 0');
    }
    const havingSql = havingClauses.length > 0 ? `HAVING ${havingClauses.join(' AND ')}` : '';

    const groupedBaseSql = `
        SELECT
            r.target_id AS post_id,
            MAX(p.title) AS post_title,
            MAX(p.status) AS post_status,
            MAX(p.board_id) AS board_id,
            MAX(b.name) AS board_name,
            MAX(p.user_id) AS author_id,
            MAX(author.nickname) AS author_nickname,
            MAX(author.email) AS author_email,
            MAX(author.role) AS author_role,
            MAX(p.deleted_at) AS deleted_at,
            MAX(p.delete_type) AS delete_type,
            MAX(p.delete_reason) AS delete_reason,
            MAX(p.purge_scheduled_at) AS purge_scheduled_at,
            MAX(COALESCE(p.admin_extended_days, 0)) AS admin_extended_days,
            MAX(COALESCE(p.appeal_blocked, 0)) AS appeal_blocked,
            COUNT(r.id) AS total_report_count,
            SUM(CASE WHEN r.status = 'PENDING' THEN 1 ELSE 0 END) AS pending_report_count,
            SUM(CASE WHEN r.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_report_count,
            SUM(CASE WHEN r.status = 'DISMISSED' THEN 1 ELSE 0 END) AS dismissed_report_count,
            MAX(r.created_at) AS latest_report_at,
            SUBSTRING_INDEX(GROUP_CONCAT(r.reason ORDER BY r.created_at DESC, r.id DESC SEPARATOR '|||'), '|||', 1) AS latest_reason,
            COALESCE((SELECT COUNT(*) FROM post_appeals pa WHERE pa.post_id = r.target_id), 0) AS appeal_count,
            COALESCE((SELECT SUM(CASE WHEN pa.status = 'PENDING' THEN 1 ELSE 0 END) FROM post_appeals pa WHERE pa.post_id = r.target_id), 0) AS pending_appeal_count,
            (SELECT pa.status FROM post_appeals pa WHERE pa.post_id = r.target_id ORDER BY pa.attempt_no DESC, pa.id DESC LIMIT 1) AS latest_appeal_status
        FROM reports r
        LEFT JOIN users reporter ON r.reporter_user_id = reporter.id
        LEFT JOIN posts p ON r.target_id = p.id
        LEFT JOIN boards b ON p.board_id = b.id
        LEFT JOIN users author ON p.user_id = author.id
        WHERE ${whereSql}
        GROUP BY r.target_id
        ${havingSql}
    `;

    const [[countRow]] = await db.query(
        `SELECT COUNT(*) AS total FROM (${groupedBaseSql}) AS grouped_tbl`,
        whereParams
    );
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const [groupedRows] = await db.query(
        `SELECT * FROM (${groupedBaseSql}) AS grouped_list
         ORDER BY (pending_report_count > 0) DESC, (pending_appeal_count > 0) DESC, latest_report_at DESC
         LIMIT ? OFFSET ?`,
        [...whereParams, safeLimit, offset]
    );

    const groupedPosts = groupedRows.map((row) => ({
        ...row,
        appeal_blocked: Boolean(Number(row.appeal_blocked || 0)),
        admin_extended_days: Number(row.admin_extended_days || 0),
        total_report_count: Number(row.total_report_count || 0),
        pending_report_count: Number(row.pending_report_count || 0),
        resolved_report_count: Number(row.resolved_report_count || 0),
        dismissed_report_count: Number(row.dismissed_report_count || 0),
        appeal_count: Number(row.appeal_count || 0),
        pending_appeal_count: Number(row.pending_appeal_count || 0)
    }));

    return {
        kpi,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        },
        groupedPosts
    };
};

export const handleAdminReport = async (reportId, decision, decisionReason, adminUser, ipAddress = null) => {
    const upperDecision = String(decision || '').toUpperCase();
    if (!['APPROVE', 'REJECT'].includes(upperDecision)) {
        const err = new Error('올바른 처리 결정(APPROVE 또는 REJECT)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const trimmedReason = String(decisionReason || '').trim();
    if (!trimmedReason) {
        const err = new Error('결정 사유를 입력해주세요.');
        err.status = 400;
        throw err;
    }
    const safeDecisionReason = trimmedReason.slice(0, 2000);

    const [reportRows] = await db.query(
        `SELECT id, reporter_user_id, target_type, target_id, reason, status
         FROM reports
         WHERE id = ?
         LIMIT 1`,
        [reportId]
    );
    const report = reportRows[0];
    if (!report) {
        const err = new Error('신고 내역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    if (report.status !== 'PENDING') {
        const err = new Error('이미 처리된 신고입니다.');
        err.status = 400;
        throw err;
    }

    if (upperDecision === 'APPROVE') {
        await db.query(
            `UPDATE reports
             SET status = 'RESOLVED',
                 handled_by = ?,
                 handled_note = ?,
                 handled_at = NOW()
             WHERE id = ?`,
            [adminUser.id, safeDecisionReason, reportId]
        );

        if (report.target_type === 'POST') {
            const batchNote = `[동일 게시글 일괄 승인] ${safeDecisionReason}`.slice(0, 2000);
            await db.query(
                `UPDATE reports
                 SET status = 'RESOLVED',
                     handled_by = ?,
                     handled_note = ?,
                     handled_at = NOW()
                 WHERE target_type = 'POST' AND target_id = ? AND status = 'PENDING' AND id != ?`,
                [adminUser.id, batchNote, report.target_id, reportId]
            );

            const [postRows] = await db.query(
                `SELECT id, user_id, status FROM posts WHERE id = ? LIMIT 1`,
                [report.target_id]
            );
            const targetPost = postRows[0];
            if (targetPost && targetPost.status !== 'DELETED') {
                await db.query(
                    `UPDATE posts
                     SET status = 'DELETED',
                         deleted_at = NOW(),
                         delete_type = 'ADMIN_REPORT',
                         delete_reason = ?,
                         deleted_by = ?,
                         purge_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
                         admin_extended_days = 0,
                         appeal_blocked = 0,
                         updated_at = NOW()
                     WHERE id = ?`,
                    [report.reason, adminUser.id, report.target_id]
                );

                await db.query(
                    `UPDATE users SET report_count = report_count + 1 WHERE id = ?`,
                    [targetPost.user_id]
                );
            }
        }

        await logAdminAction({
            adminUserId: adminUser.id,
            action: 'REPORT_APPROVE',
            targetType: 'REPORT',
            targetId: String(reportId),
            summary: `신고 #${reportId} 승인 (${report.target_type} #${report.target_id})`,
            detail: {
                decision: 'APPROVE',
                targetType: report.target_type,
                targetId: report.target_id,
                decisionReason: safeDecisionReason
            },
            ipAddress
        });

        return {
            success: true,
            reportId,
            status: 'RESOLVED',
            decision: 'APPROVE',
            handled_note: safeDecisionReason
        };
    }

    await db.query(
        `UPDATE reports
         SET status = 'DISMISSED',
             handled_by = ?,
             handled_note = ?,
             handled_at = NOW()
         WHERE id = ?`,
        [adminUser.id, safeDecisionReason, reportId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'REPORT_REJECT',
        targetType: 'REPORT',
        targetId: String(reportId),
        summary: `신고 #${reportId} 반려 (${report.target_type} #${report.target_id})`,
        detail: {
            decision: 'REJECT',
            targetType: report.target_type,
            targetId: report.target_id,
            decisionReason: safeDecisionReason
        },
        ipAddress
    });

    return {
        success: true,
        reportId,
        status: 'DISMISSED',
        decision: 'REJECT',
        handled_note: safeDecisionReason
    };
};

export const getPostModerationDetail = async (postId) => {
    const [postRows] = await db.query(
        `SELECT
            p.id, p.title, p.status, p.board_id, b.name AS board_name,
            p.user_id, u.nickname AS author_nickname, u.email AS author_email, u.role AS author_role,
            p.deleted_at, p.delete_type, p.delete_reason, p.purge_scheduled_at,
            p.admin_extended_days, p.appeal_blocked, p.created_at
         FROM posts p
         LEFT JOIN boards b ON p.board_id = b.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?
         LIMIT 1`,
        [postId]
    );
    const postRow = postRows[0];
    if (!postRow) {
        const err = new Error('POST_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const post = {
        ...postRow,
        appeal_blocked: Boolean(Number(postRow.appeal_blocked || 0)),
        admin_extended_days: Number(postRow.admin_extended_days || 0)
    };

    const [reports] = await db.query(
        `SELECT
            r.id, r.target_type, r.target_id, r.reason, r.detail, r.status, r.created_at,
            r.reporter_user_id,
            reporter.nickname AS reporter_nickname,
            reporter.email AS reporter_email,
            reporter.role AS reporter_role,
            reporter.profile_image_url AS reporter_avatar,
            r.handled_by,
            handler.nickname AS handled_by_nickname,
            r.handled_note,
            r.handled_at
         FROM reports r
         LEFT JOIN users reporter ON r.reporter_user_id = reporter.id
         LEFT JOIN users handler ON r.handled_by = handler.id
         WHERE r.target_type = 'POST' AND r.target_id = ?
         ORDER BY CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END, r.created_at DESC, r.id DESC`,
        [postId]
    );

    const [appeals] = await db.query(
        `SELECT
            pa.id, pa.post_id, pa.user_id, pa.attempt_no, pa.reason, pa.status,
            pa.extended_by_appeal, pa.blocked_reappeal, pa.admin_note,
            pa.handled_by, handler.nickname AS handled_by_nickname,
            pa.handled_at, pa.created_at, pa.updated_at
         FROM post_appeals pa
         LEFT JOIN users handler ON pa.handled_by = handler.id
         WHERE pa.post_id = ?
         ORDER BY pa.attempt_no ASC, pa.id ASC`,
        [postId]
    );

    const decisionMap = new Map();
    for (const r of reports) {
        if (r.status === 'PENDING') continue;
        const handledAtKey = r.handled_at ? new Date(r.handled_at).toISOString().slice(0, 19) : '';
        const key = `${r.status}::${r.handled_by || ''}::${r.handled_note || ''}::${handledAtKey}`;
        if (!decisionMap.has(key)) {
            decisionMap.set(key, {
                status: r.status,
                handled_by: r.handled_by || null,
                handled_by_nickname: r.handled_by_nickname || null,
                handled_note: r.handled_note || null,
                handled_at: r.handled_at || null,
                report_count: 1
            });
        } else {
            decisionMap.get(key).report_count += 1;
        }
    }

    const decisionHistory = [...decisionMap.values()].sort((a, b) => {
        const aTime = a.handled_at ? new Date(a.handled_at).getTime() : 0;
        const bTime = b.handled_at ? new Date(b.handled_at).getTime() : 0;
        return bTime - aTime;
    });

    return { post, reports, appeals, decisionHistory };
};

export const updateAppealAdminNote = async (appealId, adminNote, adminUser, ipAddress = null) => {
    const [rows] = await db.query(
        `SELECT id, post_id, attempt_no, status, admin_note FROM post_appeals WHERE id = ? LIMIT 1`,
        [appealId]
    );
    const appeal = rows[0];
    if (!appeal) {
        const err = new Error('이의 제기 내역을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    if (appeal.status === 'PENDING') {
        const err = new Error('심사가 완료된 이의 제기의 답변만 수정할 수 있습니다.');
        err.status = 400;
        throw err;
    }

    const trimmedNote = String(adminNote || '').trim();
    if (appeal.status === 'REJECTED' && !trimmedNote) {
        const err = new Error('반려 답변 내용은 비워둘 수 없습니다.');
        err.status = 400;
        throw err;
    }
    if (trimmedNote.length > 2000) {
        const err = new Error('답변은 2000자 이내로 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const nextNote = trimmedNote || null;
    await db.query(
        `UPDATE post_appeals SET admin_note = ?, updated_at = NOW() WHERE id = ?`,
        [nextNote, appealId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POST_APPEAL_NOTE_UPDATE',
        targetType: 'POST',
        targetId: appeal.post_id,
        summary: `게시글 #${appeal.post_id} ${appeal.attempt_no}차 이의 제기 답변 수정`,
        detail: {
            appealId,
            postId: appeal.post_id,
            attemptNo: appeal.attempt_no,
            status: appeal.status,
            previousNote: appeal.admin_note,
            nextNote
        },
        ipAddress
    });

    return {
        success: true,
        appealId: Number(appealId),
        postId: appeal.post_id,
        status: appeal.status,
        admin_note: nextNote
    };
};

export const handlePostReports = async (postId, decision, decisionReason, adminUser, ipAddress = null) => {
    const upperDecision = String(decision || '').toUpperCase();
    if (!['APPROVE', 'REJECT'].includes(upperDecision)) {
        const err = new Error('올바른 처리 결정(APPROVE 또는 REJECT)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const trimmedReason = String(decisionReason || '').trim();
    if (!trimmedReason) {
        const err = new Error('결정 사유를 입력해주세요.');
        err.status = 400;
        throw err;
    }
    const safeDecisionReason = trimmedReason.slice(0, 2000);

    const [pendingReports] = await db.query(
        `SELECT id, reporter_user_id, reason, detail, created_at
         FROM reports
         WHERE target_type = 'POST' AND target_id = ? AND status = 'PENDING'
         ORDER BY created_at DESC, id DESC`,
        [postId]
    );

    if (pendingReports.length === 0) {
        const err = new Error('처리 대기 중인 신고가 없습니다.');
        err.status = 400;
        throw err;
    }

    const reportIds = pendingReports.map((r) => r.id);
    const nextStatus = upperDecision === 'APPROVE' ? 'RESOLVED' : 'DISMISSED';

    await db.query(
        `UPDATE reports
         SET status = ?,
             handled_by = ?,
             handled_note = ?,
             handled_at = NOW()
         WHERE target_type = 'POST' AND target_id = ? AND status = 'PENDING'`,
        [nextStatus, adminUser.id, safeDecisionReason, postId]
    );

    if (upperDecision === 'APPROVE') {
        const uniqueReasons = [...new Set(pendingReports.map((r) => String(r.reason || '').trim()).filter(Boolean))];
        const combinedReason = (uniqueReasons.join(', ') || '신고 승인 삭제').slice(0, 255);

        const [postRows] = await db.query(
            `SELECT id, user_id, status FROM posts WHERE id = ? LIMIT 1`,
            [postId]
        );
        const targetPost = postRows[0];
        if (targetPost && targetPost.status !== 'DELETED') {
            await db.query(
                `UPDATE posts
                 SET status = 'DELETED',
                     deleted_at = NOW(),
                     delete_type = 'ADMIN_REPORT',
                     delete_reason = ?,
                     deleted_by = ?,
                     purge_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
                     admin_extended_days = 0,
                     appeal_blocked = 0,
                     updated_at = NOW()
                 WHERE id = ?`,
                [combinedReason, adminUser.id, postId]
            );

            await db.query(
                `UPDATE users SET report_count = report_count + 1 WHERE id = ?`,
                [targetPost.user_id]
            );
        }
    }

    await logAdminAction({
        adminUserId: adminUser.id,
        action: upperDecision === 'APPROVE' ? 'POST_REPORTS_APPROVE' : 'POST_REPORTS_REJECT',
        targetType: 'POST',
        targetId: String(postId),
        summary: `게시글 #${postId} 신고 ${pendingReports.length}건 일괄 ${upperDecision === 'APPROVE' ? '승인(삭제)' : '반려'}`,
        detail: {
            decision: upperDecision,
            reportIds,
            reportCount: pendingReports.length,
            decisionReason: safeDecisionReason
        },
        ipAddress
    });

    return {
        success: true,
        postId,
        decision: upperDecision,
        status: nextStatus,
        handledCount: pendingReports.length,
        handled_note: safeDecisionReason
    };
};

export const getAdminPosts = async ({
    boardId = 'ALL',
    status = 'ALL',
    curationGrade = 'ALL',
    q = '',
    sort = 'latest',
    page = 1,
    limit = 20
} = {}) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const [[kpiRow]] = await db.query(
        `SELECT
            COUNT(*) AS totalPosts,
            SUM(CASE WHEN p.curation_grade = 'MAIN_LOOKBOOK' THEN 1 ELSE 0 END) AS mainLookbookCount,
            SUM(CASE WHEN p.curation_grade = 'LOOKBOOK_CANDIDATE' THEN 1 ELSE 0 END) AS candidateCount,
            SUM(CASE WHEN p.status = 'HIDDEN' THEN 1 ELSE 0 END) AS hiddenCount,
            SUM(CASE WHEN p.status = 'DELETED' THEN 1 ELSE 0 END) AS deletedCount,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM post_images pi WHERE pi.post_id = p.id AND pi.is_sensitive = 1) THEN 1 ELSE 0 END) AS sensitivePostCount,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM reports r WHERE r.target_type = 'POST' AND r.target_id = p.id) THEN 1 ELSE 0 END) AS reportedPostCount
         FROM posts p
         WHERE p.status != 'DRAFT'`
    );

    const kpi = {
        totalPosts: Number(kpiRow?.totalPosts || 0),
        mainLookbookCount: Number(kpiRow?.mainLookbookCount || 0),
        candidateCount: Number(kpiRow?.candidateCount || 0),
        hiddenCount: Number(kpiRow?.hiddenCount || 0),
        deletedCount: Number(kpiRow?.deletedCount || 0),
        sensitivePostCount: Number(kpiRow?.sensitivePostCount || 0),
        reportedPostCount: Number(kpiRow?.reportedPostCount || 0)
    };

    const [boards] = await db.query(`SELECT id, name FROM boards ORDER BY id ASC`);

    const fetchCurated = async (grade) => {
        const [rows] = await db.query(
            `SELECT
                p.id, p.title, p.board_id, b.name AS board_name,
                p.curation_grade, p.curation_target_species, p.promoted_at, p.view_count, p.like_count, p.comment_count,
                p.user_id AS author_id, u.nickname AS author_nickname, u.role AS author_role, u.profile_image_url AS author_avatar,
                (SELECT pi.image_url FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS thumbnail_url,
                COALESCE((SELECT pi.is_sensitive FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC, pi.id ASC LIMIT 1), 0) AS thumbnail_is_sensitive
             FROM posts p
             LEFT JOIN boards b ON p.board_id = b.id
             LEFT JOIN users u ON p.user_id = u.id
             WHERE p.status = 'PUBLISHED' AND p.curation_grade = ?
             ORDER BY COALESCE(p.promoted_at, p.updated_at) DESC, p.created_at DESC
             LIMIT 12`,
            [grade]
        );
        return rows.map((r) => ({
            ...r,
            view_count: Number(r.view_count || 0),
            like_count: Number(r.like_count || 0),
            comment_count: Number(r.comment_count || 0),
            thumbnail_is_sensitive: Boolean(Number(r.thumbnail_is_sensitive || 0))
        }));
    };

    const [mainLookbook, candidates] = await Promise.all([
        fetchCurated('MAIN_LOOKBOOK'),
        fetchCurated('LOOKBOOK_CANDIDATE')
    ]);

    const whereClauses = ["p.status != 'DRAFT'"];
    const whereParams = [];

    if (boardId && String(boardId).toUpperCase() !== 'ALL') {
        whereClauses.push('p.board_id = ?');
        whereParams.push(boardId);
    }

    const upperStatus = String(status || 'ALL').toUpperCase();
    if (['PUBLISHED', 'HIDDEN', 'DELETED'].includes(upperStatus)) {
        whereClauses.push('p.status = ?');
        whereParams.push(upperStatus);
    }

    const upperGrade = String(curationGrade || 'ALL').toUpperCase();
    if (['MAIN_LOOKBOOK', 'LOOKBOOK_CANDIDATE', 'NORMAL_FEED'].includes(upperGrade)) {
        whereClauses.push('p.curation_grade = ?');
        whereParams.push(upperGrade);
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push('(p.title LIKE ? OR p.content LIKE ? OR u.nickname LIKE ? OR u.email LIKE ? OR p.id LIKE ?)');
        whereParams.push(like, like, like, like, like);
    }

    const whereSql = whereClauses.join(' AND ');

    const [[countRow]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM posts p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE ${whereSql}`,
        whereParams
    );
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    let orderSql = 'p.created_at DESC, p.id DESC';
    if (sort === 'popular') {
        orderSql = '(p.like_count + p.comment_count) DESC, p.created_at DESC';
    } else if (sort === 'views') {
        orderSql = 'p.view_count DESC, p.created_at DESC';
    } else if (sort === 'reports') {
        orderSql = 'pending_report_count DESC, report_count DESC, p.created_at DESC';
    }

    const [postRows] = await db.query(
        `SELECT
            p.id, p.board_id, b.name AS board_name, p.title, p.status,
            p.curation_grade, p.curation_target_species, p.promoted_at, p.is_vet_verified,
            p.view_count, p.like_count, p.bookmark_count, p.comment_count,
            p.deleted_at, p.delete_type, p.delete_reason, p.purge_scheduled_at,
            p.admin_extended_days, p.created_at,
            p.user_id AS author_id, u.nickname AS author_nickname, u.email AS author_email,
            u.role AS author_role, u.profile_image_url AS author_avatar,
            (SELECT pi.image_url FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS thumbnail_url,
            (SELECT COUNT(*) FROM post_images pi WHERE pi.post_id = p.id AND pi.is_sensitive = 1) AS sensitive_image_count,
            (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'POST' AND r.target_id = p.id) AS report_count,
            (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'POST' AND r.target_id = p.id AND r.status = 'PENDING') AS pending_report_count,
            (SELECT COUNT(*) FROM post_appeals pa WHERE pa.post_id = p.id) AS appeal_count,
            (SELECT COUNT(*) FROM post_appeals pa WHERE pa.post_id = p.id AND pa.status = 'PENDING') AS pending_appeal_count
         FROM posts p
         LEFT JOIN boards b ON p.board_id = b.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE ${whereSql}
         ORDER BY ${orderSql}
         LIMIT ? OFFSET ?`,
        [...whereParams, safeLimit, offset]
    );

    const allMainIds = mainLookbook.map((p) => p.id);
    const allCandidateIds = candidates.map((p) => p.id);
    const allPostIds = postRows.map((p) => p.id);
    const autoSpeciesMap = await getAutoSpeciesByPostIds([...allMainIds, ...allCandidateIds, ...allPostIds]);

    const attachSpeciesFields = (item) => {
        const curationTarget = parseCurationTargetSpecies(item.curation_target_species);
        const autoDetected = autoSpeciesMap.get(item.id) || [];
        return {
            ...item,
            curation_target_species: curationTarget,
            auto_detected_species: autoDetected,
            effective_target_species: curationTarget !== null ? curationTarget : autoDetected
        };
    };

    const enrichedMainLookbook = mainLookbook.map(attachSpeciesFields);
    const enrichedCandidates = candidates.map(attachSpeciesFields);
    const posts = postRows.map((p) => {
        const sensitiveCount = Number(p.sensitive_image_count || 0);
        return attachSpeciesFields({
            ...p,
            view_count: Number(p.view_count || 0),
            like_count: Number(p.like_count || 0),
            bookmark_count: Number(p.bookmark_count || 0),
            comment_count: Number(p.comment_count || 0),
            admin_extended_days: Number(p.admin_extended_days || 0),
            is_vet_verified: Boolean(Number(p.is_vet_verified || 0)),
            sensitive_image_count: sensitiveCount,
            has_sensitive_image: sensitiveCount > 0,
            report_count: Number(p.report_count || 0),
            pending_report_count: Number(p.pending_report_count || 0),
            appeal_count: Number(p.appeal_count || 0),
            pending_appeal_count: Number(p.pending_appeal_count || 0)
        });
    });

    // 전체 PUBLISHED MAIN_LOOKBOOK 기준 speciesCounts 집계
    const [allMainRows] = await db.query(
        `SELECT id, curation_target_species FROM posts WHERE status = 'PUBLISHED' AND curation_grade = 'MAIN_LOOKBOOK'`
    );
    const allMainAutoMap = await getAutoSpeciesByPostIds(allMainRows.map((r) => r.id));
    const speciesCounts = {
        DOG: 0,
        CAT: 0,
        RABBIT: 0,
        HAMSTER: 0,
        GUINEAPIG: 0,
        CHINCHILA: 0,
        ALL: 0
    };
    for (const r of allMainRows) {
        const target = parseCurationTargetSpecies(r.curation_target_species);
        const effective = target !== null ? target : (allMainAutoMap.get(r.id) || []);
        for (const sp of effective) {
            if (speciesCounts[sp] !== undefined) {
                speciesCounts[sp] += 1;
            }
        }
    }

    return {
        kpi,
        boards,
        curatedBoard: {
            mainLookbook: enrichedMainLookbook,
            candidates: enrichedCandidates,
            speciesCounts
        },
        posts,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        }
    };
};

export const getAdminPostDetail = async (postId) => {
    const [postRows] = await db.query(
        `SELECT
            p.*, b.name AS board_name,
            u.nickname AS author_nickname, u.email AS author_email,
            u.role AS author_role, u.profile_image_url AS author_avatar,
            (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'POST' AND r.target_id = p.id) AS report_count,
            (SELECT COUNT(*) FROM reports r WHERE r.target_type = 'POST' AND r.target_id = p.id AND r.status = 'PENDING') AS pending_report_count,
            (SELECT COUNT(*) FROM post_appeals pa WHERE pa.post_id = p.id) AS appeal_count,
            (SELECT COUNT(*) FROM post_appeals pa WHERE pa.post_id = p.id AND pa.status = 'PENDING') AS pending_appeal_count
         FROM posts p
         LEFT JOIN boards b ON p.board_id = b.id
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?
         LIMIT 1`,
        [postId]
    );
    if (!postRows[0]) {
        const err = new Error('POST_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const [imageRows] = await db.query(
        `SELECT id, post_id, image_url, is_thumbnail, is_ai_generated, is_sensitive, sort_order
         FROM post_images
         WHERE post_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [postId]
    );
    const images = imageRows.map((img) => ({
        ...img,
        is_thumbnail: Boolean(Number(img.is_thumbnail || 0)),
        is_ai_generated: Boolean(Number(img.is_ai_generated || 0)),
        is_sensitive: Boolean(Number(img.is_sensitive || 0))
    }));

    const [tagRows] = await db.query(
        `SELECT tag_name FROM post_tags WHERE post_id = ?`,
        [postId]
    );
    const tags = tagRows.map((t) => t.tag_name).filter(Boolean);

    const autoSpeciesMap = await getAutoSpeciesByPostIds([postId]);
    const curationTarget = parseCurationTargetSpecies(postRows[0].curation_target_species);
    const autoDetected = autoSpeciesMap.get(postId) || [];

    return {
        post: {
            ...postRows[0],
            curation_target_species: curationTarget,
            auto_detected_species: autoDetected,
            effective_target_species: curationTarget !== null ? curationTarget : autoDetected,
            report_count: Number(postRows[0].report_count || 0),
            pending_report_count: Number(postRows[0].pending_report_count || 0),
            appeal_count: Number(postRows[0].appeal_count || 0),
            pending_appeal_count: Number(postRows[0].pending_appeal_count || 0)
        },
        images,
        tags
    };
};

export const updateAdminPostStatus = async (postId, status, reason = '', adminUser, ipAddress = null) => {
    const upperStatus = String(status || '').toUpperCase();
    if (!['PUBLISHED', 'HIDDEN', 'DELETED'].includes(upperStatus)) {
        const err = new Error('올바른 게시글 상태(PUBLISHED, HIDDEN, DELETED)를 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const [rows] = await db.query(`SELECT id, title, status FROM posts WHERE id = ? LIMIT 1`, [postId]);
    if (!rows[0]) {
        const err = new Error('POST_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const safeReason = reason ? String(reason).trim().slice(0, 255) : '관리자 삭제';

    if (upperStatus === 'HIDDEN') {
        await db.query(`UPDATE posts SET status = 'HIDDEN', updated_at = NOW() WHERE id = ?`, [postId]);
    } else if (upperStatus === 'PUBLISHED') {
        await db.query(
            `UPDATE posts
             SET status = 'PUBLISHED',
                 deleted_at = NULL,
                 delete_type = NULL,
                 delete_reason = NULL,
                 deleted_by = NULL,
                 purge_scheduled_at = NULL,
                 admin_extended_days = 0,
                 appeal_blocked = 0,
                 updated_at = NOW()
             WHERE id = ?`,
            [postId]
        );
    } else {
        await db.query(
            `UPDATE posts
             SET status = 'DELETED',
                 deleted_at = NOW(),
                 delete_type = 'ADMIN',
                 delete_reason = ?,
                 deleted_by = ?,
                 purge_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
                 admin_extended_days = 0,
                 appeal_blocked = 0,
                 updated_at = NOW()
             WHERE id = ?`,
            [safeReason, adminUser.id, postId]
        );
    }

    const [[updated]] = await db.query(`SELECT purge_scheduled_at FROM posts WHERE id = ? LIMIT 1`, [postId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POST_STATUS_CHANGE',
        targetType: 'POST',
        targetId: postId,
        summary: `게시글 '${rows[0].title}' 상태 변경 (${rows[0].status} → ${upperStatus})`,
        detail: { previousStatus: rows[0].status, nextStatus: upperStatus, reason: reason || null },
        ipAddress
    });

    return {
        postId,
        status: upperStatus,
        purge_scheduled_at: updated?.purge_scheduled_at || null
    };
};

export const togglePostImageSensitive = async (imageId, isSensitive, adminUser, ipAddress = null) => {
    const [rows] = await db.query(`SELECT id, post_id FROM post_images WHERE id = ? LIMIT 1`, [imageId]);
    if (!rows[0]) {
        const err = new Error('IMAGE_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const nextVal = isSensitive ? 1 : 0;
    await db.query(`UPDATE post_images SET is_sensitive = ? WHERE id = ?`, [nextVal, imageId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'POST_IMAGE_SENSITIVE_TOGGLE',
        targetType: 'POST',
        targetId: rows[0].post_id,
        summary: `게시글 #${rows[0].post_id} 이미지 #${imageId} 민감 표시 ${nextVal ? '설정' : '해제'}`,
        detail: { imageId: Number(imageId), is_sensitive: Boolean(nextVal) },
        ipAddress
    });

    return {
        imageId: Number(imageId),
        postId: rows[0].post_id,
        is_sensitive: Boolean(nextVal)
    };
};

export const getAdminComments = async ({
    status = 'ALL',
    attr = 'ALL',
    q = '',
    page = 1,
    limit = 20
} = {}) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const [[kpiRow]] = await db.query(
        `SELECT
            COUNT(*) AS totalComments,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeCount,
            SUM(CASE WHEN status = 'HIDDEN' THEN 1 ELSE 0 END) AS hiddenCount,
            SUM(CASE WHEN status = 'DELETED' THEN 1 ELSE 0 END) AS deletedCount
         FROM comments`
    );
    const kpi = {
        totalComments: Number(kpiRow?.totalComments || 0),
        activeCount: Number(kpiRow?.activeCount || 0),
        hiddenCount: Number(kpiRow?.hiddenCount || 0),
        deletedCount: Number(kpiRow?.deletedCount || 0)
    };

    const whereClauses = ['1=1'];
    const whereParams = [];

    const upperStatus = String(status || 'ALL').toUpperCase();
    if (['ACTIVE', 'HIDDEN', 'DELETED'].includes(upperStatus)) {
        whereClauses.push('c.status = ?');
        whereParams.push(upperStatus);
    }

    const upperAttr = String(attr || 'ALL').toUpperCase();
    if (upperAttr === 'ACCEPTED') {
        whereClauses.push('c.is_accepted = 1');
    } else if (upperAttr === 'PINNED') {
        whereClauses.push('c.is_pinned = 1');
    } else if (upperAttr === 'REPLY') {
        whereClauses.push('c.parent_id IS NOT NULL');
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push('(c.content LIKE ? OR u.nickname LIKE ? OR u.email LIKE ? OR p.title LIKE ?)');
        whereParams.push(like, like, like, like);
    }

    const whereSql = whereClauses.join(' AND ');

    const [[countRow]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM comments c
         LEFT JOIN posts p ON c.post_id = p.id
         LEFT JOIN users u ON c.user_id = u.id
         WHERE ${whereSql}`,
        whereParams
    );
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const [rows] = await db.query(
        `SELECT
            c.id, c.post_id, p.title AS post_title, p.board_id AS post_board_id, b.name AS board_name,
            c.parent_id, c.content, c.is_anonymous, c.is_accepted, c.is_pinned,
            c.like_count, c.status, c.created_at,
            c.user_id, u.nickname AS author_nickname, u.email AS author_email,
            u.role AS author_role, u.profile_image_url AS author_avatar
         FROM comments c
         LEFT JOIN posts p ON c.post_id = p.id
         LEFT JOIN boards b ON p.board_id = b.id
         LEFT JOIN users u ON c.user_id = u.id
         WHERE ${whereSql}
         ORDER BY c.created_at DESC, c.id DESC
         LIMIT ? OFFSET ?`,
        [...whereParams, safeLimit, offset]
    );

    const comments = rows.map((c) => ({
        ...c,
        is_accepted: Boolean(Number(c.is_accepted || 0)),
        is_pinned: Boolean(Number(c.is_pinned || 0)),
        like_count: Number(c.like_count || 0)
    }));

    return {
        kpi,
        comments,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        }
    };
};

export const updateAdminCommentStatus = async (commentId, status, reason = '', adminUser, ipAddress = null) => {
    const upperStatus = String(status || '').toUpperCase();
    if (!['ACTIVE', 'HIDDEN', 'DELETED'].includes(upperStatus)) {
        const err = new Error('올바른 댓글 상태(ACTIVE, HIDDEN, DELETED)를 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const [rows] = await db.query(`SELECT id, post_id, status FROM comments WHERE id = ? LIMIT 1`, [commentId]);
    if (!rows[0]) {
        const err = new Error('COMMENT_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    await db.query(`UPDATE comments SET status = ?, updated_at = NOW() WHERE id = ?`, [upperStatus, commentId]);
    await db.query(
        `UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE post_id = ? AND status = 'ACTIVE') WHERE id = ?`,
        [rows[0].post_id, rows[0].post_id]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'COMMENT_STATUS_CHANGE',
        targetType: 'COMMENT',
        targetId: String(commentId),
        summary: `댓글 #${commentId} 상태 변경 (${rows[0].status} → ${upperStatus})`,
        detail: { postId: rows[0].post_id, previousStatus: rows[0].status, nextStatus: upperStatus, reason: reason || null },
        ipAddress
    });

    return {
        commentId,
        postId: rows[0].post_id,
        status: upperStatus
    };
};

const HISTORY_CATEGORIES = ['CHECKUP', 'SURGERY', 'VACCINE', 'WEIGHT', 'EVENT', 'OTHER'];

const fetchPetsForHistoryIds = async (historyIds = []) => {
    const map = new Map();
    const uniqueIds = [...new Set((historyIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return map;

    const placeholders = uniqueIds.map(() => '?').join(', ');
    const [rows] = await db.query(
        `SELECT src.history_id, pt.id, pt.name, pt.species, pt.custom_species, pt.breed, pt.current_avatar_url
         FROM (
             SELECT history_id, pet_id FROM pet_history_pets WHERE history_id IN (${placeholders})
             UNION
             SELECT id AS history_id, pet_id FROM pet_histories WHERE id IN (${placeholders}) AND pet_id IS NOT NULL
         ) AS src
         JOIN pets pt ON src.pet_id = pt.id`,
        [...uniqueIds, ...uniqueIds]
    );

    for (const r of rows) {
        if (!map.has(r.history_id)) map.set(r.history_id, []);
        const list = map.get(r.history_id);
        if (!list.some((p) => p.id === r.id)) {
            list.push({
                id: r.id,
                name: r.name,
                species: r.species,
                custom_species: r.custom_species,
                breed: r.breed,
                current_avatar_url: r.current_avatar_url
            });
        }
    }
    return map;
};

export const getAdminHistories = async ({
    source = 'ALL',
    category = 'ALL',
    visibility = 'ALL',
    q = '',
    page = 1,
    limit = 20
} = {}) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const [[historyKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalHistories,
            SUM(CASE WHEN is_ai_generated = 1 THEN 1 ELSE 0 END) AS aiCount,
            SUM(CASE WHEN is_ai_generated = 0 THEN 1 ELSE 0 END) AS manualCount,
            SUM(CASE WHEN is_private = 1 THEN 1 ELSE 0 END) AS privateHistoryCount
         FROM pet_histories`
    );

    const [[journeyKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalJourneys,
            SUM(CASE WHEN share_scope = 'PUBLIC' THEN 1 ELSE 0 END) AS publicJourneys,
            SUM(CASE WHEN share_scope = 'LINK_ONLY' THEN 1 ELSE 0 END) AS linkOnlyJourneys,
            SUM(CASE WHEN share_scope = 'PRIVATE' THEN 1 ELSE 0 END) AS privateJourneys,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeJourneys,
            SUM(CASE WHEN status != 'ACTIVE' THEN 1 ELSE 0 END) AS completedJourneys
         FROM pet_journeys`
    );

    const [[userKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalActiveUsers,
            SUM(CASE WHEN auto_journal_enabled = 1 THEN 1 ELSE 0 END) AS autoJournalEnabledUsers
         FROM users
         WHERE status = 'ACTIVE'`
    );

    const totalHistories = Number(historyKpi?.totalHistories || 0);
    const aiCount = Number(historyKpi?.aiCount || 0);
    const manualCount = Number(historyKpi?.manualCount || 0);
    const totalActiveUsers = Number(userKpi?.totalActiveUsers || 0);
    const autoJournalEnabledUsers = Number(userKpi?.autoJournalEnabledUsers || 0);

    const kpi = {
        totalHistories,
        aiCount,
        manualCount,
        aiRatioPct: totalHistories > 0 ? Math.round((aiCount / totalHistories) * 1000) / 10 : 0,
        privateHistoryCount: Number(historyKpi?.privateHistoryCount || 0),
        totalJourneys: Number(journeyKpi?.totalJourneys || 0),
        publicJourneys: Number(journeyKpi?.publicJourneys || 0),
        linkOnlyJourneys: Number(journeyKpi?.linkOnlyJourneys || 0),
        privateJourneys: Number(journeyKpi?.privateJourneys || 0),
        activeJourneys: Number(journeyKpi?.activeJourneys || 0),
        completedJourneys: Number(journeyKpi?.completedJourneys || 0),
        autoJournalEnabledUsers,
        totalActiveUsers,
        autoJournalRatioPct: totalActiveUsers > 0 ? Math.round((autoJournalEnabledUsers / totalActiveUsers) * 1000) / 10 : 0
    };

    const [catRows] = await db.query(
        `SELECT category, COUNT(*) AS cnt FROM pet_histories GROUP BY category`
    );
    const catMap = new Map(catRows.map((r) => [String(r.category || '').toUpperCase(), Number(r.cnt || 0)]));
    const categoryDistribution = HISTORY_CATEGORIES.map((cat) => {
        const count = catMap.get(cat) || 0;
        return {
            category: cat,
            count,
            pct: totalHistories > 0 ? Math.round((count / totalHistories) * 1000) / 10 : 0
        };
    }).sort((a, b) => b.count - a.count);

    const whereClauses = ['1=1'];
    const whereParams = [];

    const upperSource = String(source || 'ALL').toUpperCase();
    if (upperSource === 'AI') {
        whereClauses.push('ph.is_ai_generated = 1');
    } else if (upperSource === 'MANUAL') {
        whereClauses.push('ph.is_ai_generated = 0');
    }

    const upperCategory = String(category || 'ALL').toUpperCase();
    if (upperCategory !== 'ALL' && HISTORY_CATEGORIES.includes(upperCategory)) {
        whereClauses.push('ph.category = ?');
        whereParams.push(upperCategory);
    }

    const upperVisibility = String(visibility || 'ALL').toUpperCase();
    if (upperVisibility === 'PUBLIC') {
        whereClauses.push('ph.is_private = 0');
    } else if (upperVisibility === 'PRIVATE') {
        whereClauses.push('ph.is_private = 1');
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push(`(
            ph.title LIKE ?
            OR ph.description LIKE ?
            OR ph.hospital_name LIKE ?
            OR u.nickname LIKE ?
            OR u.email LIKE ?
            OR pj.title LIKE ?
            OR EXISTS (
                SELECT 1 FROM pet_history_pets phpets
                JOIN pets pt ON phpets.pet_id = pt.id
                WHERE phpets.history_id = ph.id AND pt.name LIKE ?
            )
            OR EXISTS (
                SELECT 1 FROM pets pt2
                WHERE pt2.id = ph.pet_id AND pt2.name LIKE ?
            )
        )`);
        whereParams.push(like, like, like, like, like, like, like, like);
    }

    const whereSql = whereClauses.join(' AND ');

    const [[countRow]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM pet_histories ph
         LEFT JOIN users u ON ph.user_id = u.id
         LEFT JOIN pet_journeys pj ON ph.journey_id = pj.id
         WHERE ${whereSql}`,
        whereParams
    );
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const [rows] = await db.query(
        `SELECT
            ph.id,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS event_date,
            ph.category, ph.title, ph.description, ph.hospital_name, ph.weight_kg,
            ph.is_ai_generated, ph.is_private, ph.private_reason, ph.private_at,
            ph.created_at, ph.updated_at,
            ph.journey_id, pj.title AS journey_title, pj.note_code AS journey_note_code,
            pj.share_scope AS journey_share_scope, pj.status AS journey_status,
            ph.user_id AS author_id, u.nickname AS author_nickname, u.email AS author_email,
            u.role AS author_role, u.profile_image_url AS author_avatar,
            (SELECT COUNT(*) FROM pet_history_posts php WHERE php.history_id = ph.id) AS post_count
         FROM pet_histories ph
         LEFT JOIN users u ON ph.user_id = u.id
         LEFT JOIN pet_journeys pj ON ph.journey_id = pj.id
         WHERE ${whereSql}
         ORDER BY ph.event_date DESC, ph.id DESC
         LIMIT ? OFFSET ?`,
        [...whereParams, safeLimit, offset]
    );

    const petsMap = await fetchPetsForHistoryIds(rows.map((r) => r.id));

    const histories = rows.map((r) => ({
        id: r.id,
        event_date: r.event_date,
        category: r.category,
        title: r.title,
        description: r.description,
        hospital_name: r.hospital_name,
        weight_kg: r.weight_kg !== null ? Number(r.weight_kg) : null,
        is_ai_generated: Boolean(Number(r.is_ai_generated || 0)),
        is_private: Boolean(Number(r.is_private || 0)),
        private_reason: r.private_reason || null,
        private_at: r.private_at || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        journey_id: r.journey_id ? Number(r.journey_id) : null,
        journey_title: r.journey_title || null,
        journey_note_code: r.journey_note_code || null,
        journey_share_scope: r.journey_share_scope || null,
        journey_status: r.journey_status || null,
        author_id: r.author_id,
        author_nickname: r.author_nickname,
        author_email: r.author_email,
        author_role: r.author_role,
        author_avatar: r.author_avatar,
        pets: petsMap.get(r.id) || [],
        post_count: Number(r.post_count || 0)
    }));

    return {
        kpi,
        categoryDistribution,
        histories,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        }
    };
};

export const getAdminHistoryDetail = async (historyId) => {
    const [rows] = await db.query(
        `SELECT
            ph.id,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS event_date,
            ph.category, ph.title, ph.description, ph.hospital_name, ph.weight_kg,
            ph.is_ai_generated, ph.is_private, ph.private_reason, ph.private_at, ph.private_by,
            pb.nickname AS private_by_nickname,
            ph.created_at, ph.updated_at,
            ph.user_id, u.nickname AS author_nickname, u.email AS author_email,
            u.role AS author_role, u.profile_image_url AS author_profile_image_url,
            ph.journey_id, pj.note_code AS journey_note_code, pj.title AS journey_title,
            pj.category AS journey_category, pj.status AS journey_status, pj.share_scope AS journey_share_scope,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS journey_start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS journey_end_date,
            pj.is_ongoing AS journey_is_ongoing
         FROM pet_histories ph
         LEFT JOIN users u ON ph.user_id = u.id
         LEFT JOIN users pb ON ph.private_by = pb.id
         LEFT JOIN pet_journeys pj ON ph.journey_id = pj.id
         WHERE ph.id = ?
         LIMIT 1`,
        [historyId]
    );
    const r = rows[0];
    if (!r) {
        const err = new Error('HISTORY_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const petsMap = await fetchPetsForHistoryIds([r.id]);
    const [postRows] = await db.query(
        `SELECT
            p.id, p.title, p.status,
            (SELECT pi.image_url FROM post_images pi WHERE pi.post_id = p.id ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS thumbnail_url
         FROM pet_history_posts php
         JOIN posts p ON php.post_id = p.id
         WHERE php.history_id = ?`,
        [r.id]
    );

    return {
        history: {
            id: r.id,
            event_date: r.event_date,
            category: r.category,
            title: r.title,
            description: r.description,
            hospital_name: r.hospital_name,
            weight_kg: r.weight_kg !== null ? Number(r.weight_kg) : null,
            is_ai_generated: Boolean(Number(r.is_ai_generated || 0)),
            is_private: Boolean(Number(r.is_private || 0)),
            private_reason: r.private_reason || null,
            private_at: r.private_at || null,
            private_by: r.private_by || null,
            private_by_nickname: r.private_by_nickname || null,
            created_at: r.created_at,
            updated_at: r.updated_at,
            author: {
                id: r.user_id,
                nickname: r.author_nickname,
                email: r.author_email,
                role: r.author_role,
                profile_image_url: r.author_profile_image_url
            },
            pets: petsMap.get(r.id) || [],
            journey: r.journey_id ? {
                id: Number(r.journey_id),
                note_code: r.journey_note_code,
                title: r.journey_title,
                category: r.journey_category,
                status: r.journey_status,
                share_scope: r.journey_share_scope,
                start_date: r.journey_start_date,
                end_date: r.journey_end_date,
                is_ongoing: Boolean(Number(r.journey_is_ongoing || 0))
            } : null,
            posts: postRows
        }
    };
};

export const updateAdminHistoryVisibility = async (historyId, isPrivate, reason = '', adminUser, ipAddress = null) => {
    const [rows] = await db.query(`SELECT id, title, is_private FROM pet_histories WHERE id = ? LIMIT 1`, [historyId]);
    if (!rows[0]) {
        const err = new Error('HISTORY_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const nextPrivate = Boolean(isPrivate);
    if (nextPrivate) {
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) {
            const err = new Error('비공개 전환 사유를 입력해주세요.');
            err.status = 400;
            throw err;
        }
        const safeReason = trimmedReason.slice(0, 500);
        await db.query(
            `UPDATE pet_histories
             SET is_private = 1, private_reason = ?, private_at = NOW(), private_by = ?, updated_at = NOW()
             WHERE id = ?`,
            [safeReason, adminUser.id, historyId]
        );
    } else {
        await db.query(
            `UPDATE pet_histories
             SET is_private = 0, private_reason = NULL, private_at = NULL, private_by = NULL, updated_at = NOW()
             WHERE id = ?`,
            [historyId]
        );
    }

    const [[updated]] = await db.query(
        `SELECT private_reason, private_at FROM pet_histories WHERE id = ? LIMIT 1`,
        [historyId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'HISTORY_VISIBILITY_CHANGE',
        targetType: 'HISTORY',
        targetId: String(historyId),
        summary: `건강 기록 '${rows[0].title}' ${nextPrivate ? '비공개 전환' : '공개 복원'}`,
        detail: { is_private: nextPrivate, reason: nextPrivate ? (updated?.private_reason || null) : null },
        ipAddress
    });

    return {
        success: true,
        historyId: Number(historyId),
        is_private: nextPrivate,
        private_reason: updated?.private_reason || null,
        private_at: updated?.private_at || null
    };
};

const fetchPetsForJourneyIds = async (journeyIds = []) => {
    const map = new Map();
    const uniqueIds = [...new Set((journeyIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return map;

    const placeholders = uniqueIds.map(() => '?').join(', ');
    const [rows] = await db.query(
        `SELECT src.journey_id, pt.id, pt.name, pt.species, pt.custom_species, pt.breed, pt.current_avatar_url
         FROM (
             SELECT journey_id, pet_id FROM pet_journey_pets WHERE journey_id IN (${placeholders})
             UNION
             SELECT id AS journey_id, pet_id FROM pet_journeys WHERE id IN (${placeholders}) AND pet_id IS NOT NULL
         ) AS src
         JOIN pets pt ON src.pet_id = pt.id`,
        [...uniqueIds, ...uniqueIds]
    );

    for (const r of rows) {
        if (!map.has(r.journey_id)) map.set(r.journey_id, []);
        const list = map.get(r.journey_id);
        if (!list.some((p) => p.id === r.id)) {
            list.push({
                id: r.id,
                name: r.name,
                species: r.species,
                custom_species: r.custom_species,
                breed: r.breed,
                current_avatar_url: r.current_avatar_url
            });
        }
    }
    return map;
};

export const getAdminNotebooks = async ({
    shareScope = 'ALL',
    status = 'ALL',
    category = 'ALL',
    q = '',
    page = 1,
    limit = 20
} = {}) => {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const whereClauses = ['1=1'];
    const whereParams = [];

    const upperScope = String(shareScope || 'ALL').trim().toUpperCase();
    if (['PUBLIC', 'LINK_ONLY', 'PRIVATE'].includes(upperScope)) {
        whereClauses.push('pj.share_scope = ?');
        whereParams.push(upperScope);
    }

    const upperStatus = String(status || 'ALL').trim().toUpperCase();
    if (['ACTIVE', 'CURED', 'COMPLETED'].includes(upperStatus)) {
        whereClauses.push('pj.status = ?');
        whereParams.push(upperStatus);
    }

    const trimmedCat = String(category || 'ALL').trim();
    if (trimmedCat && trimmedCat.toUpperCase() !== 'ALL') {
        whereClauses.push('pj.category = ?');
        whereParams.push(trimmedCat);
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push(`(
            pj.title LIKE ?
            OR pj.description LIKE ?
            OR pj.goal_summary LIKE ?
            OR u.nickname LIKE ?
            OR u.email LIKE ?
            OR EXISTS (
                SELECT 1 FROM pet_journey_pets pjp
                JOIN pets pt ON pjp.pet_id = pt.id
                WHERE pjp.journey_id = pj.id AND pt.name LIKE ?
            )
            OR EXISTS (
                SELECT 1 FROM pets pt2
                WHERE pt2.id = pj.pet_id AND pt2.name LIKE ?
            )
        )`);
        whereParams.push(like, like, like, like, like, like, like);
    }

    const whereSql = whereClauses.join(' AND ');

    const [[countRow]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM pet_journeys pj
         LEFT JOIN users u ON pj.user_id = u.id
         WHERE ${whereSql}`,
        whereParams
    );
    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const [rows] = await db.query(
        `SELECT
            pj.id, pj.note_code, pj.title, pj.description, pj.category, pj.status, pj.goal_summary,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS end_date,
            pj.is_ongoing, pj.share_slug, pj.share_scope,
            pj.private_reason, pj.private_at, pj.created_at, pj.updated_at,
            pj.user_id AS author_id, u.nickname AS author_nickname, u.email AS author_email,
            u.role AS author_role, u.profile_image_url AS author_avatar,
            (SELECT COUNT(*) FROM pet_histories ph WHERE ph.journey_id = pj.id) AS record_count,
            (SELECT COUNT(*) FROM pet_journey_scraps pjs WHERE pjs.journey_id = pj.id) AS scrap_count,
            (SELECT COUNT(*) FROM pet_journey_comments pjc WHERE pjc.journey_id = pj.id AND pjc.is_deleted = 0) AS comment_count
         FROM pet_journeys pj
         LEFT JOIN users u ON pj.user_id = u.id
         WHERE ${whereSql}
         ORDER BY pj.updated_at DESC, pj.id DESC
         LIMIT ? OFFSET ?`,
        [...whereParams, safeLimit, offset]
    );

    const petsMap = await fetchPetsForJourneyIds(rows.map((r) => r.id));

    const notebooks = rows.map((r) => ({
        id: r.id,
        note_code: r.note_code,
        title: r.title,
        description: r.description,
        category: r.category,
        status: r.status,
        goal_summary: r.goal_summary,
        start_date: r.start_date,
        end_date: r.end_date,
        is_ongoing: Boolean(Number(r.is_ongoing || 0)),
        share_slug: r.share_slug,
        share_scope: r.share_scope,
        private_reason: r.private_reason || null,
        private_at: r.private_at || null,
        created_at: r.created_at,
        updated_at: r.updated_at,
        author_id: r.author_id,
        author_nickname: r.author_nickname,
        author_email: r.author_email,
        author_role: r.author_role,
        author_avatar: r.author_avatar,
        record_count: Number(r.record_count || 0),
        scrap_count: Number(r.scrap_count || 0),
        comment_count: Number(r.comment_count || 0),
        pets: petsMap.get(r.id) || []
    }));

    return {
        notebooks,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        }
    };
};

export const getAdminNotebookDetail = async (journeyId) => {
    const [rows] = await db.query(
        `SELECT
            pj.id, pj.note_code, pj.pet_id, pj.title, pj.description, pj.category, pj.status, pj.goal_summary,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS end_date,
            pj.is_ongoing, pj.completed_at, pj.share_slug, pj.share_scope,
            pj.private_reason, pj.private_at, pj.private_by, pb.nickname AS private_by_nickname,
            pj.created_at, pj.updated_at,
            pj.user_id AS author_id, u.nickname AS author_nickname, u.email AS author_email,
            u.role AS author_role, u.profile_image_url AS author_avatar,
            (SELECT COUNT(*) FROM pet_journey_scraps pjs WHERE pjs.journey_id = pj.id) AS scrap_count,
            (SELECT COUNT(*) FROM pet_journey_comments pjc WHERE pjc.journey_id = pj.id AND pjc.is_deleted = 0) AS comment_count,
            (SELECT COUNT(*) FROM pet_histories ph WHERE ph.journey_id = pj.id) AS record_count
         FROM pet_journeys pj
         LEFT JOIN users u ON pj.user_id = u.id
         LEFT JOIN users pb ON pj.private_by = pb.id
         WHERE pj.id = ?
         LIMIT 1`,
        [journeyId]
    );
    const nb = rows[0];
    if (!nb) {
        const err = new Error('NOTEBOOK_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const [petRows] = await db.query(
        `SELECT DISTINCT pt.id, pt.name, pt.species, pt.custom_species, pt.breed, pt.current_avatar_url
         FROM (
             SELECT pet_id FROM pet_journey_pets WHERE journey_id = ?
             UNION
             SELECT pet_id FROM pet_journeys WHERE id = ? AND pet_id IS NOT NULL
         ) AS src
         JOIN pets pt ON src.pet_id = pt.id`,
        [nb.id, nb.id]
    );

    const [historyRows] = await db.query(
        `SELECT
            id,
            DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date,
            category, title, description, hospital_name, weight_kg,
            is_ai_generated, is_private, private_reason
         FROM pet_histories
         WHERE journey_id = ?
         ORDER BY event_date DESC, id DESC`,
        [nb.id]
    );

    const petsMap = await fetchPetsForHistoryIds(historyRows.map((h) => h.id));
    const histories = historyRows.map((h) => ({
        ...h,
        weight_kg: h.weight_kg !== null ? Number(h.weight_kg) : null,
        is_ai_generated: Boolean(Number(h.is_ai_generated || 0)),
        is_private: Boolean(Number(h.is_private || 0)),
        pets: petsMap.get(h.id) || []
    }));

    return {
        notebook: {
            id: nb.id,
            note_code: nb.note_code,
            title: nb.title,
            description: nb.description,
            category: nb.category,
            status: nb.status,
            goal_summary: nb.goal_summary,
            start_date: nb.start_date,
            end_date: nb.end_date,
            is_ongoing: Boolean(Number(nb.is_ongoing || 0)),
            completed_at: nb.completed_at,
            share_slug: nb.share_slug,
            share_scope: nb.share_scope,
            private_reason: nb.private_reason || null,
            private_at: nb.private_at || null,
            private_by: nb.private_by || null,
            private_by_nickname: nb.private_by_nickname || null,
            scrap_count: Number(nb.scrap_count || 0),
            comment_count: Number(nb.comment_count || 0),
            record_count: Number(nb.record_count || 0),
            created_at: nb.created_at,
            updated_at: nb.updated_at,
            author_id: nb.author_id,
            author_nickname: nb.author_nickname,
            author_email: nb.author_email,
            author_role: nb.author_role,
            author_avatar: nb.author_avatar
        },
        pets: petRows,
        histories
    };
};

export const updateAdminNotebookShareScope = async (journeyId, shareScope, reason = '', adminUser, ipAddress = null) => {
    const upperScope = String(shareScope || '').trim().toUpperCase();
    if (!['PRIVATE', 'LINK_ONLY', 'PUBLIC'].includes(upperScope)) {
        const err = new Error('올바른 공개 범위(PRIVATE, LINK_ONLY, PUBLIC)를 선택해주세요.');
        err.status = 400;
        throw err;
    }

    const [rows] = await db.query(`SELECT id, title, share_scope FROM pet_journeys WHERE id = ? LIMIT 1`, [journeyId]);
    if (!rows[0]) {
        const err = new Error('NOTEBOOK_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    if (upperScope === 'PRIVATE') {
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) {
            const err = new Error('비공개 전환 사유를 입력해주세요.');
            err.status = 400;
            throw err;
        }
        const safeReason = trimmedReason.slice(0, 500);
        await db.query(
            `UPDATE pet_journeys
             SET share_scope = 'PRIVATE', private_reason = ?, private_at = NOW(), private_by = ?, updated_at = NOW()
             WHERE id = ?`,
            [safeReason, adminUser.id, journeyId]
        );
    } else {
        await db.query(
            `UPDATE pet_journeys
             SET share_scope = ?, private_reason = NULL, private_at = NULL, private_by = NULL, updated_at = NOW()
             WHERE id = ?`,
            [upperScope, journeyId]
        );
    }

    const [[updated]] = await db.query(
        `SELECT private_reason, private_at FROM pet_journeys WHERE id = ? LIMIT 1`,
        [journeyId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'NOTEBOOK_SHARE_SCOPE_CHANGE',
        targetType: 'NOTEBOOK',
        targetId: String(journeyId),
        summary: `수첩 그룹 '${rows[0].title}' 공개 범위 변경 (${rows[0].share_scope} → ${upperScope})`,
        detail: { share_scope: upperScope, reason: upperScope === 'PRIVATE' ? (updated?.private_reason || null) : null },
        ipAddress
    });

    return {
        success: true,
        journeyId: Number(journeyId),
        share_scope: upperScope,
        private_reason: updated?.private_reason || null,
        private_at: updated?.private_at || null
    };
};

const CORE_BOARD_IDS = ['LOOKBOOK', 'SNAP', 'CARE_LOUNGE', 'QNA'];
const VALID_BOARD_ROLES = ['USER', 'VET', 'EDITOR', 'ADMIN'];

const formatBoardRow = (b) => ({
    id: b.id,
    name: b.name,
    description: b.description || null,
    allow_product_pins: Boolean(Number(b.allow_product_pins || 0)),
    allow_vet_verify: Boolean(Number(b.allow_vet_verify || 0)),
    min_write_role: b.min_write_role || 'USER',
    sort_order: Number(b.sort_order || 0),
    is_active: Boolean(Number(b.is_active || 0)),
    is_core: CORE_BOARD_IDS.includes(b.id),
    created_at: b.created_at,
    total_post_count: Number(b.total_post_count || 0),
    published_post_count: Number(b.published_post_count || 0)
});

export const getAdminBoards = async ({ status = 'ALL', minWriteRole = 'ALL', q = '' } = {}) => {
    const [[boardKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalBoards,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeBoards,
            SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactiveBoards,
            SUM(CASE WHEN min_write_role != 'USER' THEN 1 ELSE 0 END) AS restrictedBoards,
            SUM(CASE WHEN min_write_role = 'EDITOR' THEN 1 ELSE 0 END) AS editorBoards,
            SUM(CASE WHEN min_write_role = 'ADMIN' THEN 1 ELSE 0 END) AS adminBoards,
            SUM(CASE WHEN allow_product_pins = 1 THEN 1 ELSE 0 END) AS productPinBoards,
            SUM(CASE WHEN allow_vet_verify = 1 THEN 1 ELSE 0 END) AS vetVerifyBoards
         FROM boards`
    );

    const [[postKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalPosts,
            SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) AS publishedPosts
         FROM posts
         WHERE status != 'DRAFT'`
    );

    const kpi = {
        totalBoards: Number(boardKpi?.totalBoards || 0),
        activeBoards: Number(boardKpi?.activeBoards || 0),
        inactiveBoards: Number(boardKpi?.inactiveBoards || 0),
        totalPosts: Number(postKpi?.totalPosts || 0),
        publishedPosts: Number(postKpi?.publishedPosts || 0),
        restrictedBoards: Number(boardKpi?.restrictedBoards || 0),
        editorBoards: Number(boardKpi?.editorBoards || 0),
        adminBoards: Number(boardKpi?.adminBoards || 0),
        productPinBoards: Number(boardKpi?.productPinBoards || 0),
        vetVerifyBoards: Number(boardKpi?.vetVerifyBoards || 0)
    };

    const whereClauses = ['1=1'];
    const whereParams = [];

    const upperStatus = String(status || 'ALL').trim().toUpperCase();
    if (upperStatus === 'ACTIVE') {
        whereClauses.push('b.is_active = 1');
    } else if (upperStatus === 'INACTIVE') {
        whereClauses.push('b.is_active = 0');
    }

    const upperRole = String(minWriteRole || 'ALL').trim().toUpperCase();
    if (upperRole === 'EDITOR_PLUS') {
        whereClauses.push("b.min_write_role IN ('EDITOR', 'ADMIN')");
    } else if (VALID_BOARD_ROLES.includes(upperRole)) {
        whereClauses.push('b.min_write_role = ?');
        whereParams.push(upperRole);
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push('(b.id LIKE ? OR b.name LIKE ? OR b.description LIKE ?)');
        whereParams.push(like, like, like);
    }

    const [rows] = await db.query(
        `SELECT
            b.id, b.name, b.description, b.allow_product_pins, b.allow_vet_verify,
            b.min_write_role, b.sort_order, b.is_active, b.created_at,
            (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id AND p.status != 'DRAFT') AS total_post_count,
            (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id AND p.status = 'PUBLISHED') AS published_post_count
         FROM boards b
         WHERE ${whereClauses.join(' AND ')}
         ORDER BY b.sort_order ASC, b.created_at ASC, b.id ASC`,
        whereParams
    );

    return {
        kpi,
        boards: rows.map(formatBoardRow)
    };
};

export const createAdminBoard = async (data = {}, adminUser, ipAddress = null) => {
    const boardId = String(data.id || '').trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,30}$/.test(boardId)) {
        const err = new Error('게시판 코드(ID)는 영문 대문자·숫자·밑줄(_) 2~30자로 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const [dup] = await db.query(`SELECT id FROM boards WHERE id = ? LIMIT 1`, [boardId]);
    if (dup.length > 0) {
        const err = new Error('이미 존재하는 게시판 코드(ID)입니다.');
        err.status = 409;
        throw err;
    }

    const name = String(data.name || '').trim();
    if (!name || name.length > 50) {
        const err = new Error('게시판 이름을 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const description = data.description ? String(data.description).trim().slice(0, 200) : null;
    const minWriteRole = data.min_write_role !== undefined
        ? String(data.min_write_role || '').trim().toUpperCase()
        : 'USER';
    if (!VALID_BOARD_ROLES.includes(minWriteRole)) {
        const err = new Error('올바른 작성 권한(USER, VET, EDITOR, ADMIN)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    let sortOrder = parseInt(data.sort_order, 10);
    if (!Number.isInteger(sortOrder) || sortOrder < 1) {
        const [[maxRow]] = await db.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM boards`);
        sortOrder = Number(maxRow?.next_order || 1);
    }

    const allowProductPins = data.allow_product_pins === undefined ? 1 : (data.allow_product_pins ? 1 : 0);
    const allowVetVerify = data.allow_vet_verify ? 1 : 0;
    const isActive = data.is_active === undefined ? 1 : (data.is_active ? 1 : 0);

    await db.query(
        `INSERT INTO boards (id, name, description, allow_product_pins, allow_vet_verify, min_write_role, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [boardId, name, description, allowProductPins, allowVetVerify, minWriteRole, sortOrder, isActive]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'BOARD_CREATE',
        targetType: 'BOARD',
        targetId: boardId,
        summary: `게시판 '${name}' (${boardId}) 생성`,
        detail: { id: boardId, name, min_write_role: minWriteRole, sort_order: sortOrder },
        ipAddress
    });

    const [[created]] = await db.query(
        `SELECT b.*, 0 AS total_post_count, 0 AS published_post_count FROM boards b WHERE b.id = ? LIMIT 1`,
        [boardId]
    );

    return { board: formatBoardRow(created) };
};

export const reorderAdminBoards = async (orderedIds, adminUser, ipAddress = null) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        const err = new Error('정렬할 게시판 ID 목록을 전달해주세요.');
        err.status = 400;
        throw err;
    }

    const cleaned = orderedIds.map((id) => String(id || '').trim()).filter(Boolean);
    if (cleaned.length !== orderedIds.length || new Set(cleaned).size !== cleaned.length) {
        const err = new Error('유효하지 않거나 중복된 게시판 ID가 포함되어 있습니다.');
        err.status = 400;
        throw err;
    }

    for (let i = 0; i < cleaned.length; i++) {
        await db.query(`UPDATE boards SET sort_order = ? WHERE id = ?`, [i + 1, cleaned[i]]);
    }

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'BOARD_REORDER',
        targetType: 'BOARD',
        targetId: null,
        summary: `게시판 노출 순서 변경 (${cleaned.length}개)`,
        detail: { orderedIds: cleaned },
        ipAddress
    });

    return { success: true, orderedIds: cleaned };
};

export const updateAdminBoard = async (boardId, data = {}, adminUser, ipAddress = null) => {
    const [rows] = await db.query(`SELECT * FROM boards WHERE id = ? LIMIT 1`, [boardId]);
    if (!rows[0]) {
        const err = new Error('BOARD_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const updates = [];
    const params = [];

    if (data.name !== undefined) {
        const name = String(data.name || '').trim();
        if (!name || name.length > 50) {
            const err = new Error('게시판 이름을 입력해주세요.');
            err.status = 400;
            throw err;
        }
        updates.push('name = ?');
        params.push(name);
    }

    if (data.description !== undefined) {
        const desc = data.description ? String(data.description).trim().slice(0, 200) : null;
        updates.push('description = ?');
        params.push(desc);
    }

    if (data.min_write_role !== undefined) {
        const role = String(data.min_write_role || '').trim().toUpperCase();
        if (!VALID_BOARD_ROLES.includes(role)) {
            const err = new Error('올바른 작성 권한(USER, VET, EDITOR, ADMIN)을 선택해주세요.');
            err.status = 400;
            throw err;
        }
        updates.push('min_write_role = ?');
        params.push(role);
    }

    if (data.sort_order !== undefined) {
        const order = parseInt(data.sort_order, 10);
        if (!Number.isInteger(order) || order < 1) {
            const err = new Error('정렬 순서는 1 이상의 정수여야 합니다.');
            err.status = 400;
            throw err;
        }
        updates.push('sort_order = ?');
        params.push(order);
    }

    if (data.allow_product_pins !== undefined) {
        updates.push('allow_product_pins = ?');
        params.push(data.allow_product_pins ? 1 : 0);
    }

    if (data.allow_vet_verify !== undefined) {
        updates.push('allow_vet_verify = ?');
        params.push(data.allow_vet_verify ? 1 : 0);
    }

    if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(data.is_active ? 1 : 0);
    }

    if (updates.length > 0) {
        params.push(boardId);
        await db.query(`UPDATE boards SET ${updates.join(', ')} WHERE id = ?`, params);

        await logAdminAction({
            adminUserId: adminUser.id,
            action: 'BOARD_UPDATE',
            targetType: 'BOARD',
            targetId: boardId,
            summary: `게시판 '${rows[0].name}' (${boardId}) 설정 수정`,
            detail: data,
            ipAddress
        });
    }

    const [[updated]] = await db.query(
        `SELECT
            b.*,
            (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id AND p.status != 'DRAFT') AS total_post_count,
            (SELECT COUNT(*) FROM posts p WHERE p.board_id = b.id AND p.status = 'PUBLISHED') AS published_post_count
         FROM boards b WHERE b.id = ? LIMIT 1`,
        [boardId]
    );

    return { success: true, board: formatBoardRow(updated) };
};

export const deleteAdminBoard = async (boardId, adminUser, ipAddress = null) => {
    const [rows] = await db.query(`SELECT id, name FROM boards WHERE id = ? LIMIT 1`, [boardId]);
    if (!rows[0]) {
        const err = new Error('BOARD_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    if (CORE_BOARD_IDS.includes(boardId)) {
        const err = new Error('기본 게시판은 삭제할 수 없습니다. 비활성화를 이용해주세요.');
        err.status = 400;
        throw err;
    }

    const [[postCountRow]] = await db.query(`SELECT COUNT(*) AS cnt FROM posts WHERE board_id = ?`, [boardId]);
    if (Number(postCountRow?.cnt || 0) > 0) {
        const err = new Error('게시글이 존재하는 게시판은 삭제할 수 없습니다. 비활성화를 이용해주세요.');
        err.status = 400;
        throw err;
    }

    await db.query(`DELETE FROM boards WHERE id = ?`, [boardId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'BOARD_DELETE',
        targetType: 'BOARD',
        targetId: boardId,
        summary: `게시판 '${rows[0].name}' (${boardId}) 삭제`,
        detail: { id: boardId, name: rows[0].name },
        ipAddress
    });

    return { success: true, boardId };
};

const VALID_SUBDOMAIN_POLICIES = ['ALL', 'SPECIFIC', 'NONE'];

const formatAffiliateDomainRow = (row) => ({
    id: row.id,
    domain: row.domain,
    mall_name: row.mall_name,
    subdomain_policy: VALID_SUBDOMAIN_POLICIES.includes(String(row.subdomain_policy || '').toUpperCase())
        ? String(row.subdomain_policy).toUpperCase()
        : 'ALL',
    allowed_subdomains: parseAllowedSubdomains(row.allowed_subdomains),
    is_active: Boolean(Number(row.is_active || 0)),
    created_at: row.created_at,
    updated_at: row.updated_at
});

export const getAdminAffiliateDomains = async ({ status = 'ALL', q = '' } = {}) => {
    const [[domainKpi]] = await db.query(
        `SELECT
            COUNT(*) AS totalDomains,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeDomains,
            SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactiveDomains,
            SUM(CASE WHEN is_active = 1 AND subdomain_policy = 'ALL' THEN 1 ELSE 0 END) AS allSubCount,
            SUM(CASE WHEN is_active = 1 AND subdomain_policy = 'SPECIFIC' THEN 1 ELSE 0 END) AS specificSubCount,
            SUM(CASE WHEN is_active = 1 AND subdomain_policy = 'NONE' THEN 1 ELSE 0 END) AS noneSubCount
         FROM allowed_affiliate_domains`
    );

    const [[pinKpi]] = await db.query(`SELECT COUNT(*) AS totalProductPins FROM product_pins`);

    const kpi = {
        totalDomains: Number(domainKpi?.totalDomains || 0),
        activeDomains: Number(domainKpi?.activeDomains || 0),
        inactiveDomains: Number(domainKpi?.inactiveDomains || 0),
        allSubCount: Number(domainKpi?.allSubCount || 0),
        specificSubCount: Number(domainKpi?.specificSubCount || 0),
        noneSubCount: Number(domainKpi?.noneSubCount || 0),
        totalProductPins: Number(pinKpi?.totalProductPins || 0)
    };

    const whereClauses = ['1=1'];
    const whereParams = [];

    const upperStatus = String(status || 'ALL').trim().toUpperCase();
    if (upperStatus === 'ACTIVE') {
        whereClauses.push('is_active = 1');
    } else if (upperStatus === 'INACTIVE') {
        whereClauses.push('is_active = 0');
    }

    const trimmedQ = String(q || '').trim();
    if (trimmedQ) {
        const like = `%${trimmedQ}%`;
        whereClauses.push('(domain LIKE ? OR mall_name LIKE ? OR allowed_subdomains LIKE ?)');
        whereParams.push(like, like, like);
    }

    const [rows] = await db.query(
        `SELECT id, domain, mall_name, subdomain_policy, allowed_subdomains, is_active, created_at, updated_at
         FROM allowed_affiliate_domains
         WHERE ${whereClauses.join(' AND ')}
         ORDER BY is_active DESC, id ASC`,
        whereParams
    );

    return {
        kpi,
        domains: rows.map(formatAffiliateDomainRow)
    };
};

export const testAdminAffiliateUrl = async (rawUrl) => {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) {
        const err = new Error('테스트할 URL을 입력해주세요.');
        err.status = 400;
        throw err;
    }
    const rules = await getActiveAllowedDomains();
    return {
        success: true,
        ...evaluateAffiliateUrl(trimmed, rules)
    };
};

export const createAdminAffiliateDomain = async (data = {}, adminUser, ipAddress = null) => {
    const domain = normalizeAffiliateDomain(data.domain);
    if (!domain) {
        const err = new Error('유효한 도메인 형식을 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const mallName = String(data.mall_name || '').trim();
    if (!mallName || mallName.length > 100) {
        const err = new Error('쇼핑몰명을 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const policy = data.subdomain_policy !== undefined
        ? String(data.subdomain_policy || '').trim().toUpperCase()
        : 'ALL';
    if (!VALID_SUBDOMAIN_POLICIES.includes(policy)) {
        const err = new Error('올바른 서브도메인 정책(ALL, SPECIFIC, NONE)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    let allowedSubdomainsStr = null;
    if (policy === 'SPECIFIC') {
        const normalizedSubs = normalizeSubdomainList(data.allowed_subdomains, domain);
        if (normalizedSubs.length === 0) {
            const err = new Error('지정 서브도메인 허용 모드에서는 최소 1개 이상의 서브도메인을 입력해주세요.');
            err.status = 400;
            throw err;
        }
        allowedSubdomainsStr = normalizedSubs.join(',');
    }

    const [dup] = await db.query(`SELECT id FROM allowed_affiliate_domains WHERE domain = ? LIMIT 1`, [domain]);
    if (dup.length > 0) {
        const err = new Error('이미 등록된 도메인입니다.');
        err.status = 409;
        throw err;
    }

    const isActive = data.is_active === undefined ? 1 : (data.is_active ? 1 : 0);

    const [res] = await db.query(
        `INSERT INTO allowed_affiliate_domains (domain, mall_name, subdomain_policy, allowed_subdomains, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [domain, mallName, policy, allowedSubdomainsStr, isActive]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'AFFILIATE_DOMAIN_CREATE',
        targetType: 'AFFILIATE_DOMAIN',
        targetId: String(res.insertId),
        summary: `제휴 도메인 '${domain}' (${mallName}) 추가`,
        detail: { domain, mall_name: mallName, subdomain_policy: policy, allowed_subdomains: allowedSubdomainsStr },
        ipAddress
    });

    const [[created]] = await db.query(
        `SELECT * FROM allowed_affiliate_domains WHERE id = ? LIMIT 1`,
        [res.insertId]
    );

    return { domain: formatAffiliateDomainRow(created) };
};

export const updateAdminAffiliateDomain = async (domainId, data = {}, adminUser, ipAddress = null) => {
    const [rows] = await db.query(`SELECT * FROM allowed_affiliate_domains WHERE id = ? LIMIT 1`, [domainId]);
    const existing = rows[0];
    if (!existing) {
        const err = new Error('DOMAIN_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    const nextDomain = data.domain !== undefined ? normalizeAffiliateDomain(data.domain) : existing.domain;
    if (!nextDomain) {
        const err = new Error('유효한 도메인 형식을 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const [dup] = await db.query(
        `SELECT id FROM allowed_affiliate_domains WHERE domain = ? AND id != ? LIMIT 1`,
        [nextDomain, domainId]
    );
    if (dup.length > 0) {
        const err = new Error('이미 등록된 도메인입니다.');
        err.status = 409;
        throw err;
    }

    const nextMallName = data.mall_name !== undefined ? String(data.mall_name || '').trim() : existing.mall_name;
    if (!nextMallName || nextMallName.length > 100) {
        const err = new Error('쇼핑몰명을 입력해주세요.');
        err.status = 400;
        throw err;
    }

    const nextPolicy = data.subdomain_policy !== undefined
        ? String(data.subdomain_policy || '').trim().toUpperCase()
        : (existing.subdomain_policy || 'ALL');
    if (!VALID_SUBDOMAIN_POLICIES.includes(nextPolicy)) {
        const err = new Error('올바른 서브도메인 정책(ALL, SPECIFIC, NONE)을 선택해주세요.');
        err.status = 400;
        throw err;
    }

    let nextSubdomainsStr = null;
    if (nextPolicy === 'SPECIFIC') {
        const rawSubInput = data.allowed_subdomains !== undefined ? data.allowed_subdomains : existing.allowed_subdomains;
        const normalizedSubs = normalizeSubdomainList(rawSubInput, nextDomain);
        if (normalizedSubs.length === 0) {
            const err = new Error('지정 서브도메인 허용 모드에서는 최소 1개 이상의 서브도메인을 입력해주세요.');
            err.status = 400;
            throw err;
        }
        nextSubdomainsStr = normalizedSubs.join(',');
    }

    const nextIsActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : existing.is_active;

    await db.query(
        `UPDATE allowed_affiliate_domains
         SET domain = ?, mall_name = ?, subdomain_policy = ?, allowed_subdomains = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [nextDomain, nextMallName, nextPolicy, nextSubdomainsStr, nextIsActive, domainId]
    );

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'AFFILIATE_DOMAIN_UPDATE',
        targetType: 'AFFILIATE_DOMAIN',
        targetId: String(domainId),
        summary: `제휴 도메인 '${nextDomain}' (${nextMallName}) 설정 수정`,
        detail: { domain: nextDomain, mall_name: nextMallName, subdomain_policy: nextPolicy, allowed_subdomains: nextSubdomainsStr, is_active: Boolean(nextIsActive) },
        ipAddress
    });

    const [[updated]] = await db.query(
        `SELECT * FROM allowed_affiliate_domains WHERE id = ? LIMIT 1`,
        [domainId]
    );

    return { success: true, domain: formatAffiliateDomainRow(updated) };
};

export const deleteAdminAffiliateDomain = async (domainId, adminUser, ipAddress = null) => {
    const [rows] = await db.query(`SELECT id, domain, mall_name FROM allowed_affiliate_domains WHERE id = ? LIMIT 1`, [domainId]);
    if (!rows[0]) {
        const err = new Error('DOMAIN_NOT_FOUND');
        err.status = 404;
        throw err;
    }

    await db.query(`DELETE FROM allowed_affiliate_domains WHERE id = ?`, [domainId]);

    await logAdminAction({
        adminUserId: adminUser.id,
        action: 'AFFILIATE_DOMAIN_DELETE',
        targetType: 'AFFILIATE_DOMAIN',
        targetId: String(domainId),
        summary: `제휴 도메인 '${rows[0].domain}' (${rows[0].mall_name}) 삭제`,
        detail: { id: Number(domainId), domain: rows[0].domain },
        ipAddress
    });

    return { success: true, domainId: Number(domainId) };
};

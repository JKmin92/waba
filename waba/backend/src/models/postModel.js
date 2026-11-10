import db from '../../config/db.js';
import { generateCommentId, generatePostId } from '../../utils/simpleUtils.js';
import { deletePostFolder } from '../../utils/imageUtils.js';

export const getMainPostList = async () => {
    const sql = `
        SELECT 
            -- 1) item.post : posts 테이블 기본 정보 상자 (DB 컬럼명 snake_case 그대로!)
            JSON_OBJECT(
                'id', p.id,
                'board_id', p.board_id,
                'user_id', p.user_id,
                'curation_grade', p.curation_grade,
                'title', p.title,
                'content', p.content,
                'related_disease_id', p.related_disease_id,
                'is_vet_verified', (p.is_vet_verified = 1),
                'view_count', p.view_count,
                'like_count', p.like_count,
                'bookmark_count', p.bookmark_count,
                'comment_count', p.comment_count,
                'status', p.status,
                'promoted_at', p.promoted_at,
                'created_at', p.created_at
            ) AS post,

            -- 1-1) item.board : 게시판 마스터 정보
            JSON_OBJECT(
                'id', b.id,
                'name', b.name,
                'description', b.description,
                'allow_product_pins', (b.allow_product_pins = 1),
                'allow_vet_verify', (b.allow_vet_verify = 1)
            ) AS board,

            -- 2) item.user : users 테이블 작성자 정보 상자
            JSON_OBJECT(
                'id', u.id,
                'nickname', u.nickname,
                'profile_image_url', u.profile_image_url,
                'mentor_badge', u.mentor_badge,
                'vet_license_info', u.vet_license_info,
                'is_multi_species', (u.is_multi_species = 1)
            ) AS user,

            -- 3) item.post_images : post_images 테이블 사진 배열
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pi.id,
                        'post_id', pi.post_id,
                        'image_url', pi.image_url,
                        'is_thumbnail', (pi.is_thumbnail = 1),
                        'is_ai_generated', (pi.is_ai_generated = 1),
                        'sort_order', pi.sort_order
                    )
                )
                FROM post_images pi
                WHERE pi.post_id = p.id
            ), JSON_ARRAY()) AS post_images,

            -- 4) item.post_pets : post_pets + pets 테이블 연결된 반려동물 배열
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'pet_id', pt.id,
                        'name', pt.name,
                        'species', pt.species,
                        'custom_species', pt.custom_species,
                        'breed', pt.breed,
                        'weight_kg', COALESCE(pp.weight_at_post_kg, pt.latest_weight_kg),
                        'age_months', pp.age_months_at_post
                    )
                )
                FROM post_pets pp
                JOIN pets pt ON pp.pet_id = pt.id
                WHERE pp.post_id = p.id
            ), JSON_ARRAY()) AS post_pets,

            -- 5) item.product_pins : 사진 위 통합 핀(+) 배열 (자사몰 + 외부몰 + 펫 태그 자동 통합)
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'pin_id', pin.id,
                        'post_image_id', pin.post_image_id,
                        'pin_type', pin.pin_type,
                        'pos_x', pin.pos_x,
                        'pos_y', pin.pos_y,
                        'is_official', (pin.product_id IS NOT NULL),
                        'product_id', pin.product_id,
                        'product_name', CASE
                            WHEN pin.pin_type = 'PET' THEN
                                CASE
                                    WHEN pt_pin.name IS NOT NULL THEN
                                        CASE
                                            WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ', ', pt_pin.latest_weight_kg, 'kg)')
                                            WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ')')
                                            WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.latest_weight_kg, 'kg)')
                                            ELSE pt_pin.name
                                        END
                                    ELSE COALESCE(pin.external_product_name, '반려동물')
                                END
                            ELSE COALESCE(prd.name, pin.external_product_name, pt_pin.name)
                        END,
                        'brand_name', CASE
                            WHEN pin.pin_type = 'PET' THEN
                                CASE
                                    WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                        THEN CONCAT(pt_pin.breed, ' · ', pt_pin.latest_weight_kg, 'kg')
                                    WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                        THEN pt_pin.breed
                                    WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                        THEN CONCAT(pt_pin.latest_weight_kg, 'kg')
                                    ELSE '반려동물 태그'
                                END
                            WHEN pin.product_id IS NOT NULL THEN 'WABAMI'
                            ELSE pin.external_brand_name
                        END,
                        'price', COALESCE(prd.sale_price, pin.external_price, 0),
                        'reward_rate', COALESCE(prd.reward_rate, 0),
                        'thumbnail_url', COALESCE(prd.thumbnail_url, pin.external_image_url, pt_pin.current_avatar_url),
                        'external_url', pin.external_url,
                        'pet_id', pin.pet_id,
                        'pin_option_memo', pin.pin_option_memo,
                        'used_pet_names', COALESCE((
                            SELECT JSON_ARRAYAGG(pt2.name)
                            FROM pin_pet_mappings ppm
                            JOIN pets pt2 ON ppm.pet_id = pt2.id
                            WHERE ppm.pin_id = pin.id
                        ), JSON_ARRAY())
                    )
                )
                FROM product_pins pin
                JOIN post_images pi2 ON pin.post_image_id = pi2.id
                LEFT JOIN products prd ON pin.product_id = prd.id
                LEFT JOIN pets pt_pin ON pin.pet_id = pt_pin.id
                WHERE pi2.post_id = p.id
            ), JSON_ARRAY()) AS product_pins,

            -- 6) item.tags : 해시태그 문자열 배열
            COALESCE((
                SELECT JSON_ARRAYAGG(ptg.tag_name)
                FROM post_tags ptg
                WHERE ptg.post_id = p.id
            ), JSON_ARRAY()) AS tags,

            -- 7) item.care_verification : 수의사 검증 및 질병 상태
            CASE 
                WHEN p.is_vet_verified = 1 OR p.related_disease_id IS NOT NULL THEN
                    JSON_OBJECT(
                        'vet_comment', cv.vet_comment,
                        'disease_name', pd.disease_name,
                        'disease_status', pd.status
                    )
                ELSE NULL
            END AS care_verification

        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN boards b ON p.board_id = b.id
        LEFT JOIN care_verifications cv ON cv.post_id = p.id
        LEFT JOIN pet_diseases pd ON p.related_disease_id = pd.id
        WHERE p.status = 'PUBLISHED'
        ORDER BY 
            CASE WHEN p.curation_grade = 'MAIN_LOOKBOOK' THEN 0 ELSE 1 END,
            p.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
};

export const getPostDetail = async (postId, userId = null, shouldIncrement = false) => {
    if (shouldIncrement) {
        await db.query(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, [postId]);
    }
    const sql = `
        SELECT 
            -- 1) post : 게시글 기본 테이블 (posts)
            JSON_OBJECT(
                'id', p.id,
                'board_id', p.board_id,
                'user_id', p.user_id,
                'curation_grade', p.curation_grade,
                'title', p.title,
                'content', p.content, -- 블록 에디터 JSON 배열 ([{type:'text',...}, {type:'image', image_id:...}])
                'related_disease_id', p.related_disease_id,
                'is_vet_verified', (p.is_vet_verified = 1),
                'view_count', p.view_count,
                'like_count', p.like_count,
                'bookmark_count', p.bookmark_count,
                'comment_count', p.comment_count,
                'status', p.status,
                'promoted_at', p.promoted_at,
                'created_at', p.created_at,
                'updated_at', p.updated_at
            ) AS post,
            -- 1-1) board : 게시판 마스터 정보 (boards)
            JSON_OBJECT(
                'id', b.id,
                'name', b.name,
                'description', b.description,
                'allow_product_pins', (b.allow_product_pins = 1),
                'allow_vet_verify', (b.allow_vet_verify = 1)
            ) AS board,
            -- 2) user : 작성자 정보 (users)
            JSON_OBJECT(
                'id', u.id,
                'nickname', u.nickname,
                'profile_image_url', u.profile_image_url,
                'mentor_badge', u.mentor_badge,
                'vet_license_info', u.vet_license_info,
                'is_multi_species', (u.is_multi_species = 1)
            ) AS user,
            -- 3) post_images : 본문에 사용된 모든 사진 배열 (post_images)
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pi.id,
                        'post_id', pi.post_id,
                        'image_url', pi.image_url,
                        'is_thumbnail', (pi.is_thumbnail = 1),
                        'is_ai_generated', (pi.is_ai_generated = 1),
                        'sort_order', pi.sort_order
                    )
                )
                FROM post_images pi
                WHERE pi.post_id = p.id
                ORDER BY pi.sort_order ASC
            ), JSON_ARRAY()) AS post_images,
            -- 4) product_pins : 본문 사진들에 찍힌 통합 핀 배열 (자사몰/외부몰/펫 태그)
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'pin_id', pin.id,
                        'post_image_id', pin.post_image_id,
                        'pin_type', pin.pin_type,
                        'pos_x', pin.pos_x,
                        'pos_y', pin.pos_y,
                        'is_official', (pin.product_id IS NOT NULL),
                        'product_id', pin.product_id,
                        'product_name', CASE
                            WHEN pin.pin_type = 'PET' THEN
                                CASE
                                    WHEN pt_pin.name IS NOT NULL THEN
                                        CASE
                                            WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ', ', pt_pin.latest_weight_kg, 'kg)')
                                            WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ')')
                                            WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.latest_weight_kg, 'kg)')
                                            ELSE pt_pin.name
                                        END
                                    ELSE COALESCE(pin.external_product_name, '반려동물')
                                END
                            ELSE COALESCE(prd.name, pin.external_product_name, pt_pin.name)
                        END,
                        'brand_name', CASE
                            WHEN pin.pin_type = 'PET' THEN
                                CASE
                                    WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                        THEN CONCAT(pt_pin.breed, ' · ', pt_pin.latest_weight_kg, 'kg')
                                    WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                        THEN pt_pin.breed
                                    WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                        THEN CONCAT(pt_pin.latest_weight_kg, 'kg')
                                    ELSE '반려동물 태그'
                                END
                            WHEN pin.product_id IS NOT NULL THEN 'WABAMI'
                            ELSE pin.external_brand_name
                        END,
                        'price', COALESCE(prd.sale_price, pin.external_price, 0),
                        'reward_rate', COALESCE(prd.reward_rate, 0),
                        'thumbnail_url', COALESCE(prd.thumbnail_url, pin.external_image_url, pt_pin.current_avatar_url),
                        'external_url', pin.external_url,
                        'pet_id', pin.pet_id,
                        'pin_option_memo', pin.pin_option_memo
                    )
                )
                FROM product_pins pin
                JOIN post_images pi2 ON pin.post_image_id = pi2.id
                LEFT JOIN products prd ON pin.product_id = prd.id
                LEFT JOIN pets pt_pin ON pin.pet_id = pt_pin.id
                WHERE pi2.post_id = p.id
            ), JSON_ARRAY()) AS product_pins,
            -- 5) post_pets : 하단 '이 게시글에 태그된 반려동물' 요약용 펫 정보 (post_pets + pets)
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'pet_id', pt.id,
                        'name', pt.name,
                        'species', pt.species,
                        'custom_species', pt.custom_species,
                        'breed', pt.breed,
                        'weight_kg', COALESCE(pp.weight_at_post_kg, pt.latest_weight_kg),
                        'age_months', pp.age_months_at_post,
                        'avatar_url', pt.current_avatar_url
                    )
                )
                FROM post_pets pp
                JOIN pets pt ON pp.pet_id = pt.id
                WHERE pp.post_id = p.id
            ), JSON_ARRAY()) AS post_pets,
            -- 6) tags : 해시태그 목록 (post_tags)
            COALESCE((
                SELECT JSON_ARRAYAGG(ptg.tag_name)
                FROM post_tags ptg
                WHERE ptg.post_id = p.id
            ), JSON_ARRAY()) AS tags,
            -- 7) comments : 하단 댓글 목록 (comments + users)
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', c.id,
                        'user_id', c.user_id,
                        'content', c.content,
                        'like_count', c.like_count,
                        'is_anonymous', (c.is_anonymous = 1),
                        'created_at', c.created_at,
                        'author', JSON_OBJECT(
                            'id', cu.id,
                            'nickname', IF(c.is_anonymous = 1, '익명 집사', cu.nickname),
                            'profile_image_url', IF(c.is_anonymous = 1, NULL, cu.profile_image_url)
                        )
                    )
                )
                FROM comments c
                JOIN users cu ON c.user_id = cu.id
                WHERE c.post_id = p.id AND c.status = 'ACTIVE'
                ORDER BY c.created_at ASC
            ), JSON_ARRAY()) AS comments,
            -- 9) 로그인 사용자의 인터랙션 여부
            COALESCE((
                SELECT 1 
                FROM post_interactions 
                WHERE post_id = p.id AND user_id = ? AND interaction_type = 'LIKE'
                LIMIT 1
            ), 0) = 1 AS is_liked,
            COALESCE((
                SELECT 1 
                FROM post_interactions 
                WHERE post_id = p.id AND user_id = ? AND interaction_type = 'BOOKMARK'
                LIMIT 1
            ), 0) = 1 AS is_bookmarked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN boards b ON p.board_id = b.id
        WHERE p.id = ? AND p.status = 'PUBLISHED'
        LIMIT 1`;

    const [rows] = await db.query(sql, [userId || '', userId || '', postId]);
    if (!rows[0]) return null;
    return {
        ...rows[0],
        is_liked: Boolean(rows[0].is_liked),
        is_bookmarked: Boolean(rows[0].is_bookmarked)
    };
}

export const togglePostLike = async (postId, userId) => {
    // 1. 기존 좋아요 여부 확인
    const checkSql = `
        SELECT id FROM post_interactions 
        WHERE post_id = ? AND user_id = ? AND interaction_type = 'LIKE'
    `;
    const [existing] = await db.query(checkSql, [postId, userId]);

    let isLiked = false;

    if (existing.length > 0) {
        // 이미 좋아요 한 상태 -> 취소
        await db.query(
            `DELETE FROM post_interactions WHERE id = ?`,
            [existing[0].id]
        );
        await db.query(
            `UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?`,
            [postId]
        );
        isLiked = false;
    } else {
        // 좋아요 등록
        await db.query(
            `INSERT INTO post_interactions (post_id, user_id, interaction_type, created_at) VALUES (?, ?, 'LIKE', NOW())`,
            [postId, userId]
        );
        await db.query(
            `UPDATE posts SET like_count = like_count + 1 WHERE id = ?`,
            [postId]
        );
        isLiked = true;
    }

    // 최신 like_count 조회
    const [postRows] = await db.query(
        `SELECT like_count FROM posts WHERE id = ?`,
        [postId]
    );

    return {
        is_liked: isLiked,
        like_count: postRows[0]?.like_count ?? 0
    };
}

export const togglePostBookmark = async (postId, userId) => {
    // 1. 기존 북마크 여부 확인
    const checkSql = `
        SELECT id FROM post_interactions 
        WHERE post_id = ? AND user_id = ? AND interaction_type = 'BOOKMARK'
    `;
    const [existing] = await db.query(checkSql, [postId, userId]);

    let isBookmarked = false;

    if (existing.length > 0) {
        // 이미 북마크 한 상태 -> 취소
        await db.query(
            `DELETE FROM post_interactions WHERE id = ?`,
            [existing[0].id]
        );
        await db.query(
            `UPDATE posts SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = ?`,
            [postId]
        );
        isBookmarked = false;
    } else {
        // 북마크 등록
        await db.query(
            `INSERT INTO post_interactions (post_id, user_id, interaction_type, created_at) VALUES (?, ?, 'BOOKMARK', NOW())`,
            [postId, userId]
        );
        await db.query(
            `UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = ?`,
            [postId]
        );
        isBookmarked = true;
    }

    // 최신 bookmark_count 조회
    const [postRows] = await db.query(
        `SELECT bookmark_count FROM posts WHERE id = ?`,
        [postId]
    );

    return {
        is_bookmarked: isBookmarked,
        bookmark_count: postRows[0]?.bookmark_count ?? 0
    };
}

export const createComment = async (postId, userId, { content, parent_id = null, is_anonymous = false }) => {
    const commentId = generateCommentId();
    const isAnon = is_anonymous ? 1 : 0;

    // 1. 댓글 INSERT
    const insertSql = `
        INSERT INTO comments (
            id, post_id, user_id, parent_id, content, is_anonymous, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(), NOW())
    `;
    await db.query(insertSql, [commentId, postId, userId, parent_id || null, content, isAnon]);

    // 2. 게시글 comment_count + 1
    await db.query(
        `UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?`,
        [postId]
    );

    // 3. 작성된 댓글 상세 & 작성자 정보 조회
    const [rows] = await db.query(`
        SELECT 
            c.id, c.content, c.like_count, c.created_at, (c.is_anonymous = 1) AS is_anonymous,
            cu.id AS author_id, cu.nickname, cu.profile_image_url
        FROM comments c
        JOIN users cu ON c.user_id = cu.id
        WHERE c.id = ?
    `, [commentId]);

    const created = rows[0];

    // 4. 최신 게시글 comment_count 조회
    const [postRows] = await db.query(
        `SELECT comment_count FROM posts WHERE id = ?`,
        [postId]
    );

    return {
        comment: {
            id: created.id,
            user_id: userId,
            content: created.content,
            like_count: created.like_count || 0,
            created_at: created.created_at,
            is_anonymous: Boolean(created.is_anonymous),
            author: {
                id: created.is_anonymous ? null : created.author_id,
                nickname: created.is_anonymous ? '익명 집사' : created.nickname,
                profile_image_url: created.is_anonymous ? null : created.profile_image_url
            }
        },
        comment_count: postRows[0]?.comment_count ?? 0
    };
};

export const deleteComment = async (commentId, userId) => {
    const [rows] = await db.query(
        `SELECT id, post_id, user_id FROM comments WHERE id = ? AND status = 'ACTIVE'`,
        [commentId]
    );

    if (rows.length === 0) {
        const error = new Error('COMMENT_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const comment = rows[0];
    if (comment.user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    // 소프트 삭제
    await db.query(`UPDATE comments SET status = 'DELETED' WHERE id = ?`, [commentId]);
    await db.query(`UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?`, [comment.post_id]);

    const [postRows] = await db.query(
        `SELECT comment_count FROM posts WHERE id = ?`,
        [comment.post_id]
    );

    return {
        comment_id: commentId,
        post_id: comment.post_id,
        comment_count: postRows[0]?.comment_count ?? 0
    };
}

export const updateComment = async (commentId, userId, content) => {
    const [rows] = await db.query(
        `SELECT id, post_id, user_id FROM comments WHERE id = ? AND status = 'ACTIVE'`,
        [commentId]
    );

    if (rows.length === 0) {
        const error = new Error('COMMENT_NOT_FOUND');
        error.status = 404;
        throw error;
    }
    if (rows[0].user_id !== userId) {
        const error = new Error('FORBIDDEN');
        error.status = 403;
        throw error;
    }

    await db.query(
        `UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?`,
        [content, commentId]
    );

    return { comment_id: commentId, post_id: rows[0].post_id, content };
}

export const getBoardList = async () => {
    const sql = `SELECT * FROM boards WHERE is_active = 1 ORDER BY sort_order ASC`;
    const [rows] = await db.query(sql);
    return rows;
}

export const getPostList = async (boardId) => {
    const sql = `
        SELECT 
            JSON_OBJECT(
                'id', p.id,
                'board_id', p.board_id,
                'user_id', p.user_id,
                'curation_grade', p.curation_grade,
                'title', p.title,
                'content', p.content,
                'related_disease_id', p.related_disease_id,
                'is_vet_verified', (p.is_vet_verified = 1),
                'view_count', p.view_count,
                'like_count', p.like_count,
                'bookmark_count', p.bookmark_count,
                'comment_count', p.comment_count,
                'status', p.status,
                'promoted_at', p.promoted_at,
                'created_at', p.created_at
            ) AS post,
            JSON_OBJECT(
                'id', b.id,
                'name', b.name,
                'description', b.description,
                'allow_product_pins', (b.allow_product_pins = 1),
                'allow_vet_verify', (b.allow_vet_verify = 1)
            ) AS board,
            JSON_OBJECT(
                'id', u.id,
                'nickname', u.nickname,
                'profile_image_url', u.profile_image_url,
                'mentor_badge', u.mentor_badge,
                'vet_license_info', u.vet_license_info,
                'is_multi_species', (u.is_multi_species = 1)
            ) AS user,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pi.id,
                        'post_id', pi.post_id,
                        'image_url', pi.image_url,
                        'is_thumbnail', (pi.is_thumbnail = 1),
                        'is_ai_generated', (pi.is_ai_generated = 1),
                        'sort_order', pi.sort_order
                    )
                )
                FROM post_images pi
                WHERE pi.post_id = p.id
                ORDER BY pi.sort_order ASC
            ), JSON_ARRAY()) AS post_images,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'pet_id', pt.id,
                        'name', pt.name,
                        'species', pt.species,
                        'custom_species', pt.custom_species,
                        'breed', pt.breed,
                        'weight_kg', COALESCE(pp.weight_at_post_kg, pt.latest_weight_kg),
                        'age_months', pp.age_months_at_post
                    )
                )
                FROM post_pets pp
                JOIN pets pt ON pp.pet_id = pt.id
                WHERE pp.post_id = p.id
            ), JSON_ARRAY()) AS post_pets,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'pin_id', pin.id,
                        'post_image_id', pin.post_image_id,
                        'pin_type', pin.pin_type,
                        'pos_x', pin.pos_x,
                        'pos_y', pin.pos_y,
                        'is_official', (pin.product_id IS NOT NULL),
                        'product_id', pin.product_id,
                        'product_name', CASE
                            WHEN pin.pin_type = 'PET' THEN
                                CASE
                                    WHEN pt_pin.name IS NOT NULL THEN
                                        CASE
                                            WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ', ', pt_pin.latest_weight_kg, 'kg)')
                                            WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ')')
                                            WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                                THEN CONCAT(pt_pin.name, ' (', pt_pin.latest_weight_kg, 'kg)')
                                            ELSE pt_pin.name
                                        END
                                    ELSE COALESCE(pin.external_product_name, '반려동물')
                                END
                            ELSE COALESCE(prd.name, pin.external_product_name, pt_pin.name)
                        END,
                        'brand_name', CASE
                            WHEN pin.pin_type = 'PET' THEN
                                CASE
                                    WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                        THEN CONCAT(pt_pin.breed, ' · ', pt_pin.latest_weight_kg, 'kg')
                                    WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                        THEN pt_pin.breed
                                    WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                        THEN CONCAT(pt_pin.latest_weight_kg, 'kg')
                                    ELSE '반려동물 태그'
                                END
                            WHEN pin.product_id IS NOT NULL THEN 'WABAMI'
                            ELSE pin.external_brand_name
                        END,
                        'price', COALESCE(prd.sale_price, pin.external_price, 0),
                        'reward_rate', COALESCE(prd.reward_rate, 0),
                        'thumbnail_url', COALESCE(prd.thumbnail_url, pin.external_image_url, pt_pin.current_avatar_url),
                        'external_url', pin.external_url,
                        'pet_id', pin.pet_id,
                        'pin_option_memo', pin.pin_option_memo
                    )
                )
                FROM product_pins pin
                LEFT JOIN products prd ON pin.product_id = prd.id
                LEFT JOIN pets pt_pin ON pin.pet_id = pt_pin.id
                WHERE pin.post_image_id IN (SELECT id FROM post_images WHERE post_id = p.id)
            ), JSON_ARRAY()) AS product_pins
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN boards b ON p.board_id = b.id
        WHERE p.board_id = UPPER(?) AND p.status = 'PUBLISHED'
        ORDER BY p.created_at DESC
    `;
    const [rows] = await db.query(sql, [boardId]);
    return rows;
};

const getPostListBaseQuery = (whereClause, orderBy = 'p.created_at DESC') => `
    SELECT 
        JSON_OBJECT(
            'id', p.id,
            'board_id', p.board_id,
            'user_id', p.user_id,
            'curation_grade', p.curation_grade,
            'title', p.title,
            'content', p.content,
            'related_disease_id', p.related_disease_id,
            'is_vet_verified', (p.is_vet_verified = 1),
            'view_count', p.view_count,
            'like_count', p.like_count,
            'bookmark_count', p.bookmark_count,
            'comment_count', p.comment_count,
            'status', p.status,
            'promoted_at', p.promoted_at,
            'created_at', p.created_at
        ) AS post,
        JSON_OBJECT(
            'id', b.id,
            'name', b.name,
            'description', b.description,
            'allow_product_pins', (b.allow_product_pins = 1),
            'allow_vet_verify', (b.allow_vet_verify = 1)
        ) AS board,
        JSON_OBJECT(
            'id', u.id,
            'nickname', u.nickname,
            'profile_image_url', u.profile_image_url,
            'mentor_badge', u.mentor_badge,
            'vet_license_info', u.vet_license_info,
            'is_multi_species', (u.is_multi_species = 1)
        ) AS user,
        COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', pi.id,
                    'post_id', pi.post_id,
                    'image_url', pi.image_url,
                    'is_thumbnail', (pi.is_thumbnail = 1),
                    'is_ai_generated', (pi.is_ai_generated = 1),
                    'sort_order', pi.sort_order
                )
            )
            FROM post_images pi
            WHERE pi.post_id = p.id
        ), JSON_ARRAY()) AS post_images,
        COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'pet_id', pt.id,
                    'name', pt.name,
                    'species', pt.species,
                    'custom_species', pt.custom_species,
                    'breed', pt.breed,
                    'weight_kg', COALESCE(pp.weight_at_post_kg, pt.latest_weight_kg),
                    'age_months', pp.age_months_at_post
                )
            )
            FROM post_pets pp
            JOIN pets pt ON pp.pet_id = pt.id
            WHERE pp.post_id = p.id
        ), JSON_ARRAY()) AS post_pets,
        COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'pin_id', pin.id,
                    'post_image_id', pin.post_image_id,
                    'pin_type', pin.pin_type,
                    'pos_x', pin.pos_x,
                    'pos_y', pin.pos_y,
                    'is_official', (pin.product_id IS NOT NULL),
                    'product_id', pin.product_id,
                    'product_name', CASE
                        WHEN pin.pin_type = 'PET' THEN
                            CASE
                                WHEN pt_pin.name IS NOT NULL THEN
                                    CASE
                                        WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                            THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ', ', pt_pin.latest_weight_kg, 'kg)')
                                        WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                            THEN CONCAT(pt_pin.name, ' (', pt_pin.breed, ')')
                                        WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                            THEN CONCAT(pt_pin.name, ' (', pt_pin.latest_weight_kg, 'kg)')
                                        ELSE pt_pin.name
                                    END
                                ELSE COALESCE(pin.external_product_name, '반려동물')
                            END
                        ELSE COALESCE(prd.name, pin.external_product_name, pt_pin.name)
                    END,
                    'brand_name', CASE
                        WHEN pin.pin_type = 'PET' THEN
                            CASE
                                WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != '' AND pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                    THEN CONCAT(pt_pin.breed, ' · ', pt_pin.latest_weight_kg, 'kg')
                                WHEN pt_pin.breed IS NOT NULL AND pt_pin.breed != ''
                                    THEN pt_pin.breed
                                WHEN pt_pin.latest_weight_kg IS NOT NULL AND pt_pin.latest_weight_kg > 0
                                    THEN CONCAT(pt_pin.latest_weight_kg, 'kg')
                                ELSE '반려동물 태그'
                            END
                        WHEN pin.product_id IS NOT NULL THEN 'WABAMI'
                        ELSE pin.external_brand_name
                    END,
                    'price', COALESCE(prd.sale_price, pin.external_price, 0),
                    'reward_rate', COALESCE(prd.reward_rate, 0),
                    'thumbnail_url', COALESCE(prd.thumbnail_url, pin.external_image_url, pt_pin.current_avatar_url),
                    'external_url', pin.external_url,
                    'pet_id', pin.pet_id,
                    'pin_option_memo', pin.pin_option_memo
                )
            )
            FROM product_pins pin
            LEFT JOIN products prd ON pin.product_id = prd.id
            LEFT JOIN pets pt_pin ON pin.pet_id = pt_pin.id
            WHERE pin.post_image_id IN (SELECT id FROM post_images WHERE post_id = p.id)
        ), JSON_ARRAY()) AS product_pins
    FROM posts p
    JOIN users u ON p.user_id = u.id
    JOIN boards b ON p.board_id = b.id
    ${whereClause}
    ORDER BY ${orderBy}
`;

export const getUserPosts = async (userId) => {
    const sql = getPostListBaseQuery("WHERE p.user_id = ? AND p.status = 'PUBLISHED'");
    const [rows] = await db.query(sql, [userId]);
    return rows;
};

export const getUserBookmarks = async (userId) => {
    const sql = getPostListBaseQuery(
        "JOIN post_interactions pi_inter ON pi_inter.post_id = p.id AND pi_inter.interaction_type = 'BOOKMARK' AND pi_inter.user_id = ? WHERE p.status = 'PUBLISHED'",
        'pi_inter.created_at DESC'
    );
    const [rows] = await db.query(sql, [userId]);
    return rows;
};

export const getUserLikes = async (userId) => {
    const sql = getPostListBaseQuery(
        "JOIN post_interactions pi_inter ON pi_inter.post_id = p.id AND pi_inter.interaction_type = 'LIKE' AND pi_inter.user_id = ? WHERE p.status = 'PUBLISHED'",
        'pi_inter.created_at DESC'
    );
    const [rows] = await db.query(sql, [userId]);
    return rows;
};

export const createOrUpdatePost = async (userId, {
    postId: inputPostId,
    board_id = 'SNAP',
    title = '',
    content = [],
    selected_pets = [],
    tags = [],
    status = 'PUBLISHED'
}) => {
    let postId = inputPostId;
    let isExisting = false;
    let existingStatus = null;

    if (postId) {
        const [existing] = await db.query(
            `SELECT id, status, created_at FROM posts WHERE id = ? AND user_id = ?`,
            [postId, userId]
        );
        if (existing.length > 0) {
            isExisting = true;
            existingStatus = existing[0].status;
        }
    }

    if (!postId || !isExisting) {
        postId = postId || generatePostId();
    }

    // 1. 부모 테이블(posts) 선등록 또는 기존 자식 데이터 초기화
    if (!isExisting) {
        await db.query(
            `INSERT INTO posts (
                id, board_id, user_id, curation_grade, title, content, 
                is_anonymous, related_disease_id, is_vet_verified, 
                view_count, like_count, bookmark_count, comment_count, 
                status, created_at, updated_at
            ) VALUES (?, ?, ?, 'NORMAL_FEED', ?, '[]', 0, NULL, 0, 0, 0, 0, 0, ?, NOW(), NOW())`,
            [postId, board_id, userId, title, status]
        );
    } else {
        await db.query(`DELETE FROM post_images WHERE post_id = ?`, [postId]);
        await db.query(`DELETE FROM post_pets WHERE post_id = ?`, [postId]);
        await db.query(`DELETE FROM post_tags WHERE post_id = ?`, [postId]);
    }

    // 2. 본문 블록(텍스트, 이미지, 핀) 처리 및 저장
    const finalContent = [];
    let imageOrder = 1;

    for (const block of content) {
        if (block.type === 'text') {
            finalContent.push({
                type: 'text',
                content: block.content || '',
                format: block.format || 'p'
            });
        } else if (block.type === 'image') {
            const imageUrl = block.image_url || block.previewUrl || '';
            const isThumbnail = imageOrder === 1 ? 1 : 0;

            const [imgResult] = await db.query(
                `INSERT INTO post_images (post_id, image_url, is_thumbnail, is_ai_generated, sort_order, created_at)
                 VALUES (?, ?, ?, 0, ?, NOW())`,
                [postId, imageUrl, isThumbnail, imageOrder]
            );
            const postImageId = imgResult.insertId;
            imageOrder++;

            finalContent.push({
                type: 'image',
                image_id: postImageId,
                caption: block.caption || '',
                image_url: imageUrl
            });

            // 이미지 내 핀(Pin) 저장
            if (Array.isArray(block.pins)) {
                for (const pin of block.pins) {
                    const pinId = `PIN${Math.floor(100 + Math.random() * 900)}${Date.now()}`.slice(0, 25);
                    await db.query(
                        `INSERT INTO product_pins (
                            id, post_image_id, pin_type, pos_x, pos_y, 
                            product_id, external_url, external_product_name, 
                            external_brand_name, external_price, pet_id, pin_option_memo, created_at
                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            pinId,
                            postImageId,
                            pin.pin_type || 'INTERNAL_PRODUCT',
                            pin.pos_x || 50,
                            pin.pos_y || 50,
                            pin.is_official && pin.product_id ? pin.product_id : null,
                            pin.product_url || null,
                            pin.product_name || null,
                            pin.brand_name || null,
                            pin.price || null,
                            pin.pet_id || null,
                            pin.pin_option_memo || null
                        ]
                    );
                }
            }
        }
    }

    // 3. 동반 반려동물(post_pets) 저장
    if (Array.isArray(selected_pets)) {
        for (const petId of selected_pets) {
            if (petId) {
                await db.query(
                    `INSERT IGNORE INTO post_pets (post_id, pet_id) VALUES (?, ?)`,
                    [postId, petId]
                );
            }
        }
    }

    // 4. 해시태그(post_tags) 저장
    if (Array.isArray(tags)) {
        for (const tag of tags) {
            const cleanedTag = String(tag).replace(/^#/, '').trim();
            if (cleanedTag) {
                await db.query(
                    `INSERT IGNORE INTO post_tags (post_id, tag_name) VALUES (?, ?)`,
                    [postId, cleanedTag]
                );
            }
        }
    }

    // 5. 최종 본문 JSON 및 메타데이터 posts 테이블 업데이트
    await db.query(
        `UPDATE posts 
         SET board_id = ?, title = ?, content = ?, status = ?, updated_at = NOW()
         WHERE id = ?`,
        [board_id, title, JSON.stringify(finalContent), status, postId]
    );

    // 6. 최초 발행 시 리워드 포인트 지급
    if (status === 'PUBLISHED' && existingStatus !== 'PUBLISHED') {
        await db.query(
            `UPDATE users SET reward_points = reward_points + 500 WHERE id = ?`,
            [userId]
        );
    }

    return { postId, success: true, status };
};

export const createPost = createOrUpdatePost;

export const getUserDraft = async (userId) => {
    const [rows] = await db.query(
        `SELECT p.id, p.board_id, p.title, p.content, p.created_at, p.updated_at
         FROM posts p
         WHERE p.user_id = ? AND p.status = 'DRAFT'
         ORDER BY p.updated_at DESC
         LIMIT 1`,
        [userId]
    );
    if (rows.length === 0) return null;
    return await buildEditablePost(rows[0]);
};

// 수정용: 본인의 발행된 게시글을 에디터 형식으로 반환
export const getEditablePost = async (userId, postId) => {
    const [rows] = await db.query(
        `SELECT p.id, p.board_id, p.title, p.content, p.created_at, p.updated_at, p.user_id, p.status
         FROM posts p
         WHERE p.id = ? AND p.status = 'PUBLISHED'`,
        [postId]
    );
    if (rows.length === 0) {
        const error = new Error('게시글을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }
    if (rows[0].user_id !== userId) {
        const error = new Error('게시글 수정 권한이 없습니다.');
        error.status = 403;
        throw error;
    }
    return await buildEditablePost(rows[0]);
};

// 수정용: 게시글 소유/상태 검증 후 created_at 반환
export const getOwnedPublishedPostMeta = async (userId, postId) => {
    const [rows] = await db.query(
        `SELECT id, user_id, status, created_at FROM posts WHERE id = ?`,
        [postId]
    );
    if (rows.length === 0 || rows[0].status !== 'PUBLISHED') {
        const error = new Error('게시글을 찾을 수 없습니다.');
        error.status = 404;
        throw error;
    }
    if (rows[0].user_id !== userId) {
        const error = new Error('게시글 수정 권한이 없습니다.');
        error.status = 403;
        throw error;
    }
    return rows[0];
};

const buildEditablePost = async (draft) => {
    // Parse content blocks
    let blocks = [];
    try {
        blocks = typeof draft.content === 'string' ? JSON.parse(draft.content) : draft.content;
    } catch (e) {
        blocks = [];
    }

    // Fetch images and pins for the draft
    const [images] = await db.query(
        `SELECT id, image_url, is_thumbnail, sort_order FROM post_images WHERE post_id = ? ORDER BY sort_order ASC`,
        [draft.id]
    );

    const [pins] = await db.query(
        `SELECT pp.* FROM product_pins pp
         JOIN post_images pi ON pp.post_image_id = pi.id
         WHERE pi.post_id = ?`,
        [draft.id]
    );

    // Fetch selected pets
    const [pets] = await db.query(
        `SELECT pet_id FROM post_pets WHERE post_id = ?`,
        [draft.id]
    );

    // Fetch tags
    const [tags] = await db.query(
        `SELECT tag_name FROM post_tags WHERE post_id = ?`,
        [draft.id]
    );

    // Reconstruct blocks with full image previewUrl and pins
    const resolvedBlocks = blocks.map(block => {
        if (block.type === 'image') {
            const matchedImg = images.find(img => img.id === block.image_id);
            const blockPins = pins
                .filter(pin => pin.post_image_id === block.image_id)
                .map(pin => ({
                    pin_id: pin.id,
                    pin_type: pin.pin_type,
                    product_id: pin.product_id,
                    is_official: Boolean(pin.product_id),
                    product_url: pin.external_url,
                    product_name: pin.external_product_name,
                    brand_name: pin.external_brand_name,
                    price: pin.external_price,
                    pet_id: pin.pet_id,
                    pos_x: Number(pin.pos_x),
                    pos_y: Number(pin.pos_y),
                    pin_option_memo: pin.pin_option_memo
                }));

            return {
                id: `block-image-${block.image_id || Date.now()}`,
                type: 'image',
                image_id: block.image_id,
                previewUrl: matchedImg?.image_url || block.image_url || block.previewUrl || '',
                image_url: matchedImg?.image_url || block.image_url || '',
                caption: block.caption || '',
                pins: blockPins
            };
        }
        return {
            id: `block-text-${Math.random()}`,
            type: 'text',
            content: block.content || '',
            format: block.format || 'p'
        };
    });

    return {
        postId: draft.id,
        board_id: draft.board_id,
        title: draft.title,
        blocks: resolvedBlocks,
        selectedPets: pets.map(p => p.pet_id),
        tags: tags.map(t => t.tag_name),
        createdAt: draft.created_at,
        updatedAt: draft.updated_at
    };
};

export const deleteDraft = async (userId, postId) => {
    let targetPostId = postId;
    let createdAt = null;

    if (targetPostId) {
        const [rows] = await db.query(
            `SELECT id, created_at FROM posts WHERE id = ? AND user_id = ? AND status = 'DRAFT'`,
            [targetPostId, userId]
        );
        if (rows.length === 0) {
            throw new Error('삭제할 임시 저장본을 찾을 수 없습니다.');
        }
        createdAt = rows[0].created_at;
    } else {
        const [rows] = await db.query(
            `SELECT id, created_at FROM posts WHERE user_id = ? AND status = 'DRAFT' ORDER BY updated_at DESC LIMIT 1`,
            [userId]
        );
        if (rows.length === 0) {
            return { success: true, message: '삭제할 임시저장이 없습니다.' };
        }
        targetPostId = rows[0].id;
        createdAt = rows[0].created_at;
    }

    // Delete post row (cascades to post_images, product_pins, post_pets, post_tags)
    await db.query(`DELETE FROM posts WHERE id = ?`, [targetPostId]);

    // Clean up folder from disk using created_at
    await deletePostFolder(targetPostId, createdAt);

    return { success: true, deletedPostId: targetPostId };
};

export const deletePost = async (userId, postId, userRole = 'USER') => {

    const [rows] = await db.query(
        `SELECT id, user_id, created_at, status FROM posts WHERE id = ?`,
        [postId]
    );

    if (rows.length === 0) {
        throw new Error('게시글을 찾을 수 없습니다.');
    }

    const post = rows[0];
    if (post.user_id !== userId && userRole !== 'ADMIN') {
        const error = new Error('게시글 삭제 권한이 없습니다.');
        error.status = 403;
        throw error;
    }

    // Soft delete or delete post
    await db.query(`UPDATE posts SET status = 'DELETED' WHERE id = ?`, [postId]);

    // Delete folder from disk
    await deletePostFolder(postId, post.created_at);

    return { success: true, deletedPostId: postId };
};

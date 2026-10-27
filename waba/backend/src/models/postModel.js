import db from '../../config/db.js';

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
                        'product_name', COALESCE(prd.name, pin.external_product_name, pt_pin.name),
                        'brand_name', CASE
                            WHEN pin.pin_type = 'PET' THEN CONCAT(pt_pin.breed, ' · ', pt_pin.latest_weight_kg, 'kg')
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

export const getPostDetail = async (postId) => {
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
                        'product_name', COALESCE(prd.name, pin.external_product_name, pt_pin.name),
                        'brand_name', CASE
                            WHEN pin.pin_type = 'PET' THEN CONCAT(pt_pin.breed, ' · ', pt_pin.latest_weight_kg, 'kg')
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
                        'content', c.content,
                        'like_count', c.like_count,
                        'created_at', c.created_at,
                        'author', JSON_OBJECT(
                            'id', cu.id,
                            'nickname', cu.nickname,
                            'profile_image_url', cu.profile_image_url
                        )
                    )
                )
                FROM comments c
                JOIN users cu ON c.user_id = cu.id
                WHERE c.post_id = p.id AND c.status = 'ACTIVE'
                ORDER BY c.created_at ASC
            ), JSON_ARRAY()) AS comments
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN boards b ON p.board_id = b.id
        WHERE p.id = ? AND p.status = 'PUBLISHED'
        LIMIT 1`;

    const [rows] = await db.query(sql, [postId]);
    return rows[0] || null;
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
                        'product_name', COALESCE(prd.name, pin.external_product_name, pt_pin.name),
                        'brand_name', CASE
                            WHEN pin.pin_type = 'PET' THEN CONCAT(pt_pin.breed, ' · ', pt_pin.latest_weight_kg, 'kg')
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
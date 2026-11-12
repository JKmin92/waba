import db from '../../config/db.js';

export const extractContentSummary = (content) => {
    if (!content) return '';
    try {
        const blocks = typeof content === 'string' ? JSON.parse(content) : content;
        if (Array.isArray(blocks)) {
            const textParts = blocks
                .filter(b => b && b.type === 'text' && b.content)
                .map(b => b.content.replace(/<[^>]*>/g, '').trim());
            const fullText = textParts.filter(Boolean).join(' ');
            return fullText.length > 160 ? fullText.slice(0, 160) + '...' : fullText;
        }
    } catch (e) {}
    if (typeof content === 'string') {
        const clean = content.replace(/<[^>]*>/g, '').trim();
        return clean.length > 160 ? clean.slice(0, 160) + '...' : clean;
    }
    return '';
};

export const normalizeSpecies = (species) => {
    if (!species) return 'ALL';
    const s = String(species).trim().toUpperCase();
    if (s === 'DOG') return 'DOG';
    if (s === 'CAT') return 'CAT';
    if (s === 'OTHER' || s === 'ETC') return 'OTHER';
    return 'ALL';
};

/**
 * 게시글(Posts) 검색
 */
export const searchPosts = async ({
    q = '',
    species = 'ALL',
    sort = 'relevance',
    page = 1,
    limit = 20
}) => {
    const keyword = (q || '').trim();
    const normalizedSpecies = normalizeSpecies(species);
    const offset = Math.max(0, (page - 1) * limit);

    const conditions = [`p.status = 'PUBLISHED'`];
    const params = [];

    // 키워드 조건 (제목, 본문, 태그, 동반/태그 반려동물 이름/품종/종, 게시판 이름)
    if (keyword) {
        const term = `%${keyword}%`;
        conditions.push(`(
            p.title LIKE ?
            OR p.content LIKE ?
            OR b.name LIKE ?
            OR EXISTS (SELECT 1 FROM post_tags ptg WHERE ptg.post_id = p.id AND ptg.tag_name LIKE ?)
            OR EXISTS (
                SELECT 1 FROM pets pt 
                WHERE pt.id IN (
                    SELECT pet_id FROM post_pets WHERE post_id = p.id
                    UNION
                    SELECT pin.pet_id 
                    FROM product_pins pin 
                    JOIN post_images pi_pin ON pin.post_image_id = pi_pin.id 
                    WHERE pi_pin.post_id = p.id AND pin.pin_type = 'PET' AND pin.pet_id IS NOT NULL
                )
                AND (pt.name LIKE ? OR pt.breed LIKE ? OR pt.species LIKE ? OR pt.custom_species LIKE ?)
            )
        )`);
        params.push(term, term, term, term, term, term, term, term);
    }

    // 종(species) 필터 조건
    if (normalizedSpecies === 'DOG') {
        conditions.push(`EXISTS (
            SELECT 1 FROM pets pt 
            WHERE pt.id IN (
                SELECT pet_id FROM post_pets WHERE post_id = p.id
                UNION
                SELECT pin.pet_id 
                FROM product_pins pin 
                JOIN post_images pi_pin ON pin.post_image_id = pi_pin.id 
                WHERE pi_pin.post_id = p.id AND pin.pin_type = 'PET' AND pin.pet_id IS NOT NULL
            )
            AND pt.species = 'DOG'
        )`);
    } else if (normalizedSpecies === 'CAT') {
        conditions.push(`EXISTS (
            SELECT 1 FROM pets pt 
            WHERE pt.id IN (
                SELECT pet_id FROM post_pets WHERE post_id = p.id
                UNION
                SELECT pin.pet_id 
                FROM product_pins pin 
                JOIN post_images pi_pin ON pin.post_image_id = pi_pin.id 
                WHERE pi_pin.post_id = p.id AND pin.pin_type = 'PET' AND pin.pet_id IS NOT NULL
            )
            AND pt.species = 'CAT'
        )`);
    } else if (normalizedSpecies === 'OTHER') {
        conditions.push(`EXISTS (
            SELECT 1 FROM pets pt 
            WHERE pt.id IN (
                SELECT pet_id FROM post_pets WHERE post_id = p.id
                UNION
                SELECT pin.pet_id 
                FROM product_pins pin 
                JOIN post_images pi_pin ON pin.post_image_id = pi_pin.id 
                WHERE pi_pin.post_id = p.id AND pin.pin_type = 'PET' AND pin.pet_id IS NOT NULL
            )
            AND (pt.species NOT IN ('DOG', 'CAT') OR pt.custom_species IS NOT NULL)
        )`);
    }

    const whereClause = conditions.join(' AND ');

    // 정렬 조건
    let orderByClause = 'p.created_at DESC';
    const orderParams = [];

    if (sort === 'relevance' && keyword) {
        orderByClause = `
            ((CASE WHEN p.title = ? THEN 100 ELSE 0 END) +
             (CASE WHEN p.title LIKE ? THEN 50 ELSE 0 END) +
             (CASE WHEN EXISTS (SELECT 1 FROM post_tags ptg WHERE ptg.post_id = p.id AND ptg.tag_name LIKE ?) THEN 30 ELSE 0 END) +
             (pin_count * 2)) DESC, p.created_at DESC
        `;
        orderParams.push(keyword, `%${keyword}%`, `%${keyword}%`);
    } else if (sort === 'popular') {
        orderByClause = '(p.like_count * 2 + p.bookmark_count * 3 + p.view_count) DESC, p.created_at DESC';
    } else if (sort === 'pins') {
        orderByClause = 'pin_count DESC, p.created_at DESC';
    } else {
        orderByClause = 'p.created_at DESC';
    }

    // 1. 전체 매칭 개수 조회
    const countSql = `
        SELECT COUNT(*) AS total
        FROM posts p
        JOIN boards b ON p.board_id = b.id
        WHERE ${whereClause}
    `;
    const [countRows] = await db.query(countSql, params);
    const totalCount = countRows[0]?.total || 0;

    // 2. 포스트 목록 조회
    const listSql = `
        SELECT 
            p.id,
            p.title,
            p.content,
            p.like_count,
            p.bookmark_count,
            p.view_count,
            p.created_at,
            b.id AS board_id,
            b.name AS board_name,
            u.id AS user_id,
            u.nickname AS user_nickname,
            u.profile_image_url AS user_profile_image_url,
            (
                SELECT pi.image_url 
                FROM post_images pi 
                WHERE pi.post_id = p.id 
                ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC 
                LIMIT 1
            ) AS thumbnail_url,
            (
                SELECT COUNT(*) 
                FROM product_pins pin 
                JOIN post_images pi ON pin.post_image_id = pi.id 
                WHERE pi.post_id = p.id
            ) AS pin_count,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'pet_id', pt.id,
                        'name', pt.name,
                        'species', pt.species,
                        'custom_species', pt.custom_species,
                        'breed', pt.breed,
                        'avatar_url', pt.current_avatar_url
                    )
                )
                FROM pets pt
                WHERE pt.id IN (
                    SELECT pet_id FROM post_pets WHERE post_id = p.id
                    UNION
                    SELECT pin.pet_id 
                    FROM product_pins pin 
                    JOIN post_images pi_pin ON pin.post_image_id = pi_pin.id 
                    WHERE pi_pin.post_id = p.id AND pin.pin_type = 'PET' AND pin.pet_id IS NOT NULL
                )
            ), JSON_ARRAY()) AS pets
        FROM posts p
        JOIN boards b ON p.board_id = b.id
        JOIN users u ON p.user_id = u.id
        WHERE ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(listSql, [...params, ...orderParams, limit, offset]);

    const formattedPosts = rows.map(row => ({
        id: row.id,
        title: row.title,
        content_summary: extractContentSummary(row.content),
        thumbnail_url: row.thumbnail_url || null,
        board_name: row.board_name,
        board_id: row.board_id,
        like_count: Number(row.like_count || 0),
        bookmark_count: Number(row.bookmark_count || 0),
        pin_count: Number(row.pin_count || 0),
        created_at: row.created_at,
        user: {
            id: row.user_id,
            nickname: row.user_nickname,
            profile_image_url: row.user_profile_image_url || null
        },
        pets: row.pets || []
    }));

    return {
        posts: formattedPosts,
        total: totalCount
    };
};

/**
 * 제품(Product) 검색 - 공식 상품 + 게시글 내 태그된 제품 핀 통합
 */
export const searchProductsUnified = async ({
    q = '',
    species = 'ALL',
    sort = 'relevance',
    page = 1,
    limit = 20
}) => {
    const keyword = (q || '').trim();
    const normalizedSpecies = normalizeSpecies(species);
    const offset = Math.max(0, (page - 1) * limit);

    // 1) 공식 상품 (products) WHERE 절
    const officialConditions = [`p.status = 'ON_SALE'`];
    const officialParams = [];

    if (keyword) {
        const term = `%${keyword}%`;
        officialConditions.push(`(p.name LIKE ? OR p.summary LIKE ? OR p.target_species LIKE ?)`);
        officialParams.push(term, term, term);
    }

    if (normalizedSpecies === 'DOG') {
        officialConditions.push(`(p.target_species LIKE '%DOG%' OR p.target_species IS NULL)`);
    } else if (normalizedSpecies === 'CAT') {
        officialConditions.push(`(p.target_species LIKE '%CAT%' OR p.target_species IS NULL)`);
    } else if (normalizedSpecies === 'OTHER') {
        officialConditions.push(`(
            (p.target_species NOT LIKE '%DOG%' AND p.target_species NOT LIKE '%CAT%')
            OR p.target_species LIKE '%RABBIT%' 
            OR p.target_species LIKE '%HAMSTER%' 
            OR p.target_species LIKE '%GUINEAPIG%' 
            OR p.target_species LIKE '%CHINCHILA%' 
            OR p.target_species IS NULL
        )`);
    }

    // 2) 외부 제품 핀 (product_pins) WHERE 절
    const externalConditions = [
        `p.status = 'PUBLISHED'`,
        `pin.pin_type = 'EXTERNAL_PRODUCT'`,
        `pin.external_product_name IS NOT NULL`
    ];
    const externalParams = [];

    if (keyword) {
        const term = `%${keyword}%`;
        externalConditions.push(`(
            pin.external_product_name LIKE ?
            OR pin.external_brand_name LIKE ?
            OR pin.pin_option_memo LIKE ?
        )`);
        externalParams.push(term, term, term);
    }

    if (normalizedSpecies === 'DOG') {
        externalConditions.push(`EXISTS (
            SELECT 1 FROM pets pt 
            WHERE pt.id IN (
                SELECT pet_id FROM post_pets WHERE post_id = p.id
                UNION
                SELECT pin2.pet_id FROM product_pins pin2 JOIN post_images pi2 ON pin2.post_image_id = pi2.id WHERE pi2.post_id = p.id AND pin2.pin_type = 'PET' AND pin2.pet_id IS NOT NULL
            )
            AND pt.species = 'DOG'
        )`);
    } else if (normalizedSpecies === 'CAT') {
        externalConditions.push(`EXISTS (
            SELECT 1 FROM pets pt 
            WHERE pt.id IN (
                SELECT pet_id FROM post_pets WHERE post_id = p.id
                UNION
                SELECT pin2.pet_id FROM product_pins pin2 JOIN post_images pi2 ON pin2.post_image_id = pi2.id WHERE pi2.post_id = p.id AND pin2.pin_type = 'PET' AND pin2.pet_id IS NOT NULL
            )
            AND pt.species = 'CAT'
        )`);
    } else if (normalizedSpecies === 'OTHER') {
        externalConditions.push(`EXISTS (
            SELECT 1 FROM pets pt 
            WHERE pt.id IN (
                SELECT pet_id FROM post_pets WHERE post_id = p.id
                UNION
                SELECT pin2.pet_id FROM product_pins pin2 JOIN post_images pi2 ON pin2.post_image_id = pi2.id WHERE pi2.post_id = p.id AND pin2.pin_type = 'PET' AND pin2.pet_id IS NOT NULL
            )
            AND (pt.species NOT IN ('DOG', 'CAT') OR pt.custom_species IS NOT NULL)
        )`);
    }

    // 정렬 조건
    let orderByClause = 'is_official DESC, pin_count DESC, created_at DESC';
    const orderParams = [];

    if (sort === 'relevance' && keyword) {
        orderByClause = `
            ((CASE WHEN is_official = 1 THEN 10 ELSE 0 END) +
             (CASE WHEN name = ? THEN 100 ELSE 0 END) +
             (CASE WHEN name LIKE ? THEN 50 ELSE 0 END) +
             (pin_count * 2)) DESC, created_at DESC
        `;
        orderParams.push(keyword, `%${keyword}%`);
    } else if (sort === 'latest') {
        orderByClause = 'created_at DESC';
    } else if (sort === 'popular' || sort === 'pins') {
        orderByClause = 'pin_count DESC, created_at DESC';
    } else {
        orderByClause = 'is_official DESC, pin_count DESC, created_at DESC';
    }

    const unifiedSqlBase = `
        SELECT * FROM (
            SELECT 
                p.id AS id,
                p.name AS name,
                '와바미' AS brand_name,
                p.original_price AS price,
                p.sale_price AS sale_price,
                p.thumbnail_url AS thumbnail_url,
                1 AS is_official,
                CONCAT('/products/', p.id) AS link_url,
                p.pin_count AS pin_count,
                p.created_at AS created_at
            FROM products p
            WHERE ${officialConditions.join(' AND ')}

            UNION ALL

            SELECT 
                MIN(pin.id) AS id,
                pin.external_product_name AS name,
                COALESCE(MIN(pin.external_brand_name), '외부 상품') AS brand_name,
                COALESCE(MIN(pin.external_price), 0) AS price,
                COALESCE(MIN(pin.external_price), 0) AS sale_price,
                COALESCE(MIN(pin.external_image_url), MIN(pi.image_url)) AS thumbnail_url,
                0 AS is_official,
                COALESCE(MIN(pin.external_url), '') AS link_url,
                COUNT(pin.id) AS pin_count,
                MAX(pin.created_at) AS created_at
            FROM product_pins pin
            JOIN post_images pi ON pin.post_image_id = pi.id
            JOIN posts p ON pi.post_id = p.id
            WHERE ${externalConditions.join(' AND ')}
            GROUP BY pin.external_product_name, pin.external_url
        ) combined_products
    `;

    const allParams = [...officialParams, ...externalParams];

    // 1. 전체 매칭 개수 조회
    const countSql = `SELECT COUNT(*) AS total FROM (${unifiedSqlBase}) AS total_query`;
    const [countRows] = await db.query(countSql, allParams);
    const totalCount = countRows[0]?.total || 0;

    // 2. 통합 제품 목록 조회
    const listSql = `
        ${unifiedSqlBase}
        ORDER BY ${orderByClause}
        LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(listSql, [...allParams, ...orderParams, limit, offset]);

    const formattedProducts = rows.map(row => ({
        id: row.id,
        name: row.name,
        brand_name: row.brand_name,
        price: Number(row.price || 0),
        sale_price: Number(row.sale_price || 0),
        thumbnail_url: row.thumbnail_url || null,
        is_official: Boolean(row.is_official),
        link_url: row.link_url || '',
        pin_count: Number(row.pin_count || 0),
        created_at: row.created_at
    }));

    return {
        products: formattedProducts,
        total: totalCount
    };
};

import * as searchModel from '../models/searchModel.js';

/**
 * GET /api/search
 * 통합 검색 API (게시글 + 제품)
 */
export const search = async (req, res, next) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const rawType = typeof req.query.type === 'string' ? req.query.type.toLowerCase() : 'all';
        const type = ['all', 'post', 'product'].includes(rawType) ? rawType : 'all';
        const species = searchModel.normalizeSpecies(req.query.species);
        const sort = typeof req.query.sort === 'string' ? req.query.sort.toLowerCase() : 'relevance';
        
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

        let postsResult = { posts: [], total: 0 };
        let productsResult = { products: [], total: 0 };

        if (type === 'all') {
            // 게시글 및 제품 동시 조회
            const [postsRes, productsRes] = await Promise.all([
                searchModel.searchPosts({ q, species, sort, page, limit }),
                searchModel.searchProductsUnified({ q, species, sort, page, limit })
            ]);
            postsResult = postsRes;
            productsResult = productsRes;
        } else if (type === 'post') {
            // 게시글 목록 및 제품 개수 동시 조회
            const [postsRes, productsRes] = await Promise.all([
                searchModel.searchPosts({ q, species, sort, page, limit }),
                searchModel.searchProductsUnified({ q, species, sort, page: 1, limit: 1 })
            ]);
            postsResult = postsRes;
            productsResult = { products: [], total: productsRes.total };
        } else if (type === 'product') {
            // 제품 목록 및 게시글 개수 동시 조회
            const [postsRes, productsRes] = await Promise.all([
                searchModel.searchPosts({ q, species, sort, page: 1, limit: 1 }),
                searchModel.searchProductsUnified({ q, species, sort, page, limit })
            ]);
            postsResult = { posts: [], total: postsRes.total };
            productsResult = productsRes;
        }

        const counts = {
            all: postsResult.total + productsResult.total,
            post: postsResult.total,
            product: productsResult.total
        };

        const currentTotal = type === 'post' 
            ? postsResult.total 
            : type === 'product' 
                ? productsResult.total 
                : counts.all;

        const pagination = {
            page,
            limit,
            total: currentTotal,
            total_pages: Math.ceil(currentTotal / limit) || 1
        };

        return res.status(200).json({
            success: true,
            query: q,
            type,
            species,
            sort,
            counts,
            posts: postsResult.posts,
            products: productsResult.products,
            pagination,
            data: {
                query: q,
                type,
                species,
                sort,
                counts,
                posts: postsResult.posts,
                products: productsResult.products,
                pagination
            }
        });
    } catch (err) {
        next(err);
    }
};

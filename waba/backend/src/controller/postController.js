import * as postService from '../service/postService.js';
import * as cheerio from 'cheerio';
import { processAndSavePostImages } from '../../utils/imageUtils.js';
import { generatePostId } from '../../utils/simpleUtils.js';
import { convertToCoupangPartnersUrl, isCoupangUrl } from '../../utils/coupangPartners.js';

export const getMainPostList = async (req, res, next) => {
    try {
        const rows = await postService.getMainPostList();
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}

export const getPostDetail = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user?.userId || null;
        const rows = await postService.getPostDetail(postId, userId);
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}

export const togglePostLike = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }
        const result = await postService.togglePostLike(postId, userId);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (e) {
        next(e);
    }
}

export const togglePostBookmark = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }
        const result = await postService.togglePostBookmark(postId, userId);
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (e) {
        next(e);
    }
}

export const createComment = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const userId = req.user?.userId;
        const { content, parent_id, is_anonymous } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: '댓글 내용을 입력해주세요.'
            });
        }

        const result = await postService.createComment(postId, userId, {
            content: content.trim(),
            parent_id,
            is_anonymous
        });

        return res.status(201).json({
            success: true,
            message: '댓글이 등록되었습니다.',
            ...result
        });
    } catch (e) {
        next(e);
    }
}

export const deleteComment = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }

        const result = await postService.deleteComment(commentId, userId);
        return res.status(200).json({
            success: true,
            message: '댓글이 삭제되었습니다.',
            ...result
        });
    } catch (e) {
        if (e.message === 'COMMENT_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
        }
        if (e.message === 'FORBIDDEN') {
            return res.status(403).json({ success: false, message: '본인이 작성한 댓글만 삭제할 수 있습니다.' });
        }
        next(e);
    }
}

export const getBoardList = async (req, res, next) => {
    try {
        const rows = await postService.getBoardList();
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}

export const getPostList = async (req, res, next) => {
    try {
        const { boardId } = req.params;
        const rows = await postService.getPostList(boardId);
        return res.status(200).json(rows);
    } catch (e) {
        next(e);
    }
}

export const createPost = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }
        // Support both application/json and multipart/form-data
        let { board_id = 'SNAP', title = '', content, blocks, selected_pets, tags, postId } = req.body;

        let parsedBlocks = [];
        try {
            const rawBlocks = blocks || content || '[]';
            parsedBlocks = typeof rawBlocks === 'string' ? JSON.parse(rawBlocks) : rawBlocks;
        } catch (e) {
            parsedBlocks = [];
        }

        let parsedPets = [];
        try {
            parsedPets = typeof selected_pets === 'string' ? JSON.parse(selected_pets) : (selected_pets || []);
        } catch (e) {
            parsedPets = [];
        }

        let parsedTags = [];
        try {
            parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);
        } catch (e) {
            parsedTags = [];
        }

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: '게시글 제목을 입력해주세요.'
            });
        }

        const finalPostId = postId || generatePostId();

        // Process any uploaded images via Sharp: max 1500px, 72 DPI, WebP
        const resolvedBlocks = await processAndSavePostImages({
            postId: finalPostId,
            createdAt: new Date(),
            files: req.files || [],
            contentBlocks: parsedBlocks
        });

        const result = await postService.createPost(userId, {
            postId: finalPostId,
            board_id,
            title: title.trim(),
            content: resolvedBlocks,
            selected_pets: parsedPets,
            tags: parsedTags,
            status: 'PUBLISHED'
        });

        return res.status(201).json({
            success: true,
            message: '게시글이 성공적으로 발행되었습니다.',
            postId: finalPostId,
            ...result
        });
    } catch (e) {
        next(e);
    }
};

export const saveDraft = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }

        let { board_id = 'SNAP', title = '', content, blocks, selected_pets, tags, postId } = req.body;

        let parsedBlocks = [];
        try {
            const rawBlocks = blocks || content || '[]';
            parsedBlocks = typeof rawBlocks === 'string' ? JSON.parse(rawBlocks) : rawBlocks;
        } catch (e) {
            parsedBlocks = [];
        }

        let parsedPets = [];
        try {
            parsedPets = typeof selected_pets === 'string' ? JSON.parse(selected_pets) : (selected_pets || []);
        } catch (e) {
            parsedPets = [];
        }

        let parsedTags = [];
        try {
            parsedTags = typeof tags === 'string' ? JSON.parse(tags) : (tags || []);
        } catch (e) {
            parsedTags = [];
        }

        const finalPostId = postId || generatePostId();

        // Process any uploaded images via Sharp: max 1500px, 72 DPI, WebP
        const resolvedBlocks = await processAndSavePostImages({
            postId: finalPostId,
            createdAt: new Date(),
            files: req.files || [],
            contentBlocks: parsedBlocks
        });

        const result = await postService.createPost(userId, {
            postId: finalPostId,
            board_id,
            title: (title || '').trim(),
            content: resolvedBlocks,
            selected_pets: parsedPets,
            tags: parsedTags,
            status: 'DRAFT'
        });

        return res.status(200).json({
            success: true,
            message: '임시 저장이 완료되었습니다.',
            postId: finalPostId,
            ...result
        });
    } catch (e) {
        next(e);
    }
};

export const getUserDraft = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        }
        const draft = await postService.getUserDraft(userId);
        return res.status(200).json({
            success: true,
            draft
        });
    } catch (e) {
        next(e);
    }
};

export const deleteDraft = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        }
        const postId = req.params.postId;
        const result = await postService.deleteDraft(userId, postId);
        return res.status(200).json(result);
    } catch (e) {
        next(e);
    }
};

export const deletePost = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        }
        const postId = req.params.id;
        const result = await postService.deletePost(userId, postId, req.user?.role);
        return res.status(200).json(result);
    } catch (e) {
        next(e);
    }
};

export const parseUrlMetadata = async (req, res, next) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            return res.status(400).json({
                success: false,
                message: '올바른 URL(http/https)을 입력해주세요.'
            });
        }

        let targetUrl = url;
        let partnersShortenUrl = null;

        // 1. 쿠팡 URL인 경우 먼저 내 쿠팡 파트너스 변환 API를 통해 파트너스 단축 URL 생성
        if (isCoupangUrl(url)) {
            try {
                partnersShortenUrl = await convertToCoupangPartnersUrl(url);
                if (partnersShortenUrl) {
                    targetUrl = partnersShortenUrl;
                }
            } catch (cpErr) {
                console.log('[Coupang Partners] URL 변환 건너뜀 (키 미입력 또는 오류):', cpErr.message);
                // 키 미입력 시에는 원본 URL로 스크래핑 진행
            }
        }

        // 2. 파트너스 URL(또는 원본 URL)로 메타데이터 스크래핑 진행
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        try {
            let response = await fetch(targetUrl, {
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                }
            });

            // 만약 파트너스 링크 리다이렉트 응답이 원활하지 않을 경우 원본 URL로 안전하게 폴백
            if (!response.ok && targetUrl !== url) {
                response = await fetch(url, {
                    signal: controller.signal,
                    redirect: 'follow',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    }
                });
            }

            clearTimeout(timeout);

            if (!response.ok) {
                return res.status(200).json({
                    success: false,
                    message: '해당 쇼핑몰 웹페이지에서 메타데이터를 직접 읽을 수 없습니다.',
                    url: targetUrl,
                    partners_url: partnersShortenUrl
                });
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            const title = $('meta[property="og:title"]').attr('content') ||
                          $('meta[name="twitter:title"]').attr('content') ||
                          $('title').text().trim() || '';

            let siteName = $('meta[property="og:site_name"]').attr('content') ||
                           $('meta[name="twitter:site"]').attr('content') || '';

            const image = $('meta[property="og:image"]').attr('content') ||
                          $('meta[name="twitter:image"]').attr('content') || '';

            let price = $('meta[property="product:price:amount"]').attr('content') ||
                        $('meta[property="og:price:amount"]').attr('content') ||
                        $('meta[name="twitter:data1"]').attr('content') || 0;

            if (!siteName) {
                try {
                    const parsedUrl = new URL(url);
                    if (parsedUrl.hostname.includes('naver')) siteName = '네이버 스마트스토어';
                    else if (parsedUrl.hostname.includes('coupang')) siteName = '쿠팡';
                    else if (parsedUrl.hostname.includes('ohou')) siteName = '오늘의집';
                    else if (parsedUrl.hostname.includes('kurly')) siteName = '마켓컬리';
                    else siteName = parsedUrl.hostname.replace('www.', '');
                } catch (_) {}
            }

            const cleanPrice = typeof price === 'string' ? Number(price.replace(/[^0-9]/g, '')) : Number(price) || 0;

            if (!title) {
                return res.status(200).json({
                    success: false,
                    message: '상품명을 메타태그에서 자동으로 찾을 수 없습니다.',
                    url: targetUrl,
                    partners_url: partnersShortenUrl
                });
            }

            return res.status(200).json({
                success: true,
                product_name: title.replace(/ : 네이버 쇼핑| : 네이버 스마트스토어| : 쿠팡| - 오늘의집/g, '').trim(),
                brand_name: siteName,
                thumbnail_url: image,
                price: cleanPrice,
                url: targetUrl,
                partners_url: partnersShortenUrl
            });
        } catch (fetchErr) {
            clearTimeout(timeout);
            return res.status(200).json({
                success: false,
                message: 'URL 메타데이터를 자동으로 추출할 수 없습니다. 수동으로 상품명과 가격을 입력해주세요.',
                url: targetUrl,
                partners_url: partnersShortenUrl
            });
        }
    } catch (e) {
        next(e);
    }
};

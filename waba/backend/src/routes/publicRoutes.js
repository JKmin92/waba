import express from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import * as userController from '../controller/userController.js';
import * as analyticsController from '../controller/analyticsController.js';
import * as marketingController from '../controller/marketingController.js';

const router = express.Router();

// 공개 케어 저니 조회 (인증 불필요)
router.get('/journey/:slug', userController.getPublicJourneyBySlug);

// 방문자/페이지 통계 및 공유 단축 URL
router.post('/track/visit', optionalAuth, analyticsController.trackVisit);
router.post('/short-links', optionalAuth, analyticsController.createShortLink);
router.get('/short-links/:code/resolve', analyticsController.resolveShortLink);

// 공개 마케팅 (배너, 팝업, 공지)
router.get('/banners/:bannerKey', marketingController.getPublicBanner);
router.post('/banners/:bannerKey/click', marketingController.trackPublicBannerClick);
router.get('/popups/main', marketingController.getPublicMainPopup);
router.post('/popups/slides/:slideId/click', marketingController.trackPublicPopupSlideClick);
router.get('/notices', marketingController.getPublicNotices);
router.get('/notices/:noticeId', marketingController.getPublicNoticeDetail);

export default router;

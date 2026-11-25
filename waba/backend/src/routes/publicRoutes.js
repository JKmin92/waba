import express from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import * as userController from '../controller/userController.js';
import * as analyticsController from '../controller/analyticsController.js';

const router = express.Router();

// 공개 케어 저니 조회 (인증 불필요)
router.get('/journey/:slug', userController.getPublicJourneyBySlug);

// 방문자/페이지 통계 및 공유 단축 URL
router.post('/track/visit', optionalAuth, analyticsController.trackVisit);
router.post('/short-links', optionalAuth, analyticsController.createShortLink);
router.get('/short-links/:code/resolve', analyticsController.resolveShortLink);

export default router;

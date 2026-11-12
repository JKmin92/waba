import express from 'express';
import * as userController from '../controller/userController.js';

const router = express.Router();

// 공개 케어 저니 조회 (인증 불필요)
router.get('/journey/:slug', userController.getPublicJourneyBySlug);

export default router;

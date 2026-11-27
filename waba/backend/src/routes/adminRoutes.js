import express from 'express';
import { verifyToken, verifyAdmin, verifySuperAdmin } from '../middleware/authMiddleware.js';
import * as adminController from '../controller/adminController.js';
import * as marketingController from '../controller/marketingController.js';
import { uploadMarketingImage } from '../../utils/imageUtils.js';

const router = express.Router();

router.get('/me', verifyToken, verifyAdmin, adminController.getMe);
router.get('/dashboard', verifyToken, verifyAdmin, adminController.getDashboard);
router.get('/posts', verifyToken, verifyAdmin, adminController.getPosts);
router.get('/posts/:postId/detail', verifyToken, verifyAdmin, adminController.getPostDetail);
router.patch('/posts/:postId/curation', verifyToken, verifyAdmin, adminController.togglePostCuration);
router.patch('/posts/:postId/status', verifyToken, verifyAdmin, adminController.updatePostStatus);
router.patch('/posts/:postId/extend-purge', verifyToken, verifyAdmin, adminController.extendPostPurge);
router.patch('/posts/:postId/restore', verifyToken, verifyAdmin, adminController.restorePost);
router.patch('/posts/:postId/appeal/reject', verifyToken, verifyAdmin, adminController.rejectPostAppeal);
router.patch('/post-images/:imageId/sensitive', verifyToken, verifyAdmin, adminController.togglePostImageSensitive);

router.get('/comments', verifyToken, verifyAdmin, adminController.getComments);
router.patch('/comments/:commentId/status', verifyToken, verifyAdmin, adminController.updateCommentStatus);

router.get('/histories', verifyToken, verifyAdmin, adminController.getHistories);
router.get('/histories/:historyId', verifyToken, verifyAdmin, adminController.getHistoryDetail);
router.patch('/histories/:historyId/visibility', verifyToken, verifyAdmin, adminController.updateHistoryVisibility);
router.get('/notebooks', verifyToken, verifyAdmin, adminController.getNotebooks);
router.get('/notebooks/:journeyId', verifyToken, verifyAdmin, adminController.getNotebookDetail);
router.patch('/notebooks/:journeyId/share-scope', verifyToken, verifyAdmin, adminController.updateNotebookShareScope);

router.get('/boards', verifyToken, verifyAdmin, adminController.getBoards);
router.post('/boards', verifyToken, verifyAdmin, adminController.createBoard);
router.patch('/boards/reorder', verifyToken, verifyAdmin, adminController.reorderBoards);
router.patch('/boards/:boardId', verifyToken, verifyAdmin, adminController.updateBoard);
router.delete('/boards/:boardId', verifyToken, verifyAdmin, adminController.deleteBoard);

router.get('/affiliate-domains', verifyToken, verifyAdmin, adminController.getAffiliateDomains);
router.post('/affiliate-domains/test-url', verifyToken, verifyAdmin, adminController.testAffiliateUrl);
router.post('/affiliate-domains', verifyToken, verifyAdmin, adminController.createAffiliateDomain);
router.patch('/affiliate-domains/:domainId', verifyToken, verifyAdmin, adminController.updateAffiliateDomain);
router.delete('/affiliate-domains/:domainId', verifyToken, verifyAdmin, adminController.deleteAffiliateDomain);

router.get('/reports', verifyToken, verifyAdmin, adminController.getReports);
router.patch('/reports/:reportId/handle', verifyToken, verifyAdmin, adminController.handleReport);
router.get('/posts/:postId/moderation-detail', verifyToken, verifyAdmin, adminController.getPostModerationDetail);
router.patch('/posts/:postId/reports/handle', verifyToken, verifyAdmin, adminController.handlePostReports);
router.patch('/appeals/:appealId/note', verifyToken, verifyAdmin, adminController.updateAppealNote);

router.get('/users', verifyToken, verifyAdmin, adminController.getUsers);
router.get('/users/:userId', verifyToken, verifyAdmin, adminController.getUserDetail);
router.patch('/users/:userId', verifyToken, verifyAdmin, adminController.updateUser);
router.patch('/pets/:petId/status', verifyToken, verifyAdmin, adminController.updatePetStatus);

// 마케팅 (공지/이벤트, 배너, 팝업)
router.post('/marketing/upload-image', verifyToken, verifyAdmin, uploadMarketingImage, marketingController.uploadMarketingImage);
router.get('/marketing/summary', verifyToken, verifyAdmin, marketingController.getMarketingSummary);

router.get('/notices', verifyToken, verifyAdmin, marketingController.getNotices);
router.get('/notices/:noticeId', verifyToken, verifyAdmin, marketingController.getNoticeDetail);
router.post('/notices', verifyToken, verifyAdmin, marketingController.createNotice);
router.patch('/notices/:noticeId', verifyToken, verifyAdmin, marketingController.updateNotice);
router.delete('/notices/:noticeId', verifyToken, verifyAdmin, marketingController.deleteNotice);

router.get('/banners', verifyToken, verifyAdmin, marketingController.getBanners);
router.get('/banners/:bannerId', verifyToken, verifyAdmin, marketingController.getBannerDetail);
router.post('/banners', verifyToken, verifyAdmin, marketingController.createBanner);
router.patch('/banners/:bannerId', verifyToken, verifyAdmin, marketingController.updateBanner);
router.delete('/banners/:bannerId', verifyToken, verifyAdmin, marketingController.deleteBanner);

router.get('/popups', verifyToken, verifyAdmin, marketingController.getPopups);
router.patch('/popups/settings', verifyToken, verifyAdmin, marketingController.updatePopupSettings);
router.patch('/popups/slides/reorder', verifyToken, verifyAdmin, marketingController.reorderPopupSlides);
router.get('/popups/slides/:slideId', verifyToken, verifyAdmin, marketingController.getPopupSlideDetail);
router.post('/popups/slides', verifyToken, verifyAdmin, marketingController.createPopupSlide);
router.patch('/popups/slides/:slideId', verifyToken, verifyAdmin, marketingController.updatePopupSlide);
router.delete('/popups/slides/:slideId', verifyToken, verifyAdmin, marketingController.deletePopupSlide);

// 감사 로그
router.get('/audit-logs/export', verifyToken, verifyAdmin, verifySuperAdmin, adminController.exportAuditLogsCsv);
router.get('/audit-logs', verifyToken, verifyAdmin, verifySuperAdmin, adminController.getAuditLogs);

// 관리자 계정 관리 (슈퍼 관리자 전용)
router.get('/admins/candidates', verifyToken, verifyAdmin, verifySuperAdmin, adminController.searchAdminCandidates);
router.get('/admins', verifyToken, verifyAdmin, verifySuperAdmin, adminController.getAdminAccounts);
router.post('/admins', verifyToken, verifyAdmin, verifySuperAdmin, adminController.promoteAdminAccount);
router.patch('/admins/:userId', verifyToken, verifyAdmin, verifySuperAdmin, adminController.updateAdminAccount);
router.delete('/admins/:userId', verifyToken, verifyAdmin, verifySuperAdmin, adminController.revokeAdminAccount);

export default router;

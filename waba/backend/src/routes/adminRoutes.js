import express from 'express';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';
import * as adminController from '../controller/adminController.js';

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

export default router;

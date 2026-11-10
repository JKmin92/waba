import express from 'express';
import * as postController from '../controller/postController.js';
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js';
import { uploadPostImages } from '../../utils/imageUtils.js';

const router = express.Router();

router.get('/main', postController.getMainPostList);
router.get('/boards', postController.getBoardList);
router.post('/parse-url', postController.parseUrlMetadata);
router.get('/draft', verifyToken, postController.getUserDraft);
router.post('/draft', verifyToken, uploadPostImages, postController.saveDraft);
router.delete('/draft/:postId', verifyToken, postController.deleteDraft);
router.delete('/draft', verifyToken, postController.deleteDraft);
router.get('/board/:boardId', postController.getPostList);
router.get('/:id', optionalAuth, postController.getPostDetail);
router.post('/', verifyToken, uploadPostImages, postController.createPost);
router.delete('/:id', verifyToken, postController.deletePost);
router.post('/:id/like', verifyToken, postController.togglePostLike);
router.post('/:id/bookmark', verifyToken, postController.togglePostBookmark);
router.post('/:id/comment', verifyToken, postController.createComment);
router.delete('/comment/:commentId', verifyToken, postController.deleteComment);

export default router;

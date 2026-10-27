import express from 'express';
import * as postController from '../controller/postController.js';

const router = express.Router();

router.get('/main', postController.getMainPostList);
router.get('/boards', postController.getBoardList);
router.get('/board/:boardId', postController.getPostList);
router.get('/:id', postController.getPostDetail);

export default router;

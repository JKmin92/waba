import express from 'express';
import * as notebookController from '../controller/notebookController.js';
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', optionalAuth, notebookController.getNotebooks);
router.get('/:idOrSlug', optionalAuth, notebookController.getNotebookDetail);
router.post('/:id/scrap', verifyToken, notebookController.toggleNotebookScrap);
router.patch('/:id/status', verifyToken, notebookController.updateNotebookStatus);
router.post('/:id/comments', verifyToken, notebookController.createNotebookComment);
router.delete('/:id/comments/:commentId', verifyToken, notebookController.deleteNotebookComment);
router.post('/:id/histories', verifyToken, notebookController.createNotebookHistory);

export default router;

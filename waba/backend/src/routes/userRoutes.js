import express from 'express';
import * as userController from '../controller/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/join', userController.joinUser);
router.post('/login', userController.loginUser);
router.get('/checkNickname', userController.checkNickname);
router.get('/checkEmail', userController.checkEmail);
router.get('/pets', verifyToken, userController.getUserPets);

export default router;

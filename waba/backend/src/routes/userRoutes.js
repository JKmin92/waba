import express from 'express';
import * as userController from '../controller/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { uploadProfileImage, uploadPetAvatar } from '../../utils/imageUtils.js';

const router = express.Router();

router.post('/join', userController.joinUser);
router.post('/login', userController.loginUser);
router.post('/refresh', userController.refreshToken);
router.get('/checkNickname', userController.checkNickname);
router.get('/checkEmail', userController.checkEmail);
router.get('/pets', verifyToken, userController.getUserPets);
router.post('/pets', verifyToken, uploadPetAvatar, userController.createUserPet);
router.put('/pets/:petId', verifyToken, uploadPetAvatar, userController.updateUserPet);
router.delete('/pets/:petId', verifyToken, userController.deleteUserPet);
router.get('/profile', verifyToken, userController.getUserProfile);
router.put('/profile', verifyToken, uploadProfileImage, userController.updateUserProfile);

export default router;

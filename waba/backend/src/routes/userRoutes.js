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
router.post('/pets/:petId/restore', verifyToken, userController.restoreUserPet);

// 통합 마이페이지 건강 수첩 히스토리 (다중 반려동물 지원)
router.get('/histories', verifyToken, userController.getUserHistories);
router.post('/histories', verifyToken, userController.createUserHistory);
router.put('/histories/:historyId', verifyToken, userController.updateUserHistory);
router.delete('/histories/:historyId', verifyToken, userController.deleteUserHistory);

// 펫 라이프 & 메디컬 히스토리 수첩
router.get('/pets/:petId/histories', verifyToken, userController.getPetHistories);
router.post('/pets/:petId/histories', verifyToken, userController.createPetHistory);
router.put('/pets/:petId/histories/:historyId', verifyToken, userController.updatePetHistory);
router.delete('/pets/:petId/histories/:historyId', verifyToken, userController.deletePetHistory);

// 케어 저니 (치료기 그룹)
router.get('/pets/:petId/journeys', verifyToken, userController.getPetJourneys);
router.post('/pets/:petId/journeys', verifyToken, userController.createPetJourney);
router.put('/pets/:petId/journeys/:journeyId', verifyToken, userController.updatePetJourney);
router.delete('/pets/:petId/journeys/:journeyId', verifyToken, userController.deletePetJourney);

// 유저 작성 글 간편 목록 (기록-게시글 연결 모달용)
router.get('/my-posts-simple', verifyToken, userController.getUserSimplePosts);

// AI 스마트 건강 수첩 자동 추출
router.post('/ai/extract-health-event', verifyToken, userController.extractHealthEvent);

// 사용자 AI 자동 기록 전역 설정(ON/OFF)
router.get('/settings/auto-journal', verifyToken, userController.getAutoJournalSetting);
router.patch('/settings/auto-journal', verifyToken, userController.updateAutoJournalSetting);

router.get('/profile', verifyToken, userController.getUserProfile);
router.put('/profile', verifyToken, uploadProfileImage, userController.updateUserProfile);

export default router;

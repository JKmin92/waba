import * as userService from '../service/userService.js';

export const checkNickname = async (req, res, next) => {
    try {
        const nickname = req.query.nickname;
        if (!nickname) {
            return res.status(400).json({ message: '닉네임을 입력해주세요.' });
        }
        const count = await userService.checkNickname(nickname);
        const isAvailable = count === 0;
        return res.status(200).json({ isAvailable, count });
    } catch (e) {
        next(e);
    }
};

export const checkEmail = async (req, res, next) => {
    try {
        const email = req.query.email;
        if (!email) {
            return res.status(400).json({ message: '이메일을 입력해주세요.' });
        }
        const exists = await userService.checkEmail(email);
        return res.status(200).json({ isAvailable: !exists });
    } catch (e) {
        next(e);
    }
};

export const joinUser = async (req, res, next) => {
    try {
        const data = req.body;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const result = await userService.joinUser(data, clientIp);
        return res.status(201).json(result);
    } catch (e) {
        if (e.message === 'ALREADY_EXIST_EMAIL') {
            return res.status(409).json({ message: '이미 가입된 이메일 계정입니다.' });
        }
        if (e.message === 'ALREADY_EXIST_NICKNAME') {
            return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
        }
        next(e);
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const { email, password, keepLogin } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: '이메일과 비밀번호를 모두 입력해주세요.' });
        }
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const result = await userService.loginUser({ email, password, keepLogin }, clientIp);
        return res.status(200).json(result);
    } catch (e) {
        if (e.message === 'INVALID_CREDENTIALS') {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }
        if (e.message === 'ACCOUNT_SUSPENDED') {
            return res.status(403).json({ message: '이용이 정지된 계정입니다. 고객센터에 문의해주세요.' });
        }
        next(e);
    }
};

export const refreshToken = async (req, res, next) => {
    try {
        const result = await userService.refreshAccessToken(req.body?.refreshToken);
        return res.status(200).json(result);
    } catch (e) {
        if (e.message === 'INVALID_REFRESH_TOKEN') {
            return res.status(401).json({ message: '로그인이 만료되었습니다. 다시 로그인해주세요.' });
        }
        next(e);
    }
};

export const getUserPets = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요한 서비스입니다.' });
        }
        const pets = await userService.getUserPets(userId);
        return res.status(200).json({ success: true, pets });
    } catch (e) {
        next(e);
    }
};

export const getUserProfile = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요한 서비스입니다.' });
        }
        const profile = await userService.getUserProfile(userId);
        if (!profile) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
        return res.status(200).json({ success: true, profile });
    } catch (e) {
        next(e);
    }
};

export const updateUserProfile = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요한 서비스입니다.' });
        }
        const file = req.file || null;
        const result = await userService.updateUserProfile(userId, req.body, file);
        return res.status(200).json({ success: true, ...result });
    } catch (e) {
        if (e.message === 'ALREADY_EXIST_NICKNAME') {
            return res.status(409).json({ success: false, message: '이미 사용 중인 닉네임입니다.' });
        }
        if (e.message && e.message.includes('최소 가로 150px')) {
            return res.status(400).json({ success: false, message: e.message });
        }
        next(e);
    }
};


export const createUserPet = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요한 서비스입니다.' });
        }
        const file = req.file || null;
        const petData = {
            ...req.body,
            custom_species: req.body.custom_species
        };
        const result = await userService.createUserPet(userId, petData, file);
        return res.status(201).json({
            success: true,
            message: '반려동물이 성공적으로 등록되었습니다.',
            ...result
        });
    } catch (e) {
        if (e.message === 'PET_NAME_REQUIRED') {
            return res.status(400).json({ success: false, message: '반려동물 이름을 입력해주세요.' });
        }
        if (e.message === 'PET_BREED_REQUIRED') {
            return res.status(400).json({ success: false, message: '세부 품종을 입력해주세요.' });
        }
        if (e.message && e.message.includes('최소 가로 150px')) {
            return res.status(400).json({ success: false, message: e.message });
        }
        next(e);
    }
};


export const updateUserPet = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요한 서비스입니다.' });
        }
        const { petId } = req.params;
        const file = req.file || null;
        const petData = {
            ...req.body,
            custom_species: req.body.custom_species
        };
        const result = await userService.updateUserPet(userId, petId, petData, file);
        return res.status(200).json({
            success: true,
            message: '반려동물 정보가 수정되었습니다.',
            ...result
        });
    } catch (e) {
        if (e.message === 'PET_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '반려동물 정보를 찾을 수 없습니다.' });
        }
        if (e.message === 'PET_NAME_REQUIRED') {
            return res.status(400).json({ success: false, message: '반려동물 이름을 입력해주세요.' });
        }
        if (e.message === 'PET_BREED_REQUIRED') {
            return res.status(400).json({ success: false, message: '세부 품종을 입력해주세요.' });
        }
        if (e.message && e.message.includes('최소 가로 150px')) {
            return res.status(400).json({ success: false, message: e.message });
        }
        next(e);
    }
};

export const deleteUserPet = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요한 서비스입니다.' });
        }
        const { petId } = req.params;
        const result = await userService.deleteUserPet(userId, petId);
        return res.status(200).json({
            success: true,
            message: '반려동물 프로필이 삭제되었습니다.',
            ...result
        });
    } catch (e) {
        if (e.message === 'PET_NOT_FOUND') {
            return res.status(404).json({ success: false, message: '반려동물 정보를 찾을 수 없습니다.' });
        }
        next(e);
    }
};

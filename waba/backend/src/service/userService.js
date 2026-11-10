import * as userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateUserId, generateIdentityId } from '../../utils/simpleUtils.js';

export const checkNickname = async (nickname) => {
    return await userModel.checkNickname(nickname);
};

export const checkEmail = async (email) => {
    return await userModel.checkEmail(email);
};

export const joinUser = async (userData, clientIp = null) => {
    const { email, password, nickname, agreeMarketing } = userData;

    // 1. 이메일 중복 체크
    const emailExists = await userModel.checkEmail(email);
    if (emailExists) {
        const error = new Error('ALREADY_EXIST_EMAIL');
        error.status = 409;
        throw error;
    }

    // 2. 닉네임 중복 체크
    const nicknameCount = await userModel.checkNickname(nickname);
    if (nicknameCount > 0) {
        const error = new Error('ALREADY_EXIST_NICKNAME');
        error.status = 409;
        throw error;
    }

    // 3. 비밀번호 단방향 암호화
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. 고유 ID 생성 규칙 적용
    const userId = generateUserId(email);
    const identityId = generateIdentityId();

    // 5. 가입 즉시 자동 로그인을 위한 JWT 토큰 발급
    const refreshToken = jwt.sign(
        { userId, email },
        process.env.REFRESH_TOKEN_SECRET || 'wabami_refresh_key',
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
    );
    const accessToken = jwt.sign(
        { userId, email, nickname, role: 'USER' },
        process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
    );

    // 6. Model을 통한 순차 INSERT
    await userModel.insertUser({
        id: userId,
        email,
        nickname,
        role: 'USER',
        mentor_badge: 'NONE',
        reward_points: 0,
        refresh_token: refreshToken,
        last_ip: clientIp,
        terms_agreed: 1,
        marketing_agreed: agreeMarketing ? 1 : 0,
        status: 'ACTIVE'
    });

    await userModel.insertUserIdentity({
        id: identityId,
        user_id: userId,
        provider: 'LOCAL',
        provider_uid: email,
        password_hash: passwordHash,
        provider_email: email
    });

    // 7. 클라이언트에 로그인 세션 유지용 데이터 반환
    return {
        user: {
            id: userId,
            email,
            nickname,
            role: 'USER',
            mentor_badge: 'NONE',
            profile_image_url: null,
            reward_points: 0,
            // 하위 호환용 카멜케이스 병행
            mentorBadge: 'NONE',
            profileImageUrl: null,
            rewardPoints: 0
        },
        accessToken,
        refreshToken
    };
};

export const loginUser = async ({ email, password, keepLogin }, clientIp = null) => {
    // 1. 유저 계정 조회
    const user = await userModel.findUserByIdentity(email, 'LOCAL');
    if (!user) {
        const error = new Error('INVALID_CREDENTIALS');
        error.status = 401;
        throw error;
    }

    // 2. 비밀번호 검증 (단방향 해시 대조)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        const error = new Error('INVALID_CREDENTIALS');
        error.status = 401;
        throw error;
    }

    // 3. 계정 정지 여부 체크
    if (user.status !== 'ACTIVE') {
        const error = new Error('ACCOUNT_SUSPENDED');
        error.status = 403;
        throw error;
    }

    // 4. JWT 토큰 발급 (로그인 상태 유지 체크 시 30일, 기본은 7일)
    const refreshExpire = keepLogin ? '30d' : (process.env.REFRESH_TOKEN_EXPIRE || '7d');
    const refreshToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.REFRESH_TOKEN_SECRET || 'wabami_refresh_key',
        { expiresIn: refreshExpire }
    );
    const accessToken = jwt.sign(
        { userId: user.id, email: user.email, nickname: user.nickname, role: user.role },
        process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
    );

    // 5. DB에 로그인 일시 & refreshToken 갱신
    await userModel.updateLastLogin(user.id, refreshToken, clientIp);

    return {
        user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            role: user.role,
            mentor_badge: user.mentor_badge,
            profile_image_url: user.profile_image_url,
            reward_points: user.reward_points,
            // 하위 호환용 카멜케이스 병행
            mentorBadge: user.mentor_badge,
            profileImageUrl: user.profile_image_url,
            rewardPoints: user.reward_points
        },
        accessToken,
        refreshToken
    };
};

export const getUserPets = async (userId) => {
    return await userModel.getUserPets(userId);
};

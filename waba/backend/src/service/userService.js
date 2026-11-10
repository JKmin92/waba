import * as userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateUserId, generateIdentityId, generatePetId } from '../../utils/simpleUtils.js';
import { processAndSaveProfileImage, deleteProfileImageFile, processAndSavePetAvatar } from '../../utils/imageUtils.js';

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

// Refresh Token 검증 후 새 Access Token 발급
export const refreshAccessToken = async (refreshToken) => {
    const invalid = () => {
        const error = new Error('INVALID_REFRESH_TOKEN');
        error.status = 401;
        return error;
    };

    if (!refreshToken || typeof refreshToken !== 'string') throw invalid();

    let decoded;
    try {
        decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET || 'wabami_refresh_key'
        );
    } catch {
        throw invalid();
    }

    const user = await userModel.findUserForRefresh(decoded.userId);
    // DB에 저장된 최신 refresh token과 일치해야 함 (다른 기기 로그인/로그아웃 시 무효화)
    if (!user || user.status !== 'ACTIVE' || user.refresh_token !== refreshToken) {
        throw invalid();
    }

    const accessToken = jwt.sign(
        { userId: user.id, email: user.email, nickname: user.nickname, role: user.role },
        process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
    );

    return { accessToken };
};

export const getUserPets = async (userId) => {
    return await userModel.getUserPets(userId);
};

export const getUserProfile = async (userId) => {
    return await userModel.getUserProfile(userId);
};

export const updateUserProfile = async (userId, data, file = null) => {
    const { nickname, bio, reset_profile_image, is_multi_species } = data;

    // 현재 사용자 정보 확인
    const currentProfile = await userModel.getUserProfile(userId);
    if (!currentProfile) {
        const error = new Error('USER_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const updates = {};

    // 닉네임 변경 시 중복 체크
    if (nickname && nickname.trim() !== currentProfile.nickname) {
        const trimmedNickname = nickname.trim();
        const count = await userModel.checkNickname(trimmedNickname);
        if (count > 0) {
            const error = new Error('ALREADY_EXIST_NICKNAME');
            error.status = 409;
            throw error;
        }
        updates.nickname = trimmedNickname;
    }

    if (bio !== undefined) {
        updates.bio = bio ? bio.trim() : '';
    }

    if (is_multi_species !== undefined) {
        updates.is_multi_species = is_multi_species === 'true' || is_multi_species === true || is_multi_species === 1;
    }

    // 프로필 이미지 처리 및 이전 파일 디스크 정리
    const oldImageUrl = currentProfile.profile_image_url;

    if (file) {
        const imageUrl = await processAndSaveProfileImage(userId, file);
        if (imageUrl) {
            updates.profile_image_url = imageUrl;
            // 새 프로필 이미지가 성공적으로 저장되었으면 기존 이미지 삭제
            if (oldImageUrl && oldImageUrl !== imageUrl) {
                await deleteProfileImageFile(oldImageUrl);
            }
        }
    } else if (reset_profile_image === 'true' || reset_profile_image === true) {
        updates.profile_image_url = null;
        // 기본 이미지로 리셋 시 기존 커스텀 이미지 파일 삭제
        if (oldImageUrl) {
            await deleteProfileImageFile(oldImageUrl);
        }
    }

    await userModel.updateUserProfile(userId, updates);

    // 갱신된 프로필 재조회
    const updatedProfile = await userModel.getUserProfile(userId);

    // 새 accessToken 발급 (닉네임 등 갱신)
    const accessToken = jwt.sign(
        {
            userId: updatedProfile.id,
            email: updatedProfile.email,
            nickname: updatedProfile.nickname,
            role: updatedProfile.role
        },
        process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
    );

    return {
        profile: updatedProfile,
        accessToken
    };
};


export const createUserPet = async (userId, data, file = null) => {
    const {
        name,
        species = 'CAT',
        custom_species,
        breed,
        birth_date,
        gender = 'UNKNOWN',
        is_neutered,
        latest_weight_kg,
        latest_body_length_cm,
        is_primary,
        ai_private_data_consent
    } = data;

    const trimmedName = String(name || '').trim();
    const trimmedBreed = String(breed || '').trim();
    const trimmedCustomSpecies = custom_species ? String(custom_species).trim() : null;

    if (!trimmedName) {
        const error = new Error('PET_NAME_REQUIRED');
        error.status = 400;
        throw error;
    }
    if (!trimmedBreed) {
        const error = new Error('PET_BREED_REQUIRED');
        error.status = 400;
        throw error;
    }

    const allowedSpecies = ['DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEAPIG', 'CHINCHILA', 'OTHER'];
    const finalSpecies = allowedSpecies.includes(species) ? species : 'OTHER';

    const allowedGender = ['MALE', 'FEMALE', 'UNKNOWN'];
    const finalGender = allowedGender.includes(gender) ? gender : 'UNKNOWN';

    const petId = generatePetId();

    let avatarUrl = null;
    if (file) {
        avatarUrl = await processAndSavePetAvatar(userId, petId, file);
    }

    const parsedWeight = latest_weight_kg !== undefined && latest_weight_kg !== '' && !isNaN(Number(latest_weight_kg))
        ? Number(latest_weight_kg)
        : null;
    const parsedLength = latest_body_length_cm !== undefined && latest_body_length_cm !== '' && !isNaN(Number(latest_body_length_cm))
        ? Number(latest_body_length_cm)
        : null;

    return await userModel.createUserPet(userId, {
        id: petId,
        name: trimmedName,
        species: finalSpecies,
        custom_species: finalSpecies === 'OTHER' ? trimmedCustomSpecies : null,
        breed: trimmedBreed,
        birth_date: birth_date && String(birth_date).trim() ? String(birth_date).trim() : null,
        gender: finalGender,
        is_neutered: is_neutered === 'true' || is_neutered === true || is_neutered === 1 || is_neutered === '1',
        latest_weight_kg: parsedWeight,
        latest_body_length_cm: parsedLength,
        current_avatar_url: avatarUrl,
        is_primary: is_primary === 'true' || is_primary === true || is_primary === 1 || is_primary === '1',
        ai_private_data_consent: ai_private_data_consent === 'true' || ai_private_data_consent === true || ai_private_data_consent === 1 || ai_private_data_consent === '1'
    });
};


export const updateUserPet = async (userId, petId, data, file = null) => {
    const existingPet = await userModel.getUserPetById(userId, petId);
    if (!existingPet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const {
        name,
        species = existingPet.species,
        custom_species,
        breed,
        birth_date,
        gender = existingPet.gender,
        is_neutered,
        latest_weight_kg,
        latest_body_length_cm,
        is_primary,
        ai_private_data_consent,
        reset_avatar
    } = data;

    const trimmedName = String(name ?? existingPet.name ?? '').trim();
    const trimmedBreed = String(breed ?? existingPet.breed ?? '').trim();

    if (!trimmedName) {
        const error = new Error('PET_NAME_REQUIRED');
        error.status = 400;
        throw error;
    }
    if (!trimmedBreed) {
        const error = new Error('PET_BREED_REQUIRED');
        error.status = 400;
        throw error;
    }

    const allowedSpecies = ['DOG', 'CAT', 'RABBIT', 'HAMSTER', 'GUINEAPIG', 'CHINCHILA', 'OTHER'];
    const finalSpecies = allowedSpecies.includes(species) ? species : existingPet.species;

    const trimmedCustomSpecies = custom_species !== undefined
        ? (custom_species ? String(custom_species).trim() : null)
        : (existingPet.custom_species || null);

    const allowedGender = ['MALE', 'FEMALE', 'UNKNOWN'];
    const finalGender = allowedGender.includes(gender) ? gender : existingPet.gender;

    let currentAvatarUrl = undefined;
    if (file) {
        currentAvatarUrl = await processAndSavePetAvatar(userId, petId, file);
        if (existingPet.current_avatar_url) {
            await deleteProfileImageFile(existingPet.current_avatar_url);
        }
    } else if (reset_avatar === 'true' || reset_avatar === true) {
        currentAvatarUrl = null;
        if (existingPet.current_avatar_url) {
            await deleteProfileImageFile(existingPet.current_avatar_url);
        }
    }

    const parsedWeight = latest_weight_kg !== undefined && latest_weight_kg !== '' && !isNaN(Number(latest_weight_kg))
        ? Number(latest_weight_kg)
        : null;
    const parsedLength = latest_body_length_cm !== undefined && latest_body_length_cm !== '' && !isNaN(Number(latest_body_length_cm))
        ? Number(latest_body_length_cm)
        : null;

    const result = await userModel.updateUserPet(userId, petId, {
        name: trimmedName,
        species: finalSpecies,
        custom_species: finalSpecies === 'OTHER' ? trimmedCustomSpecies : null,
        breed: trimmedBreed,
        birth_date: birth_date && String(birth_date).trim() ? String(birth_date).trim() : null,
        gender: finalGender,
        is_neutered: is_neutered === 'true' || is_neutered === true || is_neutered === 1 || is_neutered === '1',
        latest_weight_kg: parsedWeight,
        latest_body_length_cm: parsedLength,
        current_avatar_url: currentAvatarUrl,
        is_primary: is_primary === 'true' || is_primary === true || is_primary === 1 || is_primary === '1',
        ai_private_data_consent: ai_private_data_consent === 'true' || ai_private_data_consent === true || ai_private_data_consent === 1 || ai_private_data_consent === '1'
    });

    return {
        pet: result.pet,
        pets: result.pets,
        profile: result.profile
    };
};

export const deleteUserPet = async (userId, petId) => {
    const result = await userModel.deleteUserPet(userId, petId);
    for (const url of result.avatarUrlsToDelete || []) {
        await deleteProfileImageFile(url);
    }
    return {
        deletedPetId: result.deletedPetId,
        pets: result.pets,
        profile: result.profile
    };
};

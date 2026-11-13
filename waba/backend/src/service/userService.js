import * as userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateUserId, generateIdentityId, generatePetId } from '../../utils/simpleUtils.js';
import { processAndSaveProfileImage, deleteProfileImageFile, processAndSavePetAvatar } from '../../utils/imageUtils.js';
import { extractPetHealthEvent } from './geminiService.js';

export const checkNickname = async (nickname) => {
    return await userModel.checkNickname(nickname);
};

export const checkEmail = async (email) => {
    return await userModel.checkEmail(email);
};

export const joinUser = async (userData, clientIp = null) => {
    const { email, password, nickname, agreeMarketing } = userData;
    const normalizedEmail = String(email || '').toLowerCase().trim();

    // 1. 이메일 중복 및 연동 여부 정밀 검사
    const existingUser = await userModel.findUserByEmail(normalizedEmail);
    if (existingUser) {
        const identities = await userModel.getUserIdentitiesByUserId(existingUser.id);
        const hasLocal = identities.some(i => i.provider === 'LOCAL');
        if (hasLocal) {
            const error = new Error('ALREADY_EXIST_EMAIL');
            error.status = 409;
            throw error;
        } else {
            // 소셜 계정으로만 등록되어 있는 경우
            const error = new Error('EMAIL_REGISTERED_WITH_SOCIAL');
            error.status = 409;
            throw error;
        }
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
    const userId = generateUserId(normalizedEmail);
    const identityId = generateIdentityId();

    // 5. 가입 즉시 자동 로그인을 위한 JWT 토큰 발급
    const refreshToken = jwt.sign(
        { userId, email: normalizedEmail },
        process.env.REFRESH_TOKEN_SECRET || 'wabami_refresh_key',
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
    );
    const accessToken = jwt.sign(
        { userId, email: normalizedEmail, nickname, role: 'USER' },
        process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
    );

    // 6. Model을 통한 순차 INSERT
    await userModel.insertUser({
        id: userId,
        email: normalizedEmail,
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
        provider_uid: normalizedEmail,
        password_hash: passwordHash,
        provider_email: normalizedEmail
    });

    return {
        user: { id: userId, email: normalizedEmail, nickname, role: 'USER', mentor_badge: 'NONE', reward_points: 0 },
        accessToken,
        refreshToken
    };
};

/**
 * 소셜 로그인 / 이메일 기반 단일 계정 통합(Account Linking) 코어 로직
 * (구글, 애플, 카카오, 네이버 등 소셜 제공자 공통 처리)
 */
export const handleSocialLoginOrLink = async ({
    provider,
    providerUid,
    email,
    nickname,
    profileImageUrl = null,
    clientIp = null
}) => {
    if (!provider || !providerUid || !email) {
        const error = new Error('INVALID_SOCIAL_PARAMS');
        error.status = 400;
        throw error;
    }

    const normalizedProvider = String(provider).toUpperCase().trim();
    const normalizedEmail = String(email).toLowerCase().trim();
    const trimmedProviderUid = String(providerUid).trim();

    // 1. 이메일 기준 기존 users 조회
    const existingUser = await userModel.findUserByEmail(normalizedEmail);

    let targetUser = null;
    let isNewUser = false;

    if (existingUser) {
        // 케이스 A: 기존 유저 존재 -> 자동 계정 연동(Account Linking)
        targetUser = existingUser;
        const existingIdentity = await userModel.findUserIdentity(existingUser.id, normalizedProvider);

        if (!existingIdentity) {
            // 해당 provider의 연동 정보가 없으면 신규 identity 추가
            const identityId = generateIdentityId();
            await userModel.insertUserIdentity({
                id: identityId,
                user_id: existingUser.id,
                provider: normalizedProvider,
                provider_uid: trimmedProviderUid,
                password_hash: null,
                provider_email: normalizedEmail
            });
        }
    } else {
        // 케이스 B: 신규 유저 생성
        isNewUser = true;
        const userId = generateUserId(normalizedEmail);
        const identityId = generateIdentityId();

        // 닉네임 중복 처리: 닉네임이 없거나 이미 사용 중이면 유니크한 닉네임 자동 생성
        let finalNickname = nickname ? String(nickname).trim() : '';
        if (!finalNickname) {
            finalNickname = `집사_${Math.floor(1000 + Math.random() * 9000)}`;
        }
        const nicknameCount = await userModel.checkNickname(finalNickname);
        if (nicknameCount > 0) {
            finalNickname = `${finalNickname.slice(0, 30)}_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        await userModel.insertUser({
            id: userId,
            email: normalizedEmail,
            nickname: finalNickname,
            profile_image_url: profileImageUrl || null,
            role: 'USER',
            mentor_badge: 'NONE',
            reward_points: 0,
            refresh_token: null,
            last_ip: clientIp,
            terms_agreed: 1,
            marketing_agreed: 0,
            status: 'ACTIVE'
        });

        await userModel.insertUserIdentity({
            id: identityId,
            user_id: userId,
            provider: normalizedProvider,
            provider_uid: trimmedProviderUid,
            password_hash: null,
            provider_email: normalizedEmail
        });

        targetUser = await userModel.findUserByEmail(normalizedEmail);
    }

    // 2. JWT 토큰 발급
    const refreshToken = jwt.sign(
        { userId: targetUser.id, email: targetUser.email },
        process.env.REFRESH_TOKEN_SECRET || 'wabami_refresh_key',
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
    );
    const accessToken = jwt.sign(
        { userId: targetUser.id, email: targetUser.email, nickname: targetUser.nickname, role: targetUser.role || 'USER' },
        process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m' }
    );

    // 3. 최근 로그인 일시 및 리프레시 토큰 갱신
    await userModel.updateLastLogin(targetUser.id, refreshToken, clientIp);

    return {
        user: {
            id: targetUser.id,
            email: targetUser.email,
            nickname: targetUser.nickname,
            role: targetUser.role,
            profile_image_url: targetUser.profile_image_url
        },
        accessToken,
        refreshToken,
        isNewUser
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
        is_birth_estimated,
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
        is_birth_estimated: is_birth_estimated === 'true' || is_birth_estimated === true || is_birth_estimated === 1 || is_birth_estimated === '1',
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
        is_birth_estimated,
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
        is_birth_estimated: is_birth_estimated !== undefined
            ? (is_birth_estimated === 'true' || is_birth_estimated === true || is_birth_estimated === 1 || is_birth_estimated === '1')
            : Boolean(existingPet.is_birth_estimated),
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

export const deleteUserPet = async (userId, petId, authData = {}) => {
    const { password, confirm_name } = authData;

    // 1. 대상 펫 존재 여부 확인
    const pet = await userModel.getUserPetById(userId, petId);
    if (!pet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    // 2. 본인 인증 검증
    const passwordHash = await userModel.getUserPasswordHash(userId);
    if (passwordHash) {
        // 로컬 가입 유저: 비밀번호 검증
        if (!password) {
            const error = new Error('INVALID_PASSWORD');
            error.status = 401;
            throw error;
        }
        const isValid = await bcrypt.compare(password, passwordHash);
        if (!isValid) {
            const error = new Error('INVALID_PASSWORD');
            error.status = 401;
            throw error;
        }
    } else {
        // 소셜 로그인 유저: confirm_name === pet.name 검증
        if (!confirm_name || String(confirm_name).trim() !== String(pet.name).trim()) {
            const error = new Error('INVALID_CONFIRM_NAME');
            error.status = 400;
            throw error;
        }
    }

    // 3. 소프트 삭제 수행 (이미지 파일 삭제 및 연관 자식 데이터 하드 삭제 중단, 6개월간 보존)
    const result = await userModel.softDeleteUserPet(userId, petId);

    return {
        message: '반려동물이 삭제되었습니다. 6개월(180일) 동안 데이터가 안전하게 보관되며 언제든지 복구할 수 있습니다.',
        retention_days: 180,
        deletedPetId: result.deletedPetId,
        pets: result.pets,
        profile: result.profile
    };
};

export const restoreUserPet = async (userId, petId) => {
    const result = await userModel.restoreUserPet(userId, petId);
    return {
        message: '반려동물이 성공적으로 복구되었습니다.',
        pet: result.pet,
        pets: result.pets,
        profile: result.profile
    };
};

export const getPetHistories = async (userId, petId) => {
    return await userModel.getPetHistories(userId, petId);
};

export const createPetHistory = async (userId, petId, data) => {
    const rawDate = data?.event_date || data?.date;
    const rawDescription = data?.description !== undefined ? data?.description : data?.notes;
    const { title, category, hospital_name, weight_kg, journey_id, post_ids } = data || {};
    
    if (!rawDate || !String(rawDate).trim()) {
        const error = new Error('EVENT_DATE_REQUIRED');
        error.status = 400;
        throw error;
    }

    if (!title || !String(title).trim()) {
        const error = new Error('TITLE_REQUIRED');
        error.status = 400;
        throw error;
    }

    return await userModel.createPetHistory(userId, petId, {
        event_date: String(rawDate).trim(),
        title: String(title).trim(),
        category,
        description: rawDescription ? String(rawDescription).trim() : null,
        hospital_name: hospital_name ? String(hospital_name).trim() : null,
        weight_kg,
        journey_id,
        post_ids,
        is_ai_generated: 0
    });
};

export const updatePetHistory = async (userId, petId, historyId, data) => {
    const rawDate = data?.event_date !== undefined ? data.event_date : data?.date;
    const rawDescription = data?.description !== undefined ? data.description : data?.notes;
    const { title, category, hospital_name, weight_kg, journey_id, post_ids } = data || {};
    
    if (rawDate !== undefined && (!rawDate || !String(rawDate).trim())) {
        const error = new Error('EVENT_DATE_REQUIRED');
        error.status = 400;
        throw error;
    }

    if (title !== undefined && (!title || !String(title).trim())) {
        const error = new Error('TITLE_REQUIRED');
        error.status = 400;
        throw error;
    }

    return await userModel.updatePetHistory(userId, petId, historyId, {
        event_date: rawDate ? String(rawDate).trim() : undefined,
        title: title ? String(title).trim() : undefined,
        category,
        description: rawDescription !== undefined ? (rawDescription ? String(rawDescription).trim() : null) : undefined,
        hospital_name: hospital_name !== undefined ? (hospital_name ? String(hospital_name).trim() : null) : undefined,
        weight_kg,
        journey_id,
        post_ids,
        is_ai_generated: 0
    });
};

export const deletePetHistory = async (userId, petId, historyId) => {
    return await userModel.deletePetHistory(userId, petId, historyId);
};

export const getPetJourneys = async (userId, petId) => {
    return await userModel.getPetJourneys(userId, petId);
};

export const createPetJourney = async (userId, petId, data) => {
    const { title, description, start_date, end_date, is_ongoing, share_scope } = data || {};
    if (!title || !String(title).trim()) {
        const error = new Error('TITLE_REQUIRED');
        error.status = 400;
        throw error;
    }
    // share_scope는 'LINK_ONLY', 'PUBLIC', 'PRIVATE' 지원 (기본값: 'LINK_ONLY')
    const validScope = ['LINK_ONLY', 'PUBLIC', 'PRIVATE'].includes(share_scope) ? share_scope : 'LINK_ONLY';
    return await userModel.createPetJourney(userId, petId, {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        start_date: start_date ? String(start_date).trim() : null,
        end_date: end_date ? String(end_date).trim() : null,
        is_ongoing: is_ongoing === 'true' || is_ongoing === true || is_ongoing === 1 || is_ongoing === '1',
        share_scope: validScope
    });
};

export const updatePetJourney = async (userId, petId, journeyId, data) => {
    const { title, description, start_date, end_date, is_ongoing, share_scope } = data || {};
    if (title !== undefined && (!title || !String(title).trim())) {
        const error = new Error('TITLE_REQUIRED');
        error.status = 400;
        throw error;
    }
    const validScope = share_scope !== undefined
        ? (['LINK_ONLY', 'PUBLIC', 'PRIVATE'].includes(share_scope) ? share_scope : 'LINK_ONLY')
        : undefined;

    return await userModel.updatePetJourney(userId, petId, journeyId, {
        title: title ? String(title).trim() : undefined,
        description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
        start_date: start_date !== undefined ? (start_date ? String(start_date).trim() : null) : undefined,
        end_date: end_date !== undefined ? (end_date ? String(end_date).trim() : null) : undefined,
        is_ongoing: is_ongoing !== undefined ? (is_ongoing === 'true' || is_ongoing === true || is_ongoing === 1 || is_ongoing === '1') : undefined,
        share_scope: validScope
    });
};

export const deletePetJourney = async (userId, petId, journeyId) => {
    return await userModel.deletePetJourney(userId, petId, journeyId);
};

export const getUserSimplePosts = async (userId) => {
    return await userModel.getUserSimplePosts(userId);
};

export const getPublicJourneyBySlug = async (slug) => {
    if (!slug || !String(slug).trim()) {
        const error = new Error('SLUG_REQUIRED');
        error.status = 400;
        throw error;
    }
    const data = await userModel.getPublicJourneyBySlug(String(slug).trim());
    if (!data) {
        const error = new Error('JOURNEY_NOT_FOUND');
        error.status = 404;
        throw error;
    }
    return data;
};

export const extractHealthEvent = async (userId, { title, content, pet_id } = {}) => {
    let pet = null;
    if (pet_id) {
        pet = await userModel.getUserPetById(userId, pet_id);
    }
    const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

    return await extractPetHealthEvent({
        title,
        content,
        petName: pet?.name || '',
        species: pet?.custom_species || pet?.species || '',
        todayDate
    });
};

export const getAutoJournalSetting = async (userId) => {
    return await userModel.getAutoJournalSetting(userId);
};

export const updateAutoJournalSetting = async (userId, enabled) => {
    return await userModel.updateAutoJournalSetting(userId, enabled);
};

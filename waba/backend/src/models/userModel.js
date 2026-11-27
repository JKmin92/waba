import db from '../../config/db.js';
import crypto from 'crypto';
import { generateNoteCode } from '../../utils/simpleUtils.js';
import { deleteProfileImageFile, deletePostFolder } from '../../utils/imageUtils.js';

export const checkNickname = async (nickname) => {
    const sql = `SELECT COUNT(*) AS count FROM users WHERE nickname = ?`;
    const [rows] = await db.query(sql, [nickname]);
    return rows[0].count || 0;
};

export const checkEmail = async (email) => {
    const sql = `SELECT COUNT(*) AS count FROM users WHERE email = ?`;
    const [rows] = await db.query(sql, [email]);
    return rows[0].count > 0;
};

export const insertUser = async (user) => {
    const sql = `
        INSERT INTO users (
            id, email, nickname, profile_image_url, role, mentor_badge, 
            reward_points, first_pet_reward_claimed, 
            refresh_token, last_ip, terms_agreed, marketing_agreed, status,
            last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const params = [
        user.id,
        user.email,
        user.nickname,
        user.profile_image_url || null,
        user.role || 'USER',
        user.mentor_badge || 'NONE',
        user.reward_points || 0,
        0,
        user.refresh_token,
        user.last_ip || null,
        user.terms_agreed !== undefined ? user.terms_agreed : 1,
        user.marketing_agreed !== undefined ? user.marketing_agreed : 0,
        user.status || 'ACTIVE'
    ];
    const [result] = await db.query(sql, params);
    return result.affectedRows;
};

export const insertUserIdentity = async (identity) => {
    const sql = `
        INSERT INTO user_identities (
            id, user_id, provider, provider_uid, password_hash, provider_email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const params = [
        identity.id,
        identity.user_id,
        identity.provider || 'LOCAL',
        identity.provider_uid,
        identity.password_hash || null,
        identity.provider_email || null
    ];
    const [result] = await db.query(sql, params);
    return result.affectedRows;
};

export const findUserByEmail = async (email) => {
    const sql = `
        SELECT id, email, nickname, role, mentor_badge, reward_points, status, profile_image_url, withdrawn_at, withdrawn_purged_at, created_at
        FROM users 
        WHERE email = ?
    `;
    const [rows] = await db.query(sql, [email]);
    return rows[0] || null;
};

export const getUserIdentitiesByUserId = async (userId) => {
    const sql = `
        SELECT id, user_id, provider, provider_uid, provider_email, created_at
        FROM user_identities
        WHERE user_id = ?
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
};

export const findUserIdentity = async (userId, provider) => {
    const sql = `
        SELECT id, user_id, provider, provider_uid, provider_email, created_at
        FROM user_identities
        WHERE user_id = ? AND provider = ?
    `;
    const [rows] = await db.query(sql, [userId, provider]);
    return rows[0] || null;
};

export const findUserByIdentityProviderUid = async (provider, providerUid) => {
    const sql = `
        SELECT 
            u.id, u.email, u.nickname, u.role, u.mentor_badge, 
            u.reward_points, u.status, u.profile_image_url,
            ui.provider, ui.provider_uid
        FROM users u
        JOIN user_identities ui ON u.id = ui.user_id
        WHERE ui.provider = ? AND ui.provider_uid = ?
    `;
    const [rows] = await db.query(sql, [provider, providerUid]);
    return rows[0] || null;
};

export const findUserByIdentity = async (email, provider = 'LOCAL') => {
    const sql = `
        SELECT 
            u.id, u.email, u.nickname, u.role, u.mentor_badge, 
            u.reward_points, u.status, u.profile_image_url,
            ui.password_hash, ui.provider, ui.provider_uid
        FROM users u
        JOIN user_identities ui ON u.id = ui.user_id
        WHERE ui.provider = ? AND ui.provider_uid = ?
    `;
    const [rows] = await db.query(sql, [provider, email]);
    return rows[0] || null;
};

export const findUserForRefresh = async (userId) => {
    const [rows] = await db.query(
        `SELECT id, email, nickname, role, status, refresh_token FROM users WHERE id = ?`,
        [userId]
    );
    return rows[0] || null;
};

export const updateLastLogin = async (userId, refreshToken, ip = null) => {
    const sql = `
        UPDATE users 
        SET last_login_at = NOW(), refresh_token = ?, last_ip = ?
        WHERE id = ?
    `;
    const [result] = await db.query(sql, [refreshToken, ip, userId]);
    return result.affectedRows;
};

export const getUserPets = async (userId = null) => {
    if (!userId) return [];
    const sql = `
        SELECT 
            id, user_id, name, species, custom_species, breed, 
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date, 
            is_birth_estimated,
            gender, is_neutered, latest_weight_kg, latest_body_length_cm, 
            current_avatar_url, is_primary, is_deleted, deleted_at, ai_private_data_consent, agreed_at, created_at, updated_at
        FROM pets 
        WHERE user_id = ? AND is_deleted = 0
        ORDER BY is_primary DESC, id ASC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows.map(r => ({
        ...r,
        is_birth_estimated: Boolean(r.is_birth_estimated),
        is_deleted: Boolean(r.is_deleted)
    }));
};

export const getUserPetById = async (userId, petId) => {
    const [rows] = await db.query(
        `SELECT id, user_id, name, species, custom_species, breed, 
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
            is_birth_estimated,
            gender, is_neutered, latest_weight_kg, latest_body_length_cm, 
            current_avatar_url, is_primary, is_deleted, deleted_at, ai_private_data_consent, agreed_at, created_at, updated_at
         FROM pets WHERE id = ? AND user_id = ? AND is_deleted = 0`,
        [petId, userId]
    );
    if (!rows[0]) return null;
    return {
        ...rows[0],
        is_birth_estimated: Boolean(rows[0].is_birth_estimated),
        is_deleted: Boolean(rows[0].is_deleted)
    };
};

export const getUserPetWithDeleted = async (userId, petId) => {
    const [rows] = await db.query(
        `SELECT id, user_id, name, species, custom_species, breed, 
            DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date,
            is_birth_estimated,
            gender, is_neutered, latest_weight_kg, latest_body_length_cm, 
            current_avatar_url, is_primary, is_deleted, deleted_at, ai_private_data_consent, agreed_at, created_at, updated_at
         FROM pets WHERE id = ? AND user_id = ?`,
        [petId, userId]
    );
    if (!rows[0]) return null;
    return {
        ...rows[0],
        is_birth_estimated: Boolean(rows[0].is_birth_estimated),
        is_deleted: Boolean(rows[0].is_deleted)
    };
};

export const getUserPasswordHash = async (userId) => {
    const [rows] = await db.query(
        `SELECT password_hash FROM user_identities WHERE user_id = ? AND provider = 'LOCAL' LIMIT 1`,
        [userId]
    );
    return rows[0]?.password_hash || null;
};

export const getUserProfile = async (userId) => {
    const userSql = `
        SELECT 
            u.id, u.email, u.nickname, u.profile_image_url, u.bio,
            u.role, u.mentor_badge, u.vet_license_info, u.is_multi_species,
            u.auto_journal_enabled,
            u.reward_points, u.first_pet_reward_claimed, u.status, u.created_at,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND status = 'PUBLISHED') AS post_count,
            (SELECT COUNT(*) FROM post_interactions WHERE user_id = u.id AND interaction_type = 'BOOKMARK') AS bookmark_count,
            (SELECT COUNT(*) FROM post_interactions WHERE user_id = u.id AND interaction_type = 'LIKE') AS like_count,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND status = 'DRAFT') AS draft_count,
            EXISTS(
                SELECT 1 FROM user_identities ui
                WHERE ui.user_id = u.id AND ui.provider = 'LOCAL' AND ui.password_hash IS NOT NULL
            ) AS has_local_password
        FROM users u
        WHERE u.id = ?
    `;
    const [rows] = await db.query(userSql, [userId]);
    if (!rows || rows.length === 0) return null;

    const pets = await getUserPets(userId);
    const [identityRows] = await db.query(
        `SELECT provider, provider_email, created_at
         FROM user_identities
         WHERE user_id = ?
         ORDER BY created_at ASC`,
        [userId]
    );
    const identities = identityRows.map((row) => ({
        provider: String(row.provider || '').toUpperCase(),
        provider_email: row.provider_email || null,
        created_at: row.created_at || null
    }));
    const hasLocalPassword = Boolean(rows[0].has_local_password);
    const primaryProvider = identities[0]?.provider || (hasLocalPassword ? 'LOCAL' : null);

    return {
        ...rows[0],
        auto_journal_enabled: Boolean(rows[0].auto_journal_enabled),
        has_local_password: hasLocalPassword,
        identities,
        primary_provider: primaryProvider,
        pets
    };
};

export const updateLocalPasswordHash = async (userId, passwordHash) => {
    const [result] = await db.query(
        `UPDATE user_identities SET password_hash = ? WHERE user_id = ? AND provider = 'LOCAL'`,
        [passwordHash, userId]
    );
    return result.affectedRows;
};

export const getAutoJournalSetting = async (userId) => {
    const [rows] = await db.query(
        `SELECT auto_journal_enabled FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );
    if (!rows[0]) return false;
    return Boolean(rows[0].auto_journal_enabled);
};

export const updateAutoJournalSetting = async (userId, enabled) => {
    const val = enabled === true || enabled === 1 || enabled === '1' || enabled === 'true' ? 1 : 0;
    await db.query(
        `UPDATE users SET auto_journal_enabled = ?, updated_at = NOW() WHERE id = ?`,
        [val, userId]
    );
    return Boolean(val);
};

export const updateUserProfile = async (userId, { nickname, bio, profile_image_url, is_multi_species }) => {
    const fields = [];
    const params = [];

    if (nickname !== undefined) {
        fields.push('nickname = ?');
        params.push(nickname);
    }
    if (bio !== undefined) {
        fields.push('bio = ?');
        params.push(bio);
    }
    if (profile_image_url !== undefined) {
        fields.push('profile_image_url = ?');
        params.push(profile_image_url);
    }
    if (is_multi_species !== undefined) {
        fields.push('is_multi_species = ?');
        params.push(is_multi_species ? 1 : 0);
    }

    if (fields.length === 0) return 0;

    params.push(userId);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await db.query(sql, params);
    return result.affectedRows;
};


export const createUserPet = async (userId, petData) => {
    const {
        id,
        name,
        species,
        custom_species = null,
        breed,
        birth_date = null,
        is_birth_estimated = 0,
        gender = 'UNKNOWN',
        is_neutered = 0,
        latest_weight_kg = null,
        latest_body_length_cm = null,
        current_avatar_url = null,
        is_primary = 0,
        ai_private_data_consent = 0
    } = petData;

    const existingPets = await getUserPets(userId);
    const shouldBePrimary = existingPets.length === 0 ? 1 : (is_primary ? 1 : 0);

    if (shouldBePrimary === 1 && existingPets.length > 0) {
        await db.query(`UPDATE pets SET is_primary = 0 WHERE user_id = ?`, [userId]);
    }

    const agreedAt = ai_private_data_consent ? new Date() : null;
    const finalCustomSpecies = species === 'OTHER' ? (custom_species || null) : null;

    await db.query(
        `INSERT INTO pets (
            id, user_id, name, species, custom_species, breed, birth_date, is_birth_estimated, gender, is_neutered,
            latest_weight_kg, latest_body_length_cm, current_avatar_url,
            is_primary, ai_private_data_consent, agreed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
            id,
            userId,
            name,
            species,
            finalCustomSpecies,
            breed,
            birth_date || null,
            is_birth_estimated ? 1 : 0,
            gender,
            is_neutered ? 1 : 0,
            latest_weight_kg,
            latest_body_length_cm,
            current_avatar_url,
            shouldBePrimary,
            ai_private_data_consent ? 1 : 0,
            agreedAt
        ]
    );

    // 생년월일 기준 개월 수 계산
    let ageYears = null;
    let ageMonths = null;
    let totalMonths = null;
    if (birth_date) {
        const birth = new Date(birth_date);
        const now = new Date();
        if (!isNaN(birth.getTime())) {
            totalMonths = Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()));
            ageYears = Math.floor(totalMonths / 12);
            ageMonths = totalMonths % 12;
        }
    }

    // 아바타 앨범(pet_avatars) 초기 등록
    if (current_avatar_url) {
        const ageLabel = totalMonths !== null
            ? (ageYears > 0 ? `${ageYears}살` : `${Math.max(ageMonths, 1)}개월`)
            : '프로필 등록';
        await db.query(
            `INSERT INTO pet_avatars (
                pet_id, avatar_url, age_years, age_months, age_label, taken_date, is_current, created_at
            ) VALUES (?, ?, ?, ?, ?, CURDATE(), 1, NOW())`,
            [id, current_avatar_url, ageYears, ageMonths, ageLabel]
        );
    }

    // 체중 또는 등길이 입력 시 성장 기록(pet_growth_logs) 초기 등록
    if (latest_weight_kg !== null || latest_body_length_cm !== null) {
        await db.query(
            `INSERT INTO pet_growth_logs (
                pet_id, weight_kg, body_length_cm, age_months_at_log, memo, measured_at, created_at
            ) VALUES (?, ?, ?, ?, '첫 가족 등록 기록', NOW(), NOW())`,
            [id, latest_weight_kg, latest_body_length_cm, totalMonths]
        );
    }

    // 첫 반려동물 등록 리워드 (+3,000P) 지급 확인
    let rewardGranted = 0;
    const [userRows] = await db.query(
        `SELECT first_pet_reward_claimed FROM users WHERE id = ?`,
        [userId]
    );
    if (userRows.length > 0 && !userRows[0].first_pet_reward_claimed) {
        await db.query(
            `UPDATE users SET reward_points = reward_points + 3000, first_pet_reward_claimed = 1 WHERE id = ?`,
            [userId]
        );
        rewardGranted = 3000;
    }

    // 2종 이상 반려동물 보유 시 다종 합사 가구(is_multi_species) 자동 활성화
    const [speciesRows] = await db.query(
        `SELECT COUNT(DISTINCT species) AS cnt FROM pets WHERE user_id = ?`,
        [userId]
    );
    if (speciesRows[0]?.cnt >= 2) {
        await db.query(`UPDATE users SET is_multi_species = 1 WHERE id = ?`, [userId]);
    }

    const updatedProfile = await getUserProfile(userId);
    const createdPet = updatedProfile?.pets?.find((p) => p.id === id) || null;

    return {
        pet: createdPet,
        pets: updatedProfile?.pets || [],
        profile: updatedProfile,
        rewardGranted
    };
};


export const updateUserPet = async (userId, petId, petData) => {
    const existingPet = await getUserPetById(userId, petId);
    if (!existingPet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const {
        name,
        species,
        custom_species,
        breed,
        birth_date = null,
        is_birth_estimated = 0,
        gender = 'UNKNOWN',
        is_neutered = 0,
        latest_weight_kg = null,
        latest_body_length_cm = null,
        current_avatar_url,
        is_primary = 0,
        ai_private_data_consent = 0
    } = petData;

    const allPets = await getUserPets(userId);
    const shouldBePrimary = allPets.length <= 1 ? 1 : (is_primary ? 1 : 0);

    if (shouldBePrimary === 1) {
        await db.query(`UPDATE pets SET is_primary = 0 WHERE user_id = ? AND id != ?`, [userId, petId]);
    } else if (existingPet.is_primary && allPets.length > 1) {
        // 기존 대표 반려동물 해제를 선택한 경우 다른 첫 번째 반려동물을 대표로 승격
        const otherPet = allPets.find((p) => p.id !== petId);
        if (otherPet) {
            await db.query(`UPDATE pets SET is_primary = 1 WHERE id = ?`, [otherPet.id]);
        }
    }

    const finalAvatarUrl = current_avatar_url !== undefined ? current_avatar_url : existingPet.current_avatar_url;
    const agreedAt = ai_private_data_consent
        ? (existingPet.agreed_at || new Date())
        : null;

    const finalCustomSpecies = species === 'OTHER'
        ? (custom_species !== undefined ? (custom_species || null) : (existingPet.custom_species || null))
        : null;

    await db.query(
        `UPDATE pets SET
            name = ?, species = ?, custom_species = ?, breed = ?, birth_date = ?, is_birth_estimated = ?, gender = ?, is_neutered = ?,
            latest_weight_kg = ?, latest_body_length_cm = ?, current_avatar_url = ?,
            is_primary = ?, ai_private_data_consent = ?, agreed_at = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [
            name,
            species,
            finalCustomSpecies,
            breed,
            birth_date || null,
            is_birth_estimated ? 1 : 0,
            gender,
            is_neutered ? 1 : 0,
            latest_weight_kg,
            latest_body_length_cm,
            finalAvatarUrl,
            shouldBePrimary,
            ai_private_data_consent ? 1 : 0,
            agreedAt,
            petId,
            userId
        ]
    );

    // 생년월일 기준 개월 수 계산
    let ageYears = null;
    let ageMonths = null;
    let totalMonths = null;
    if (birth_date) {
        const birth = new Date(birth_date);
        const now = new Date();
        if (!isNaN(birth.getTime())) {
            totalMonths = Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()));
            ageYears = Math.floor(totalMonths / 12);
            ageMonths = totalMonths % 12;
        }
    }

    // 새 아바타 업로드 시 pet_avatars 갱신
    if (current_avatar_url && current_avatar_url !== existingPet.current_avatar_url) {
        await db.query(`UPDATE pet_avatars SET is_current = 0 WHERE pet_id = ?`, [petId]);
        const ageLabel = totalMonths !== null
            ? (ageYears > 0 ? `${ageYears}살` : `${Math.max(ageMonths, 1)}개월`)
            : '프로필 수정';
        await db.query(
            `INSERT INTO pet_avatars (
                pet_id, avatar_url, age_years, age_months, age_label, taken_date, is_current, created_at
            ) VALUES (?, ?, ?, ?, ?, CURDATE(), 1, NOW())`,
            [petId, current_avatar_url, ageYears, ageMonths, ageLabel]
        );
    }

    // 체중 또는 등길이가 변경되었을 때 성장 기록(pet_growth_logs) 추가
    const weightChanged = latest_weight_kg !== null && Number(latest_weight_kg) !== Number(existingPet.latest_weight_kg);
    const lengthChanged = latest_body_length_cm !== null && Number(latest_body_length_cm) !== Number(existingPet.latest_body_length_cm);
    if (weightChanged || lengthChanged) {
        await db.query(
            `INSERT INTO pet_growth_logs (
                pet_id, weight_kg, body_length_cm, age_months_at_log, memo, measured_at, created_at
            ) VALUES (?, ?, ?, ?, '프로필 수정 기록', NOW(), NOW())`,
            [petId, latest_weight_kg, latest_body_length_cm, totalMonths]
        );
    }

    const updatedProfile = await getUserProfile(userId);
    const updatedPet = updatedProfile?.pets?.find((p) => p.id === petId) || null;

    return {
        pet: updatedPet,
        pets: updatedProfile?.pets || [],
        profile: updatedProfile,
        oldAvatarUrl: existingPet.current_avatar_url
    };
};

export const softDeleteUserPet = async (userId, petId) => {
    const existingPet = await getUserPetById(userId, petId);
    if (!existingPet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    // 소프트 삭제 (is_deleted = 1, deleted_at = NOW(), is_primary = 0)
    // 연관 데이터(pet_avatars, pet_histories, pet_journeys, post_pets, 이미지 파일 등) 6개월간 100% 보존
    await db.query(
        `UPDATE pets SET is_deleted = 1, deleted_at = NOW(), is_primary = 0 WHERE id = ? AND user_id = ?`,
        [petId, userId]
    );

    // 대표 반려동물이 삭제된 경우 남은 활성 첫 번째 반려동물을 대표로 지정
    if (existingPet.is_primary) {
        const remaining = await getUserPets(userId);
        if (remaining.length > 0) {
            await db.query(`UPDATE pets SET is_primary = 1 WHERE id = ?`, [remaining[0].id]);
        }
    }

    // 다종 합사 가구(is_multi_species) 재계산
    const [speciesRows] = await db.query(
        `SELECT COUNT(DISTINCT species) AS cnt FROM pets WHERE user_id = ? AND is_deleted = 0`,
        [userId]
    );
    await db.query(`UPDATE users SET is_multi_species = ? WHERE id = ?`, [speciesRows[0]?.cnt >= 2 ? 1 : 0, userId]);

    const updatedProfile = await getUserProfile(userId);

    return {
        deletedPetId: petId,
        pets: updatedProfile?.pets || [],
        profile: updatedProfile,
        retention_days: 180
    };
};

export const deleteUserPet = softDeleteUserPet;

export const restoreUserPet = async (userId, petId) => {
    const existingPet = await getUserPetWithDeleted(userId, petId);
    if (!existingPet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }
    if (!existingPet.is_deleted) {
        const error = new Error('PET_NOT_DELETED');
        error.status = 400;
        throw error;
    }

    // 현재 활성 펫 목록 조회: 활성 펫이 하나도 없으면 대표로 지정
    const activePets = await getUserPets(userId);
    const shouldBePrimary = activePets.length === 0 ? 1 : 0;

    // 복구 수행 (is_deleted = 0, deleted_at = NULL)
    await db.query(
        `UPDATE pets SET is_deleted = 0, deleted_at = NULL, is_primary = ? WHERE id = ? AND user_id = ?`,
        [shouldBePrimary, petId, userId]
    );

    // 다종 합사 가구(is_multi_species) 재계산
    const [speciesRows] = await db.query(
        `SELECT COUNT(DISTINCT species) AS cnt FROM pets WHERE user_id = ? AND is_deleted = 0`,
        [userId]
    );
    await db.query(`UPDATE users SET is_multi_species = ? WHERE id = ?`, [speciesRows[0]?.cnt >= 2 ? 1 : 0, userId]);

    const updatedProfile = await getUserProfile(userId);
    const restoredPet = updatedProfile?.pets?.find((p) => p.id === petId) || null;

    return {
        pet: restoredPet,
        pets: updatedProfile?.pets || [],
        profile: updatedProfile
    };
};

/**
 * 펫 케어 저니(pet_journeys) CRUD
 */
export const getPetJourneys = async (userId, petId) => {
    const pet = await getUserPetById(userId, petId);
    if (!pet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const sql = `
        SELECT 
            pj.id,
            pj.note_code,
            pj.pet_id,
            pj.user_id,
            pj.title,
            pj.description,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS end_date,
            (pj.is_ongoing = 1) AS is_ongoing,
            pj.status,
            pj.category,
            pj.goal_summary,
            pj.completed_at,
            pj.share_slug,
            pj.share_scope,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pt.id,
                        'name', pt.name,
                        'current_avatar_url', pt.current_avatar_url,
                        'species', pt.species,
                        'breed', pt.breed
                    )
                )
                FROM pet_journey_pets pjp
                JOIN pets pt ON pjp.pet_id = pt.id
                WHERE pjp.journey_id = pj.id AND pt.is_deleted = 0
            ), JSON_ARRAY()) AS pets,
            (
                SELECT COUNT(*) 
                FROM pet_histories ph 
                WHERE ph.journey_id = pj.id
            ) AS record_count,
            (
                SELECT DATE_FORMAT(MAX(ph.event_date), '%Y-%m-%d')
                FROM pet_histories ph 
                WHERE ph.journey_id = pj.id
            ) AS latest_record_date,
            pj.created_at,
            pj.updated_at
        FROM pet_journeys pj
        WHERE pj.user_id = ?
          AND (
              pj.pet_id = ?
              OR EXISTS (
                  SELECT 1 FROM pet_journey_pets pjp
                  WHERE pjp.journey_id = pj.id AND pjp.pet_id = ?
              )
          )
        ORDER BY pj.start_date DESC, pj.id DESC
    `;
    const [rows] = await db.query(sql, [userId, petId, petId]);
    return rows.map(r => {
        const pets = Array.isArray(r.pets) ? r.pets : [];
        return {
            ...r,
            is_ongoing: Boolean(r.is_ongoing),
            record_count: Number(r.record_count || 0),
            pets,
            pet_ids: pets.map(p => p.id)
        };
    });
};

export const getPetJourneyById = async (userId, petId, journeyId) => {
    const sql = `
        SELECT 
            pj.id,
            pj.note_code,
            pj.pet_id,
            pj.user_id,
            pj.title,
            pj.description,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS end_date,
            (pj.is_ongoing = 1) AS is_ongoing,
            pj.status,
            pj.category,
            pj.goal_summary,
            pj.completed_at,
            pj.share_slug,
            pj.share_scope,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', pt.id,
                        'name', pt.name,
                        'current_avatar_url', pt.current_avatar_url,
                        'species', pt.species,
                        'breed', pt.breed
                    )
                )
                FROM pet_journey_pets pjp
                JOIN pets pt ON pjp.pet_id = pt.id
                WHERE pjp.journey_id = pj.id AND pt.is_deleted = 0
            ), JSON_ARRAY()) AS pets,
            (
                SELECT COUNT(*) 
                FROM pet_histories ph 
                WHERE ph.journey_id = pj.id
            ) AS record_count,
            (
                SELECT DATE_FORMAT(MAX(ph.event_date), '%Y-%m-%d')
                FROM pet_histories ph 
                WHERE ph.journey_id = pj.id
            ) AS latest_record_date,
            pj.created_at,
            pj.updated_at
        FROM pet_journeys pj
        WHERE pj.id = ? AND pj.user_id = ?
          AND (
              pj.pet_id = ?
              OR EXISTS (
                  SELECT 1 FROM pet_journey_pets pjp
                  WHERE pjp.journey_id = pj.id AND pjp.pet_id = ?
              )
          )
    `;
    const [rows] = await db.query(sql, [journeyId, userId, petId, petId]);
    if (!rows[0]) return null;
    const pets = Array.isArray(rows[0].pets) ? rows[0].pets : [];
    return {
        ...rows[0],
        is_ongoing: Boolean(rows[0].is_ongoing),
        record_count: Number(rows[0].record_count || 0),
        pets,
        pet_ids: pets.map(p => p.id)
    };
};

export const createPetJourney = async (userId, petId, data) => {
    const pet = await getUserPetById(userId, petId);
    if (!pet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const {
        title,
        description = null,
        start_date,
        end_date = null,
        is_ongoing = 1,
        share_scope = 'LINK_ONLY',
        category = null,
        goal_summary = null,
        status
    } = data;

    const allowedScopes = ['PRIVATE', 'LINK_ONLY', 'PUBLIC'];
    const allowedStatuses = ['ACTIVE', 'CURED', 'COMPLETED'];
    const finalScope = allowedScopes.includes(share_scope) ? share_scope : 'LINK_ONLY';
    const isOngoingInput = is_ongoing === 'true' || is_ongoing === true || is_ongoing === 1 || is_ongoing === '1';
    const upperStatus = status ? String(status).toUpperCase() : '';
    const finalStatus = allowedStatuses.includes(upperStatus)
        ? upperStatus
        : (isOngoingInput ? 'ACTIVE' : 'COMPLETED');
    const finalIsOngoing = finalStatus === 'ACTIVE' ? 1 : 0;
    const finalEndDate = finalIsOngoing ? null : (end_date || null);
    const finalCategory = category ? String(category).trim().slice(0, 50) : null;
    const finalGoalSummary = goal_summary ? String(goal_summary).trim().slice(0, 255) : null;
    const finalStartDate = (start_date && String(start_date).trim())
        ? String(start_date).trim()
        : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    const shareSlug = crypto.randomBytes(16).toString('hex');
    const noteCode = generateNoteCode();
    const rawPetIds = Array.isArray(data?.pet_ids) && data.pet_ids.length > 0 ? data.pet_ids : [petId];
    const validatedPetIds = await normalizeOwnedPetIds(userId, rawPetIds);
    const primaryPetId = validatedPetIds[0] || petId;

    const [res] = await db.query(
        `INSERT INTO pet_journeys (
            note_code, pet_id, user_id, title, description, start_date, end_date, is_ongoing, status, category, goal_summary, completed_at, share_slug, share_scope, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${finalStatus === 'ACTIVE' ? 'NULL' : 'NOW()'}, ?, ?, NOW(), NOW())`,
        [
            noteCode,
            primaryPetId,
            userId,
            title,
            description || null,
            finalStartDate,
            finalEndDate,
            finalIsOngoing,
            finalStatus,
            finalCategory,
            finalGoalSummary,
            shareSlug,
            finalScope
        ]
    );

    const journeyId = res.insertId;
    for (const pid of validatedPetIds) {
        await db.query(
            `INSERT IGNORE INTO pet_journey_pets (journey_id, pet_id) VALUES (?, ?)`,
            [journeyId, pid]
        );
    }

    return await getPetJourneyById(userId, primaryPetId, journeyId);
};

export const updatePetJourney = async (userId, petId, journeyId, data) => {
    const existing = await getPetJourneyById(userId, petId, journeyId);
    if (!existing) {
        const error = new Error('JOURNEY_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const {
        title = existing.title,
        description = existing.description,
        start_date = existing.start_date,
        end_date = existing.end_date,
        is_ongoing = existing.is_ongoing,
        share_scope = existing.share_scope,
        category,
        goal_summary,
        status
    } = data;

    const allowedScopes = ['PRIVATE', 'LINK_ONLY', 'PUBLIC'];
    const allowedStatuses = ['ACTIVE', 'CURED', 'COMPLETED'];
    const finalScope = allowedScopes.includes(share_scope) ? share_scope : existing.share_scope;
    const isOngoingInput = is_ongoing === 'true' || is_ongoing === true || is_ongoing === 1 || is_ongoing === '1';
    const upperStatus = status !== undefined ? String(status || '').toUpperCase() : '';
    const finalStatus = allowedStatuses.includes(upperStatus)
        ? upperStatus
        : (data.is_ongoing !== undefined
            ? (isOngoingInput ? 'ACTIVE' : (existing.status === 'CURED' ? 'CURED' : 'COMPLETED'))
            : (existing.status || 'ACTIVE'));
    const finalIsOngoing = finalStatus === 'ACTIVE' ? 1 : 0;
    const finalEndDate = finalIsOngoing ? null : (end_date || null);
    const finalCategory = category !== undefined ? (category ? String(category).trim().slice(0, 50) : null) : existing.category;
    const finalGoalSummary = goal_summary !== undefined ? (goal_summary ? String(goal_summary).trim().slice(0, 255) : null) : existing.goal_summary;

    let finalPrimaryPetId = existing.pet_id;
    let validatedPetIds = null;
    if (Array.isArray(data?.pet_ids) && data.pet_ids.length > 0) {
        validatedPetIds = await normalizeOwnedPetIds(userId, data.pet_ids);
        if (validatedPetIds.length > 0) {
            finalPrimaryPetId = validatedPetIds[0];
        }
    }

    await db.query(
        `UPDATE pet_journeys SET
            pet_id = ?, title = ?, description = ?, start_date = ?, end_date = ?, is_ongoing = ?, status = ?, category = ?, goal_summary = ?,
            completed_at = ${finalStatus === 'ACTIVE' ? 'NULL' : (existing.status !== finalStatus ? 'NOW()' : 'COALESCE(completed_at, NOW())')},
            share_scope = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [
            finalPrimaryPetId,
            title,
            description !== undefined ? (description || null) : existing.description,
            start_date,
            finalEndDate,
            finalIsOngoing,
            finalStatus,
            finalCategory,
            finalGoalSummary,
            finalScope,
            journeyId,
            userId
        ]
    );

    if (validatedPetIds && validatedPetIds.length > 0) {
        await db.query(`DELETE FROM pet_journey_pets WHERE journey_id = ?`, [journeyId]);
        for (const pid of validatedPetIds) {
            await db.query(
                `INSERT IGNORE INTO pet_journey_pets (journey_id, pet_id) VALUES (?, ?)`,
                [journeyId, pid]
            );
        }
    }

    return await getPetJourneyById(userId, finalPrimaryPetId, journeyId);
};

export const deletePetJourney = async (userId, petId, journeyId) => {
    const existing = await getPetJourneyById(userId, petId, journeyId);
    if (!existing) {
        const error = new Error('JOURNEY_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    // Set pet_histories.journey_id = NULL
    await db.query(`UPDATE pet_histories SET journey_id = NULL WHERE journey_id = ?`, [journeyId]);
    await db.query(`DELETE FROM pet_journey_pets WHERE journey_id = ?`, [journeyId]);
    await db.query(`DELETE FROM pet_journeys WHERE id = ? AND user_id = ?`, [journeyId, userId]);

    return { deletedId: journeyId, petId };
};

/**
 * 펫 라이프 & 메디컬 히스토리(pet_histories) CRUD (케어 저니 & 룩북 글 & 다중 펫 N:M 연동 확장)
 */
const HISTORY_SELECT_SQL = `
    SELECT 
        ph.id, ph.pet_id, ph.user_id, ph.journey_id,
        DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS date,
        DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS event_date, 
        ph.category, ph.title, ph.description, ph.description AS notes, ph.hospital_name, 
        ph.weight_kg, ph.is_ai_generated, ph.created_at, ph.updated_at,
        CASE 
            WHEN pj.id IS NOT NULL THEN JSON_OBJECT('id', pj.id, 'title', pj.title, 'is_ongoing', pj.is_ongoing = 1)
            ELSE NULL
        END AS journey,
        COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', pt.id,
                    'name', pt.name,
                    'current_avatar_url', pt.current_avatar_url
                )
            )
            FROM pet_history_pets phpets
            JOIN pets pt ON phpets.pet_id = pt.id
            WHERE phpets.history_id = ph.id AND pt.is_deleted = 0
        ), JSON_ARRAY()) AS pets,
        COALESCE((
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', p.id,
                    'title', p.title,
                    'thumbnail_url', (
                        SELECT pi.image_url 
                        FROM post_images pi 
                        WHERE pi.post_id = p.id 
                        ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC 
                        LIMIT 1
                    )
                )
            )
            FROM pet_history_posts php
            JOIN posts p ON php.post_id = p.id
            WHERE php.history_id = ph.id
        ), JSON_ARRAY()) AS posts
    FROM pet_histories ph
    LEFT JOIN pet_journeys pj ON ph.journey_id = pj.id
`;

const formatHistoryRow = (r) => ({
    ...r,
    weight_kg: r.weight_kg !== null ? Number(r.weight_kg) : null,
    is_ai_generated: Number(r.is_ai_generated) === 1 ? 1 : 0,
    pets: Array.isArray(r.pets) ? r.pets : [],
    posts: Array.isArray(r.posts) ? r.posts : []
});

const normalizeOwnedPetIds = async (userId, rawPetIds = []) => {
    const unique = [...new Set((Array.isArray(rawPetIds) ? rawPetIds : [rawPetIds]).filter((id) => id && String(id).trim()).map((id) => String(id).trim()))];
    if (unique.length === 0) return [];
    const [rows] = await db.query(
        `SELECT id FROM pets WHERE user_id = ? AND is_deleted = 0 AND id IN (?)`,
        [userId, unique]
    );
    const ownedSet = new Set(rows.map((r) => r.id));
    if (ownedSet.size !== unique.length) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }
    return unique;
};

const syncPetsLatestWeight = async (userId, petIds = []) => {
    const unique = [...new Set(petIds.filter(Boolean))];
    for (const pid of unique) {
        const [latestWeightRow] = await db.query(
            `SELECT ph.weight_kg
             FROM pet_histories ph
             WHERE ph.user_id = ?
               AND ph.weight_kg IS NOT NULL
               AND (
                   ph.pet_id = ?
                   OR EXISTS (
                       SELECT 1 FROM pet_history_pets phpets
                       WHERE phpets.history_id = ph.id AND phpets.pet_id = ?
                   )
               )
             ORDER BY ph.event_date DESC, ph.id DESC
             LIMIT 1`,
            [userId, pid, pid]
        );
        const newWeight = latestWeightRow[0]?.weight_kg !== undefined ? latestWeightRow[0].weight_kg : null;
        await db.query(
            `UPDATE pets SET latest_weight_kg = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
            [newWeight, pid, userId]
        );
    }
};

export const getUserHistories = async (userId, options = {}) => {
    const {
        pet_id,
        pet_ids,
        unclassified,
        limit,
        offset
    } = options || {};

    const whereClauses = ['ph.user_id = ?'];
    const whereParams = [userId];

    const petIdSet = new Set();
    const normalizedPetId = typeof pet_id === 'string' ? pet_id.trim() : (pet_id ? String(pet_id).trim() : '');
    if (normalizedPetId && normalizedPetId !== 'all') {
        petIdSet.add(normalizedPetId);
    }

    if (Array.isArray(pet_ids)) {
        for (const id of pet_ids) {
            const trimmed = String(id || '').trim();
            if (trimmed && trimmed !== 'all') petIdSet.add(trimmed);
        }
    } else if (typeof pet_ids === 'string' && pet_ids.trim()) {
        for (const id of pet_ids.split(',')) {
            const trimmed = id.trim();
            if (trimmed && trimmed !== 'all') petIdSet.add(trimmed);
        }
    }

    const resolvedPetIds = [...petIdSet];
    if (resolvedPetIds.length > 0) {
        const placeholders = resolvedPetIds.map(() => '?').join(', ');
        whereClauses.push(`(
            ph.pet_id IN (${placeholders})
            OR EXISTS (
                SELECT 1 FROM pet_history_pets phpets
                WHERE phpets.history_id = ph.id AND phpets.pet_id IN (${placeholders})
            )
        )`);
        whereParams.push(...resolvedPetIds, ...resolvedPetIds);
    }

    if (unclassified === true || unclassified === 'true' || unclassified === '1') {
        whereClauses.push('ph.journey_id IS NULL');
    }

    const whereSql = whereClauses.join(' AND ');

    const [[countRow]] = await db.query(
        `SELECT COUNT(DISTINCT ph.id) AS total FROM pet_histories ph WHERE ${whereSql}`,
        whereParams
    );
    const total = Number(countRow?.total || 0);

    const hasLimit = limit !== undefined && limit !== null && String(limit).trim() !== '';
    const parsedLimit = hasLimit ? Math.min(100, Math.max(1, parseInt(limit, 10) || 20)) : null;
    const parsedOffset = hasLimit ? Math.max(0, parseInt(offset, 10) || 0) : 0;

    const sql = `
        ${HISTORY_SELECT_SQL}
        WHERE ${whereSql}
        ORDER BY ph.event_date DESC, ph.id DESC
        ${hasLimit ? 'LIMIT ? OFFSET ?' : ''}
    `;
    const queryParams = hasLimit ? [...whereParams, parsedLimit, parsedOffset] : whereParams;
    const [rows] = await db.query(sql, queryParams);
    const histories = rows.map(formatHistoryRow);

    return {
        histories,
        total,
        hasMore: parsedOffset + histories.length < total
    };
};

export const getUserHistoryById = async (userId, historyId) => {
    const sql = `
        ${HISTORY_SELECT_SQL}
        WHERE ph.id = ? AND ph.user_id = ?
        LIMIT 1
    `;
    const [rows] = await db.query(sql, [historyId, userId]);
    return rows[0] ? formatHistoryRow(rows[0]) : null;
};

export const getPetHistories = async (userId, petId) => {
    const pet = await getUserPetById(userId, petId);
    if (!pet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const sql = `
        ${HISTORY_SELECT_SQL}
        WHERE ph.user_id = ?
          AND (
              ph.pet_id = ?
              OR EXISTS (
                  SELECT 1 FROM pet_history_pets phpets
                  WHERE phpets.history_id = ph.id AND phpets.pet_id = ?
              )
          )
        ORDER BY ph.event_date DESC, ph.id DESC
    `;
    const [rows] = await db.query(sql, [userId, petId, petId]);
    return rows.map(formatHistoryRow);
};

export const getPetHistoryById = async (userId, petId, historyId) => {
    const sql = `
        ${HISTORY_SELECT_SQL}
        WHERE ph.id = ? AND ph.user_id = ?
          AND (
              ph.pet_id = ?
              OR EXISTS (
                  SELECT 1 FROM pet_history_pets phpets
                  WHERE phpets.history_id = ph.id AND phpets.pet_id = ?
              )
          )
        LIMIT 1
    `;
    const [rows] = await db.query(sql, [historyId, userId, petId, petId]);
    return rows[0] ? formatHistoryRow(rows[0]) : null;
};

export const getPetHistoriesByPostId = async (userId, postId) => {
    const [rows] = await db.query(
        `SELECT
            ph.id, ph.pet_id, ph.user_id, ph.journey_id,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS event_date,
            ph.category, ph.title, ph.description, ph.hospital_name,
            ph.weight_kg, ph.is_ai_generated
         FROM pet_histories ph
         JOIN pet_history_posts php ON php.history_id = ph.id
         WHERE php.post_id = ? AND ph.user_id = ?
         ORDER BY ph.id ASC`,
        [postId, userId]
    );
    return rows.map((r) => ({
        ...r,
        weight_kg: r.weight_kg !== null ? Number(r.weight_kg) : null,
        is_ai_generated: Number(r.is_ai_generated) === 1 ? 1 : 0
    }));
};

export const createPetHistory = async (userId, petId, historyData) => {
    const requestedPetIds = Array.isArray(historyData?.pet_ids) && historyData.pet_ids.length > 0
        ? historyData.pet_ids
        : [petId];
    const validPetIds = await normalizeOwnedPetIds(userId, requestedPetIds);
    if (validPetIds.length === 0) {
        const error = new Error('PET_IDS_REQUIRED');
        error.status = 400;
        throw error;
    }
    const primaryPetId = validPetIds[0];

    const {
        event_date,
        category = 'CHECKUP',
        title,
        description = null,
        hospital_name = null,
        weight_kg = null,
        journey_id = null,
        post_ids = [],
        is_ai_generated = 0
    } = historyData;

    const allowedCategories = ['SURGERY', 'VACCINE', 'CHECKUP', 'WEIGHT', 'EVENT', 'OTHER'];
    const finalCategory = allowedCategories.includes(category) ? category : 'CHECKUP';
    const parsedWeight = weight_kg !== null && weight_kg !== undefined && weight_kg !== '' && !isNaN(Number(weight_kg))
        ? Number(weight_kg)
        : null;
    const finalJourneyId = journey_id ? Number(journey_id) : null;
    const finalIsAiGenerated = is_ai_generated ? 1 : 0;

    const [res] = await db.query(
        `INSERT INTO pet_histories (
            pet_id, user_id, journey_id, event_date, category, title, description, hospital_name, weight_kg, is_ai_generated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [primaryPetId, userId, finalJourneyId, event_date, finalCategory, title, description || null, hospital_name || null, parsedWeight, finalIsAiGenerated]
    );

    const insertedId = res.insertId;

    // 다중 반려동물(pet_history_pets) 매핑 저장
    for (const pid of validPetIds) {
        await db.query(
            `INSERT IGNORE INTO pet_history_pets (history_id, pet_id) VALUES (?, ?)`,
            [insertedId, pid]
        );
    }

    // 연결된 룩북 글(pet_history_posts) 매핑 저장
    if (Array.isArray(post_ids) && post_ids.length > 0) {
        for (const pid of post_ids) {
            if (pid) {
                await db.query(
                    `INSERT IGNORE INTO pet_history_posts (history_id, post_id, created_at) VALUES (?, ?, NOW())`,
                    [insertedId, pid]
                );
            }
        }
    }

    // 체중 동기화 (선택된 모든 펫의 latest_weight_kg 업데이트)
    if (parsedWeight !== null) {
        await syncPetsLatestWeight(userId, validPetIds);
    }

    return await getUserHistoryById(userId, insertedId);
};

export const createUserHistory = async (userId, historyData) => {
    const rawPetIds = Array.isArray(historyData?.pet_ids) && historyData.pet_ids.length > 0
        ? historyData.pet_ids
        : (historyData?.pet_id ? [historyData.pet_id] : []);
    if (rawPetIds.length === 0) {
        const error = new Error('PET_IDS_REQUIRED');
        error.status = 400;
        throw error;
    }
    return await createPetHistory(userId, rawPetIds[0], {
        ...historyData,
        pet_ids: rawPetIds
    });
};

export const updatePetHistory = async (userId, petId, historyId, historyData) => {
    const existing = petId
        ? await getPetHistoryById(userId, petId, historyId)
        : await getUserHistoryById(userId, historyId);
    if (!existing) {
        const error = new Error('HISTORY_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const {
        event_date = existing.event_date,
        category = existing.category,
        title = existing.title,
        description = existing.description,
        hospital_name = existing.hospital_name,
        weight_kg = existing.weight_kg,
        journey_id,
        post_ids,
        pet_ids,
        is_ai_generated = 0
    } = historyData;

    const oldPetIds = [
        existing.pet_id,
        ...((existing.pets || []).map((p) => p.id))
    ].filter(Boolean);

    let nextPetIds = null;
    if (Array.isArray(pet_ids)) {
        nextPetIds = await normalizeOwnedPetIds(userId, pet_ids);
        if (nextPetIds.length === 0) {
            const error = new Error('PET_IDS_REQUIRED');
            error.status = 400;
            throw error;
        }
    }
    const finalPrimaryPetId = nextPetIds ? nextPetIds[0] : existing.pet_id;

    const allowedCategories = ['SURGERY', 'VACCINE', 'CHECKUP', 'WEIGHT', 'EVENT', 'OTHER'];
    const finalCategory = allowedCategories.includes(category) ? category : existing.category;
    const parsedWeight = weight_kg !== null && weight_kg !== undefined && weight_kg !== '' && !isNaN(Number(weight_kg))
        ? Number(weight_kg)
        : null;
    const finalJourneyId = journey_id !== undefined
        ? (journey_id ? Number(journey_id) : null)
        : existing.journey_id;

    // journey_id(소속 수첩 그룹)만 변경되고 나머지 내용 필드가 동일하면 is_ai_generated 기존 값 유지
    const isSameDate = String(event_date || '') === String(existing.event_date || '');
    const isSameCategory = finalCategory === existing.category;
    const isSameTitle = String(title || '') === String(existing.title || '');
    const isSameDescription = (description || null) === (existing.description || null);
    const isSameHospital = (hospital_name || null) === (existing.hospital_name || null);
    const existingWeight = existing.weight_kg !== null && existing.weight_kg !== undefined ? Number(existing.weight_kg) : null;
    const isSameWeight = parsedWeight === existingWeight;
    const existingPetSet = new Set(oldPetIds);
    const isSamePets = !nextPetIds || (nextPetIds.length === existingPetSet.size && nextPetIds.every((id) => existingPetSet.has(id)));
    const existingPostSet = new Set((existing.posts || []).map((p) => p.id));
    const normalizedPostIds = Array.isArray(post_ids) ? post_ids.filter(Boolean) : null;
    const isSamePosts = !normalizedPostIds || (normalizedPostIds.length === existingPostSet.size && normalizedPostIds.every((id) => existingPostSet.has(id)));

    const onlyJourneyChanged = isSameDate && isSameCategory && isSameTitle && isSameDescription && isSameHospital && isSameWeight && isSamePets && isSamePosts;
    const finalIsAiGenerated = is_ai_generated
        ? 1
        : (onlyJourneyChanged ? (Number(existing.is_ai_generated) === 1 ? 1 : 0) : 0);

    await db.query(
        `UPDATE pet_histories SET
            pet_id = ?, journey_id = ?, event_date = ?, category = ?, title = ?, description = ?, hospital_name = ?, weight_kg = ?, is_ai_generated = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [finalPrimaryPetId, finalJourneyId, event_date, finalCategory, title, description || null, hospital_name || null, parsedWeight, finalIsAiGenerated, historyId, userId]
    );

    if (nextPetIds) {
        await db.query(`DELETE FROM pet_history_pets WHERE history_id = ?`, [historyId]);
        for (const pid of nextPetIds) {
            await db.query(
                `INSERT IGNORE INTO pet_history_pets (history_id, pet_id) VALUES (?, ?)`,
                [historyId, pid]
            );
        }
    }

    // 연결된 룩북 글(pet_history_posts) 재동기화
    if (Array.isArray(post_ids)) {
        await db.query(`DELETE FROM pet_history_posts WHERE history_id = ?`, [historyId]);
        for (const pid of post_ids) {
            if (pid) {
                await db.query(
                    `INSERT IGNORE INTO pet_history_posts (history_id, post_id, created_at) VALUES (?, ?, NOW())`,
                    [historyId, pid]
                );
            }
        }
    }

    // 체중 동기화 (기존 + 신규 연결 펫 전체)
    await syncPetsLatestWeight(userId, [...oldPetIds, ...(nextPetIds || [])]);

    return await getUserHistoryById(userId, historyId);
};

export const updateUserHistory = async (userId, historyId, historyData) => {
    return await updatePetHistory(userId, null, historyId, historyData);
};

export const deletePetHistory = async (userId, petId, historyId) => {
    const existing = petId
        ? await getPetHistoryById(userId, petId, historyId)
        : await getUserHistoryById(userId, historyId);
    if (!existing) {
        const error = new Error('HISTORY_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const affectedPetIds = [
        existing.pet_id,
        ...((existing.pets || []).map((p) => p.id))
    ].filter(Boolean);

    await db.query(`DELETE FROM pet_history_pets WHERE history_id = ?`, [historyId]);
    await db.query(`DELETE FROM pet_history_posts WHERE history_id = ?`, [historyId]);
    await db.query(
        `DELETE FROM pet_histories WHERE id = ? AND user_id = ?`,
        [historyId, userId]
    );

    // 삭제 후 최신 체중 재동기화
    await syncPetsLatestWeight(userId, affectedPetIds);

    return { deletedId: historyId, petId: existing.pet_id };
};

export const deleteUserHistory = async (userId, historyId) => {
    return await deletePetHistory(userId, null, historyId);
};

/**
 * 글 연결 모달용 내가 쓴 룩북 글 간략 목록
 */
export const getUserSimplePosts = async (userId, { page = 1, limit = 10, q = '' } = {}) => {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const offset = (safePage - 1) * safeLimit;
    const trimmedQ = typeof q === 'string' ? q.trim() : '';

    let whereSql = `p.user_id = ? AND p.status = 'PUBLISHED'`;
    const baseParams = [userId];
    if (trimmedQ) {
        whereSql += ` AND p.title LIKE ?`;
        baseParams.push(`%${trimmedQ}%`);
    }

    const [countRows] = await db.query(
        `SELECT COUNT(*) AS total FROM posts p WHERE ${whereSql}`,
        baseParams
    );
    const total = Number(countRows[0]?.total || 0);

    const sql = `
        SELECT 
            p.id,
            p.title,
            (
                SELECT pi.image_url 
                FROM post_images pi 
                WHERE pi.post_id = p.id 
                ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC 
                LIMIT 1
            ) AS thumbnail_url,
            p.created_at
        FROM posts p
        WHERE ${whereSql}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(sql, [...baseParams, safeLimit, offset]);
    const hasMore = offset + rows.length < total;

    return {
        posts: rows,
        total,
        page: safePage,
        limit: safeLimit,
        hasMore
    };
};

/**
 * 외부 공유 전용 케어 저니 상세 조회 (비로그인 허용)
 */
export const getPublicJourneyBySlug = async (slug) => {
    const journeySql = `
        SELECT 
            pj.id,
            pj.pet_id,
            pj.user_id,
            pj.title,
            pj.description,
            DATE_FORMAT(pj.start_date, '%Y-%m-%d') AS start_date,
            DATE_FORMAT(pj.end_date, '%Y-%m-%d') AS end_date,
            (pj.is_ongoing = 1) AS is_ongoing,
            pj.status,
            pj.category,
            pj.goal_summary,
            pj.completed_at,
            pj.share_slug,
            pj.share_scope,
            pj.created_at,
            pj.updated_at
        FROM pet_journeys pj
        WHERE pj.share_slug = ?
        LIMIT 1
    `;
    const [jRows] = await db.query(journeySql, [slug]);
    if (!jRows[0]) {
        const error = new Error('JOURNEY_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const journey = {
        ...jRows[0],
        is_ongoing: Boolean(jRows[0].is_ongoing)
    };

    if (journey.share_scope === 'PRIVATE') {
        const error = new Error('JOURNEY_IS_PRIVATE');
        error.status = 403;
        throw error;
    }

    // 펫 기본 정보 (삭제되지 않은 활성 펫)
    const [petRows] = await db.query(
        `SELECT id, name, species, custom_species, breed, current_avatar_url,
                DATE_FORMAT(birth_date, '%Y-%m-%d') as birth_date,
                (is_birth_estimated = 1) AS is_birth_estimated,
                gender, (is_neutered = 1) AS is_neutered, latest_weight_kg
         FROM pets WHERE id = ? AND is_deleted = 0`,
        [journey.pet_id]
    );
    if (!petRows[0]) {
        const error = new Error('JOURNEY_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    // 작성자(집사) 정보
    const [userRows] = await db.query(
        `SELECT id, nickname, profile_image_url FROM users WHERE id = ?`,
        [journey.user_id]
    );

    // 해당 저니에 속한 일자별 기록 목록 (연결된 룩북 글 카드 포함)
    const historySql = `
        SELECT 
            ph.id, ph.pet_id, ph.user_id, ph.journey_id,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS date,
            DATE_FORMAT(ph.event_date, '%Y-%m-%d') AS event_date, 
            ph.category, ph.title, ph.description, ph.description AS notes, ph.hospital_name, 
            ph.weight_kg, ph.is_ai_generated, ph.created_at, ph.updated_at,
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', p.id,
                        'title', p.title,
                        'thumbnail_url', (
                            SELECT pi.image_url 
                            FROM post_images pi 
                            WHERE pi.post_id = p.id 
                            ORDER BY pi.is_thumbnail DESC, pi.sort_order ASC 
                            LIMIT 1
                        )
                    )
                )
                FROM pet_history_posts php
                JOIN posts p ON php.post_id = p.id
                WHERE php.history_id = ph.id
            ), JSON_ARRAY()) AS posts
        FROM pet_histories ph
        WHERE ph.journey_id = ? AND ph.is_private = 0
        ORDER BY ph.event_date ASC, ph.id ASC
    `;
    const [hRows] = await db.query(historySql, [journey.id]);

    return {
        journey,
        pet: petRows[0] || null,
        author: userRows[0] || null,
        histories: hRows.map(r => ({
            ...r,
            weight_kg: r.weight_kg !== null ? Number(r.weight_kg) : null,
            posts: r.posts || []
        }))
    };
};

// ==================== 회원 탈퇴 (30일 유예 · 영구 파기) ====================

export const getUserForWithdraw = async (userId) => {
    const [rows] = await db.query(
        `SELECT u.id, u.email, u.nickname, u.role, u.status, u.profile_image_url,
                EXISTS(
                    SELECT 1 FROM user_identities ui
                    WHERE ui.user_id = u.id AND ui.provider = 'LOCAL' AND ui.password_hash IS NOT NULL
                ) AS has_local_password
         FROM users u
         WHERE u.id = ?
         LIMIT 1`,
        [userId]
    );
    if (!rows[0]) return null;
    return {
        ...rows[0],
        has_local_password: Boolean(rows[0].has_local_password)
    };
};

export const markUserWithdrawn = async (userId, { deleteContent = false, reason = null } = {}) => {
    const delFlag = deleteContent ? 1 : 0;
    await db.query(
        `UPDATE users
         SET status = 'WITHDRAWN',
             withdrawn_at = NOW(),
             withdrawn_reason = ?,
             delete_content_on_withdraw = ?,
             refresh_token = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [reason || null, delFlag, userId]
    );

    if (deleteContent) {
        await db.query(
            `UPDATE posts
             SET status = 'DELETED',
                 delete_type = 'WITHDRAWAL',
                 delete_reason = '회원 탈퇴',
                 deleted_at = NOW(),
                 purge_scheduled_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
                 updated_at = NOW()
             WHERE user_id = ? AND status IN ('PUBLISHED', 'HIDDEN', 'DRAFT')`,
            [userId]
        );
        await db.query(
            `UPDATE comments
             SET status = 'WITHDRAWAL_HIDDEN', updated_at = NOW()
             WHERE user_id = ? AND status = 'ACTIVE'`,
            [userId]
        );
    }

    const [[updated]] = await db.query(`SELECT withdrawn_at FROM users WHERE id = ? LIMIT 1`, [userId]);
    return { withdrawn_at: updated?.withdrawn_at || new Date() };
};

export const purgeSingleWithdrawnUser = async (userId) => {
    const [rows] = await db.query(
        `SELECT id, status, profile_image_url, delete_content_on_withdraw, withdrawn_purged_at
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );
    const user = rows[0];
    if (!user || user.status !== 'WITHDRAWN' || user.withdrawn_purged_at) {
        return { purged: false };
    }

    // 1. 회원 프로필 이미지 물리 삭제
    if (user.profile_image_url) {
        await deleteProfileImageFile(user.profile_image_url);
    }

    // 2. 반려동물 아바타 이미지 물리 삭제
    const [petRows] = await db.query(`SELECT id, current_avatar_url FROM pets WHERE user_id = ?`, [userId]);
    for (const pet of petRows) {
        if (pet.current_avatar_url) {
            await deleteProfileImageFile(pet.current_avatar_url);
        }
    }

    // 3. 수첩/반려동물 연관 행 안전 삭제
    for (const sql of [
        `DELETE php FROM pet_history_posts php JOIN pet_histories ph ON php.history_id = ph.id WHERE ph.user_id = ?`,
        `DELETE phpets FROM pet_history_pets phpets JOIN pet_histories ph ON phpets.history_id = ph.id WHERE ph.user_id = ?`,
        `DELETE pjp FROM pet_journey_pets pjp JOIN pet_journeys pj ON pjp.journey_id = pj.id WHERE pj.user_id = ?`,
        `DELETE FROM pet_journey_scraps WHERE user_id = ?`,
        `DELETE FROM pet_journey_comments WHERE user_id = ?`,
        `DELETE FROM pet_histories WHERE user_id = ?`,
        `DELETE FROM pet_journeys WHERE user_id = ?`,
        `DELETE FROM pets WHERE user_id = ?`
    ]) {
        try {
            await db.query(sql, [userId]);
        } catch {
            // ignore missing/cascade differences
        }
    }

    // 4. 탈퇴 시 글/댓글 동시 삭제 선택 시 게시글·이미지·댓글 영구 삭제
    if (Boolean(user.delete_content_on_withdraw)) {
        const [postRows] = await db.query(`SELECT id, created_at FROM posts WHERE user_id = ?`, [userId]);
        for (const p of postRows) {
            const [imgRows] = await db.query(`SELECT image_url FROM post_images WHERE post_id = ?`, [p.id]);
            for (const img of imgRows) {
                if (img.image_url) await deleteProfileImageFile(img.image_url);
            }
            await deletePostFolder(p.id, p.created_at);

            for (const pSql of [
                `DELETE FROM post_images WHERE post_id = ?`,
                `DELETE FROM product_pins WHERE post_id = ?`,
                `DELETE FROM post_interactions WHERE post_id = ?`,
                `DELETE FROM post_appeals WHERE post_id = ?`,
                `DELETE cl FROM comment_likes cl JOIN comments c ON cl.comment_id = c.id WHERE c.post_id = ?`,
                `DELETE FROM comments WHERE post_id = ?`
            ]) {
                try {
                    await db.query(pSql, [p.id]);
                } catch {
                    // ignore
                }
            }
        }
        try {
            await db.query(`DELETE FROM comment_likes WHERE user_id = ?`, [userId]);
            await db.query(`DELETE FROM comments WHERE user_id = ?`, [userId]);
            await db.query(`DELETE FROM posts WHERE user_id = ?`, [userId]);
        } catch {
            // ignore
        }
    }

    // 5. 소셜/로컬 인증 정보 삭제
    await db.query(`DELETE FROM user_identities WHERE user_id = ?`, [userId]);

    // 6. 고유 4자리 익명 닉네임 생성
    let anonymizedNickname = `탈퇴회원_${Math.floor(1000 + Math.random() * 9000)}`;
    for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = `탈퇴회원_${Math.floor(1000 + Math.random() * 9000)}`;
        const [[dup]] = await db.query(`SELECT COUNT(*) AS cnt FROM users WHERE nickname = ?`, [candidate]);
        if (Number(dup?.cnt || 0) === 0) {
            anonymizedNickname = candidate;
            break;
        }
    }

    // 7. users 행 익명화 및 파기 완료 마킹
    const anonymizedEmail = `withdrawn_${userId}@deleted.local`;
    await db.query(
        `UPDATE users
         SET email = ?, nickname = ?, profile_image_url = NULL, bio = NULL,
             last_ip = NULL, refresh_token = NULL, withdrawn_purged_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [anonymizedEmail, anonymizedNickname, userId]
    );

    return { purged: true, userId, anonymizedNickname };
};

export const cleanupExpiredWithdrawnUsers = async () => {
    const [rows] = await db.query(
        `SELECT id
         FROM users
         WHERE status = 'WITHDRAWN'
           AND withdrawn_purged_at IS NULL
           AND withdrawn_at IS NOT NULL
           AND withdrawn_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    let purgedUsers = 0;
    for (const row of rows) {
        const res = await purgeSingleWithdrawnUser(row.id);
        if (res.purged) purgedUsers += 1;
    }

    return { purgedUsers };
};

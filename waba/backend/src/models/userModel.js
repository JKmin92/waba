import db from '../../config/db.js';

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
            id, email, nickname, role, mentor_badge, 
            reward_points, first_pet_reward_claimed, 
            refresh_token, last_ip, terms_agreed, marketing_agreed, status,
            last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const params = [
        user.id,
        user.email,
        user.nickname,
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
            id, user_id, provider, provider_uid, password_hash, provider_email
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
        identity.id,
        identity.user_id,
        identity.provider || 'LOCAL',
        identity.provider_uid,
        identity.password_hash,
        identity.provider_email
    ];
    const [result] = await db.query(sql, params);
    return result.affectedRows;
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
            gender, is_neutered, latest_weight_kg, latest_body_length_cm, 
            current_avatar_url, is_primary, ai_private_data_consent, agreed_at, created_at, updated_at
        FROM pets 
        WHERE user_id = ? 
        ORDER BY is_primary DESC, id ASC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
};

export const getUserPetById = async (userId, petId) => {
    const [rows] = await db.query(
        `SELECT * FROM pets WHERE id = ? AND user_id = ?`,
        [petId, userId]
    );
    return rows[0] || null;
};

export const getUserProfile = async (userId) => {
    const userSql = `
        SELECT 
            u.id, u.email, u.nickname, u.profile_image_url, u.bio,
            u.role, u.mentor_badge, u.vet_license_info, u.is_multi_species,
            u.reward_points, u.first_pet_reward_claimed, u.status, u.created_at,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND status = 'PUBLISHED') AS post_count,
            (SELECT COUNT(*) FROM post_interactions WHERE user_id = u.id AND interaction_type = 'BOOKMARK') AS bookmark_count,
            (SELECT COUNT(*) FROM post_interactions WHERE user_id = u.id AND interaction_type = 'LIKE') AS like_count,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND status = 'DRAFT') AS draft_count
        FROM users u
        WHERE u.id = ?
    `;
    const [rows] = await db.query(userSql, [userId]);
    if (!rows || rows.length === 0) return null;

    const pets = await getUserPets(userId);
    return {
        ...rows[0],
        pets
    };
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
            id, user_id, name, species, custom_species, breed, birth_date, gender, is_neutered,
            latest_weight_kg, latest_body_length_cm, current_avatar_url,
            is_primary, ai_private_data_consent, agreed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
            id,
            userId,
            name,
            species,
            finalCustomSpecies,
            breed,
            birth_date || null,
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
            name = ?, species = ?, custom_species = ?, breed = ?, birth_date = ?, gender = ?, is_neutered = ?,
            latest_weight_kg = ?, latest_body_length_cm = ?, current_avatar_url = ?,
            is_primary = ?, ai_private_data_consent = ?, agreed_at = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [
            name,
            species,
            finalCustomSpecies,
            breed,
            birth_date || null,
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

export const deleteUserPet = async (userId, petId) => {
    const existingPet = await getUserPetById(userId, petId);
    if (!existingPet) {
        const error = new Error('PET_NOT_FOUND');
        error.status = 404;
        throw error;
    }

    const [avatarRows] = await db.query(`SELECT avatar_url FROM pet_avatars WHERE pet_id = ?`, [petId]);
    const avatarUrlsToDelete = new Set(
        [existingPet.current_avatar_url, ...avatarRows.map((r) => r.avatar_url)].filter(Boolean)
    );

    // 연관 자식 데이터 정리 후 반려동물 삭제
    await db.query(`DELETE FROM pet_avatars WHERE pet_id = ?`, [petId]).catch(() => {});
    await db.query(`DELETE FROM pet_growth_logs WHERE pet_id = ?`, [petId]).catch(() => {});
    await db.query(`DELETE FROM post_pets WHERE pet_id = ?`, [petId]).catch(() => {});
    await db.query(`UPDATE product_pins SET pet_id = NULL WHERE pet_id = ?`, [petId]).catch(() => {});
    await db.query(`DELETE FROM pets WHERE id = ? AND user_id = ?`, [petId, userId]);

    // 대표 반려동물이 삭제된 경우 남은 첫 번째 반려동물을 대표로 지정
    if (existingPet.is_primary) {
        const remaining = await getUserPets(userId);
        if (remaining.length > 0) {
            await db.query(`UPDATE pets SET is_primary = 1 WHERE id = ?`, [remaining[0].id]);
        }
    }

    const updatedProfile = await getUserProfile(userId);

    return {
        deletedPetId: petId,
        pets: updatedProfile?.pets || [],
        profile: updatedProfile,
        avatarUrlsToDelete: Array.from(avatarUrlsToDelete)
    };
};

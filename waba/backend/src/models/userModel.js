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
        SELECT id, user_id, name, species, breed, latest_weight_kg, current_avatar_url 
        FROM pets 
        WHERE user_id = ? 
        ORDER BY id ASC
    `;
    const [rows] = await db.query(sql, [userId]);
    return rows;
};

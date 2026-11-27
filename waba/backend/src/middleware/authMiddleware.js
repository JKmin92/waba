import jwt from 'jsonwebtoken';
import db from '../../config/db.js';

/**
 * 로그인 필수 인증 미들웨어
 */
export const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '로그인이 필요한 서비스입니다.'
            });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key';
        const decoded = jwt.verify(token, secret);

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: '유효하지 않거나 만료된 토큰입니다.'
        });
    }
};

/**
 * 비회원/회원 공용 선택적 인증 미들웨어 (토큰이 유효하면 req.user 주입, 없거나 만료되어도 통과)
 */
export const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const secret = process.env.ACCESS_TOKEN_SECRET || 'wabami_access_key';
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
        } else {
            req.user = null;
        }
    } catch (err) {
        req.user = null;
    }
    next();
};

/**
 * 관리자 권한 실시간 검증 미들웨어 (verifyToken 이후 실행)
 */
export const verifyAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(403).json({
                success: false,
                message: '관리자 권한이 필요합니다.'
            });
        }

        const [rows] = await db.query(
            `SELECT id, email, nickname, role, status, profile_image_url, admin_level, admin_name, admin_title
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
        const user = rows[0];

        if (!user || user.status !== 'ACTIVE' || String(user.role || '').toUpperCase() !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: '관리자 권한이 필요합니다.'
            });
        }

        user.admin_level = String(user.admin_level || '').toUpperCase() === 'NORMAL' ? 'NORMAL' : 'SUPER';
        req.adminUser = user;
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * 슈퍼 관리자 권한 검증 미들웨어 (verifyAdmin 이후 실행)
 */
export const verifySuperAdmin = (req, res, next) => {
    if (String(req.adminUser?.admin_level || '').toUpperCase() !== 'SUPER') {
        return res.status(403).json({
            success: false,
            code: 'SUPER_ADMIN_REQUIRED',
            message: '슈퍼 관리자 권한이 필요합니다.'
        });
    }
    next();
};

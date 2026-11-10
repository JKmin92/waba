import jwt from 'jsonwebtoken';

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

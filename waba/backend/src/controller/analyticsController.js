import * as analyticsModel from '../models/analyticsModel.js';

export const trackVisit = async (req, res, next) => {
    try {
        const {
            visitorKey,
            path,
            referrerUrl,
            currentHost,
            utmSource,
            utmMedium,
            utmCampaign,
            shortLinkCode,
            isLoginSync,
        } = req.body || {};

        const forwardedFor = req.headers['x-forwarded-for'];
        const clientIp =
            (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : '') ||
            req.ip ||
            '';

        const result = await analyticsModel.recordVisit({
            visitorKey,
            userId: req.user?.userId || null,
            path,
            referrerUrl,
            currentHost: currentHost || req.headers.host || '',
            utmSource,
            utmMedium,
            utmCampaign,
            shortLinkCode,
            userAgent: req.headers['user-agent'] || '',
            clientIp,
            isLoginSync: Boolean(isLoginSync),
        });

        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

export const createShortLink = async (req, res, next) => {
    try {
        const { targetPath, channel } = req.body || {};
        const result = await analyticsModel.createOrGetShortLink({
            targetPath,
            channel,
            userId: req.user?.userId || null,
        });

        return res.status(200).json({
            success: true,
            code: result.code,
            shortPath: `/s/${result.code}`,
            targetPath: result.targetPath,
            channel: result.channel,
        });
    } catch (err) {
        if (err.message === 'INVALID_TARGET_PATH') {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 공유 경로입니다.',
            });
        }
        next(err);
    }
};

export const resolveShortLink = async (req, res, next) => {
    try {
        const { code } = req.params;
        const userAgent = req.headers['x-client-user-agent'] || req.headers['user-agent'] || '';
        const result = await analyticsModel.resolveShortLink(code, userAgent);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: '단축 URL을 찾을 수 없습니다.',
            });
        }

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (err) {
        next(err);
    }
};

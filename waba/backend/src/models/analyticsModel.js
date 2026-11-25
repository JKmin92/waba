import crypto from 'crypto';
import db from '../../config/db.js';

const BOT_UA_REGEX =
    /(googlebot|bingbot|yeti|naverbot|daum|facebookexternalhit|twitterbot|kakaotalk-scrap|slackbot|discordbot|linkedinbot|whatsapp|telegrambot|applebot|headlesschrome|lighthouse|bot\b|crawler|spider|slurp|duckduckbot|baiduspider|yandexbot|semrushbot|ahrefsbot)/i;

const SHORT_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const VALID_SHORT_CHANNELS = new Set(['SHARE_COPY', 'SHARE_KAKAO', 'SHARE_ETC', 'CAMPAIGN']);
const DISALLOWED_PATH_PREFIXES = ['/admin', '/api', '/s', '/_next'];

const COMMUNITY_DOMAINS = [
    'cafe.naver.com',
    'blog.naver.com',
    'tistory.com',
    'brunch.co.kr',
    'dcinside.com',
    'fmkorea.com',
    'theqoo.net',
    'clien.net',
    'ruliweb.com',
    'reddit.com',
];

const SEARCH_DOMAINS = [
    'naver.com',
    'google.',
    'daum.net',
    'bing.com',
    'yahoo.',
    'zum.com',
    'duckduckgo.com',
    'nate.com',
];

const SOCIAL_DOMAINS = [
    'instagram.com',
    't.co',
    'twitter.com',
    'x.com',
    'facebook.com',
    'fb.com',
    'youtube.com',
    'youtu.be',
    'kakao.com',
    'kakaocorp.com',
    'threads.net',
    'tiktok.com',
    'band.us',
    'pinterest.',
];

export const isBotUserAgent = (ua = '') => {
    const str = String(ua || '').trim();
    if (!str) return false;
    return BOT_UA_REGEX.test(str);
};

export const detectDeviceType = (ua = '') => {
    const str = String(ua || '');
    if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(str)) {
        return 'TABLET';
    }
    if (/mobile|iphone|ipod|android.*mobi|blackberry|iemobile|opera mini/i.test(str)) {
        return 'MOBILE';
    }
    return 'DESKTOP';
};

export const normalizePath = (rawPath) => {
    if (typeof rawPath !== 'string') return null;
    const trimmed = rawPath.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) {
        return null;
    }

    const withoutQueryOrHash = trimmed.split('#')[0].split('?')[0];
    let normalized = withoutQueryOrHash.startsWith('/') ? withoutQueryOrHash : `/${withoutQueryOrHash}`;
    normalized = normalized.replace(/\/{2,}/g, '/');
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }
    if (!normalized) return null;
    return normalized.slice(0, 255);
};

export const isTrackablePath = (path) => {
    if (!path || typeof path !== 'string') return false;
    return !DISALLOWED_PATH_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );
};

export const getRouteGroup = (path) => {
    if (path === '/') return 'HOME';
    if (path.startsWith('/board')) return 'BOARD';
    if (path.startsWith('/post')) return 'POST';
    if (path.startsWith('/journey')) return 'JOURNEY';
    if (path.startsWith('/notebook')) return 'NOTEBOOK';
    if (path.startsWith('/member')) return 'MEMBER';
    if (path.startsWith('/search')) return 'SEARCH';
    return 'OTHER';
};

export const parseTargetFromPath = (path) => {
    const postMatch = path.match(/^\/post\/([^/]+)$/);
    if (postMatch) return { targetType: 'POST', targetId: postMatch[1].slice(0, 64) };

    const journeyMatch = path.match(/^\/journey\/([^/]+)$/);
    if (journeyMatch) return { targetType: 'JOURNEY', targetId: journeyMatch[1].slice(0, 64) };

    const notebookMatch = path.match(/^\/notebook\/([^/]+)$/);
    if (notebookMatch) return { targetType: 'NOTEBOOK', targetId: notebookMatch[1].slice(0, 64) };

    const boardMatch = path.match(/^\/board\/([^/]+)$/);
    if (boardMatch) return { targetType: 'BOARD', targetId: boardMatch[1].slice(0, 64) };

    return { targetType: 'PAGE', targetId: null };
};

export const extractReferrerDomain = (referrerUrl, currentHost = '') => {
    if (!referrerUrl || typeof referrerUrl !== 'string') return null;
    try {
        const url = new URL(referrerUrl.trim());
        const domain = url.hostname.toLowerCase().replace(/^www\./, '');
        if (!domain) return null;

        const cleanHost = String(currentHost || '')
            .split(':')[0]
            .toLowerCase()
            .replace(/^www\./, '');

        if (domain === 'localhost' || domain === '127.0.0.1' || (cleanHost && domain === cleanHost)) {
            return null;
        }
        return domain.slice(0, 120);
    } catch {
        return null;
    }
};

const domainMatches = (domain, pattern) => {
    if (pattern.endsWith('.')) {
        return domain === pattern.slice(0, -1) || domain.includes(`.${pattern}`) || domain.startsWith(pattern);
    }
    return domain === pattern || domain.endsWith(`.${pattern}`);
};

export const classifyChannel = ({ shortLinkChannel, utmSource, referrerDomain }) => {
    if (shortLinkChannel && VALID_SHORT_CHANNELS.has(shortLinkChannel)) {
        return shortLinkChannel;
    }

    const utm = String(utmSource || '').trim().toLowerCase();
    if (utm) {
        if (/(insta|facebook|fb|kakao|twitter|x\.com|youtube|tiktok|threads)/.test(utm)) {
            return 'SOCIAL';
        }
        if (/(naver|google|daum|bing|yahoo)/.test(utm)) {
            return 'SEARCH';
        }
        return 'CAMPAIGN';
    }

    if (referrerDomain) {
        if (COMMUNITY_DOMAINS.some((p) => domainMatches(referrerDomain, p))) {
            return 'COMMUNITY';
        }
        if (SEARCH_DOMAINS.some((p) => domainMatches(referrerDomain, p))) {
            return 'SEARCH';
        }
        if (SOCIAL_DOMAINS.some((p) => domainMatches(referrerDomain, p))) {
            return 'SOCIAL';
        }
        return 'REFERRAL';
    }

    return 'DIRECT';
};

const getDailyIpHash = (clientIp) => {
    const raw = String(clientIp || '').trim();
    if (!raw) return null;
    const today = new Date().toISOString().slice(0, 10);
    return crypto.createHash('sha256').update(`${today}:${raw}`).digest('hex');
};

const generateShortCode = (length = 7) => {
    const bytes = crypto.randomBytes(length);
    let code = '';
    for (let i = 0; i < length; i++) {
        code += SHORT_CODE_ALPHABET[bytes[i] % SHORT_CODE_ALPHABET.length];
    }
    return code;
};

export const recordVisit = async ({
    visitorKey,
    userId = null,
    path,
    referrerUrl = null,
    currentHost = '',
    utmSource = null,
    utmMedium = null,
    utmCampaign = null,
    shortLinkCode = null,
    userAgent = '',
    clientIp = '',
    isLoginSync = false,
}) => {
    if (isBotUserAgent(userAgent)) {
        return { skipped: true, reason: 'BOT' };
    }

    const cleanVisitorKey = String(visitorKey || '').trim().slice(0, 64);
    if (!cleanVisitorKey) {
        return { skipped: true, reason: 'NO_VISITOR_KEY' };
    }

    const normalizedPath = normalizePath(path);
    if (!normalizedPath || !isTrackablePath(normalizedPath)) {
        return { skipped: true, reason: 'NON_TRACKABLE_PATH' };
    }

    let verifiedShortCode = null;
    let shortLinkChannel = null;
    const cleanShortCode = String(shortLinkCode || '').trim().slice(0, 16);
    if (cleanShortCode) {
        const [rows] = await db.query(
            `SELECT code, channel FROM short_links WHERE code = ? LIMIT 1`,
            [cleanShortCode]
        );
        if (rows[0]) {
            verifiedShortCode = rows[0].code;
            shortLinkChannel = rows[0].channel;
        }
    }

    const referrerDomain = extractReferrerDomain(referrerUrl, currentHost);
    const cleanUtmSource = utmSource ? String(utmSource).trim().slice(0, 100) : null;
    const cleanUtmMedium = utmMedium ? String(utmMedium).trim().slice(0, 100) : null;
    const cleanUtmCampaign = utmCampaign ? String(utmCampaign).trim().slice(0, 100) : null;
    const cleanReferrerUrl = referrerUrl && referrerDomain ? String(referrerUrl).trim().slice(0, 500) : null;

    const channel = classifyChannel({
        shortLinkChannel,
        utmSource: cleanUtmSource,
        referrerDomain,
    });

    const isMember = userId ? 1 : 0;
    const deviceType = detectDeviceType(userAgent);
    const ipHash = getDailyIpHash(clientIp);
    const pvIncrement = isLoginSync ? 0 : 1;

    await db.query(
        `INSERT INTO site_visits (
            visit_date, visitor_key, user_id, is_member, landing_path,
            referrer_url, referrer_domain, channel, short_link_code,
            utm_source, utm_medium, utm_campaign, device_type, page_view_count, ip_hash
        ) VALUES (
            CURDATE(), ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
        )
        ON DUPLICATE KEY UPDATE
            user_id = COALESCE(VALUES(user_id), user_id),
            is_member = GREATEST(is_member, VALUES(is_member)),
            page_view_count = page_view_count + ?,
            short_link_code = COALESCE(short_link_code, VALUES(short_link_code)),
            channel = CASE
                WHEN channel = 'DIRECT' AND VALUES(channel) != 'DIRECT' THEN VALUES(channel)
                ELSE channel
            END,
            last_seen_at = CURRENT_TIMESTAMP`,
        [
            cleanVisitorKey,
            userId || null,
            isMember,
            normalizedPath,
            cleanReferrerUrl,
            referrerDomain,
            channel,
            verifiedShortCode,
            cleanUtmSource,
            cleanUtmMedium,
            cleanUtmCampaign,
            deviceType,
            isLoginSync ? 0 : 1,
            ipHash,
            pvIncrement,
        ]
    );

    if (!isLoginSync) {
        const routeGroup = getRouteGroup(normalizedPath);
        await db.query(
            `INSERT INTO daily_page_stats (stat_date, path, route_group, pv_count)
             VALUES (CURDATE(), ?, ?, 1)
             ON DUPLICATE KEY UPDATE pv_count = pv_count + 1`,
            [normalizedPath, routeGroup]
        );
    }

    return { skipped: false, path: normalizedPath, channel, isMember: Boolean(isMember) };
};

export const createOrGetShortLink = async ({ targetPath, channel = 'SHARE_COPY', userId = null }) => {
    const normalizedPath = normalizePath(targetPath);
    if (!normalizedPath || !isTrackablePath(normalizedPath)) {
        const err = new Error('INVALID_TARGET_PATH');
        err.status = 400;
        throw err;
    }

    const safeChannel = VALID_SHORT_CHANNELS.has(channel) ? channel : 'SHARE_COPY';
    const cleanUserId = userId ? String(userId).slice(0, 30) : null;

    const [existing] = cleanUserId
        ? await db.query(
              `SELECT code, target_path, target_type, target_id, channel
               FROM short_links
               WHERE target_path = ? AND channel = ? AND created_by_user_id = ?
               LIMIT 1`,
              [normalizedPath, safeChannel, cleanUserId]
          )
        : await db.query(
              `SELECT code, target_path, target_type, target_id, channel
               FROM short_links
               WHERE target_path = ? AND channel = ? AND created_by_user_id IS NULL
               LIMIT 1`,
              [normalizedPath, safeChannel]
          );

    if (existing[0]) {
        return {
            code: existing[0].code,
            targetPath: existing[0].target_path,
            channel: existing[0].channel,
            targetType: existing[0].target_type,
            targetId: existing[0].target_id,
        };
    }

    const { targetType, targetId } = parseTargetFromPath(normalizedPath);

    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateShortCode(7);
        try {
            await db.query(
                `INSERT INTO short_links (
                    code, target_path, target_type, target_id, channel, created_by_user_id
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [code, normalizedPath, targetType, targetId, safeChannel, cleanUserId]
            );
            return {
                code,
                targetPath: normalizedPath,
                channel: safeChannel,
                targetType,
                targetId,
            };
        } catch (err) {
            if (err?.code !== 'ER_DUP_ENTRY' || attempt === 4) {
                throw err;
            }
        }
    }
};

export const resolveShortLink = async (code, userAgent = '') => {
    const cleanCode = String(code || '').trim().slice(0, 16);
    if (!cleanCode) return null;

    const [rows] = await db.query(
        `SELECT code, target_path, channel FROM short_links WHERE code = ? LIMIT 1`,
        [cleanCode]
    );
    const row = rows[0];
    if (!row) return null;

    const isBot = isBotUserAgent(userAgent);
    if (!isBot) {
        await db.query(
            `UPDATE short_links
             SET click_count = click_count + 1, last_clicked_at = NOW()
             WHERE code = ?`,
            [row.code]
        );
    }

    return {
        code: row.code,
        targetPath: row.target_path,
        channel: row.channel,
        isBot,
    };
};

export const cleanupExpiredAnalyticsData = async () => {
    const [visitResult] = await db.query(
        `DELETE FROM site_visits WHERE visit_date < DATE_SUB(CURDATE(), INTERVAL 3 YEAR)`
    );
    const [pageStatsResult] = await db.query(
        `DELETE FROM daily_page_stats WHERE stat_date < DATE_SUB(CURDATE(), INTERVAL 3 YEAR)`
    );

    return {
        deletedVisits: Number(visitResult?.affectedRows || 0),
        deletedPageStats: Number(pageStatsResult?.affectedRows || 0),
    };
};

import db from '../../config/db.js';

/**
 * 활성화된 외부 제휴 쇼핑몰 허용 도메인 목록 조회
 */
export const getActiveAllowedDomains = async () => {
    const [rows] = await db.query(
        `SELECT domain FROM allowed_affiliate_domains WHERE is_active = 1`
    );
    return rows.map((r) => String(r.domain || '').trim().toLowerCase()).filter(Boolean);
};

/**
 * 호스트명이 허용 도메인과 정확히 일치하거나 서브도메인인지 검증
 * (예: coupang.com.evil.com, evil.com/coupang.com 등 우회 패턴 차단)
 */
export const isHostnameAllowed = (hostname, allowedDomains = []) => {
    const host = String(hostname || '').trim().toLowerCase();
    if (!host) return false;

    return allowedDomains.some((rawDomain) => {
        const domain = String(rawDomain || '').trim().toLowerCase();
        if (!domain) return false;
        return host === domain || host.endsWith(`.${domain}`);
    });
};

/**
 * 단일 URL이 화이트리스트를 통과하는지 검증
 * - 빈 문자열/null/undefined는 선택 입력 필드이므로 통과
 * - http:, https: 프로토콜만 허용 (javascript:, data: 등 차단)
 */
export const isValidAffiliateUrl = (rawUrl, allowedDomains = []) => {
    if (rawUrl === null || rawUrl === undefined || String(rawUrl).trim() === '') {
        return true;
    }

    let parsed;
    try {
        parsed = new URL(String(rawUrl).trim());
    } catch {
        return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
    }

    return isHostnameAllowed(parsed.hostname, allowedDomains);
};

/**
 * 게시글 본문 블록(parsedBlocks) 내 이미지 핀들의 외부 쇼핑몰 URL 화이트리스트 일괄 검증
 */
export const validatePostPinUrls = async (contentBlocks = []) => {
    if (!Array.isArray(contentBlocks) || contentBlocks.length === 0) {
        return { valid: true };
    }

    const urlsToCheck = [];
    for (const block of contentBlocks) {
        if (block?.type === 'image' && Array.isArray(block.pins)) {
            for (const pin of block.pins) {
                if (!pin || typeof pin !== 'object') continue;
                if (pin.product_url !== undefined && pin.product_url !== null && String(pin.product_url).trim() !== '') {
                    urlsToCheck.push(String(pin.product_url).trim());
                }
                if (pin.external_url !== undefined && pin.external_url !== null && String(pin.external_url).trim() !== '') {
                    urlsToCheck.push(String(pin.external_url).trim());
                }
            }
        }
    }

    if (urlsToCheck.length === 0) {
        return { valid: true };
    }

    const allowedDomains = await getActiveAllowedDomains();
    for (const url of urlsToCheck) {
        if (!isValidAffiliateUrl(url, allowedDomains)) {
            return { valid: false, invalidUrl: url };
        }
    }

    return { valid: true };
};

import db from '../../config/db.js';

export const normalizeAffiliateDomain = (rawInput) => {
    const trimmed = String(rawInput || '').trim().toLowerCase();
    if (!trimmed || trimmed.includes('*') || /\s/.test(trimmed)) return null;

    let host = trimmed;
    if (trimmed.includes('://')) {
        try {
            host = new URL(trimmed).hostname.toLowerCase();
        } catch {
            return null;
        }
    } else {
        host = trimmed.replace(/^\/+/, '').split(/[/?#:]/)[0];
    }

    if (!host || host.length > 255 || host.startsWith('.') || host.endsWith('.') || host.includes('..')) {
        return null;
    }

    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    return domainRegex.test(host) ? host : null;
};

export const parseAllowedSubdomains = (raw) => {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : String(raw).split(',');
    return [...new Set(arr.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean))];
};

export const normalizeSubdomainList = (rawList, rootDomain) => {
    const tokens = Array.isArray(rawList) ? rawList : String(rawList || '').split(',');
    const root = String(rootDomain || '').trim().toLowerCase();
    const labelRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    const result = [];

    for (const rawToken of tokens) {
        let token = String(rawToken || '').trim().toLowerCase();
        if (!token) continue;

        if (token.includes('://')) {
            try {
                token = new URL(token).hostname.toLowerCase();
            } catch {
                const err = new Error('유효하지 않은 서브도메인 형식입니다.');
                err.status = 400;
                throw err;
            }
        } else {
            token = token.replace(/^\/+/, '').split(/[/?#:]/)[0];
        }

        if (token === root) continue;
        if (root && token.endsWith(`.${root}`)) {
            token = token.slice(0, token.length - root.length - 1);
        }

        if (!token || token.includes('*') || !labelRegex.test(token)) {
            const err = new Error('유효하지 않은 서브도메인 형식입니다.');
            err.status = 400;
            throw err;
        }

        if (!result.includes(token)) {
            result.push(token);
        }
    }

    return result;
};

/**
 * 활성화된 외부 제휴 쇼핑몰 허용 도메인 규칙 목록 조회
 */
export const getActiveAllowedDomains = async () => {
    const [rows] = await db.query(
        `SELECT id, domain, mall_name, subdomain_policy, allowed_subdomains
         FROM allowed_affiliate_domains
         WHERE is_active = 1`
    );
    return rows
        .map((r) => ({
            id: r.id,
            domain: String(r.domain || '').trim().toLowerCase(),
            mall_name: r.mall_name || null,
            subdomain_policy: ['ALL', 'SPECIFIC', 'NONE'].includes(String(r.subdomain_policy || '').toUpperCase())
                ? String(r.subdomain_policy).toUpperCase()
                : 'ALL',
            allowed_subdomains: parseAllowedSubdomains(r.allowed_subdomains)
        }))
        .filter((r) => Boolean(r.domain));
};

export const evaluateHostnameAgainstRules = (hostname, allowedRules = []) => {
    const host = String(hostname || '').trim().toLowerCase();
    if (!host) {
        return { allowed: false, reason: '유효하지 않은 호스트명입니다.' };
    }

    const rules = (allowedRules || [])
        .map((entry) => {
            if (typeof entry === 'string') {
                const d = entry.trim().toLowerCase();
                return d ? { domain: d, mall_name: d, subdomain_policy: 'ALL', allowed_subdomains: [] } : null;
            }
            if (entry && typeof entry === 'object' && entry.domain) {
                return {
                    ...entry,
                    domain: String(entry.domain).trim().toLowerCase(),
                    subdomain_policy: ['ALL', 'SPECIFIC', 'NONE'].includes(String(entry.subdomain_policy || '').toUpperCase())
                        ? String(entry.subdomain_policy).toUpperCase()
                        : 'ALL',
                    allowed_subdomains: Array.isArray(entry.allowed_subdomains)
                        ? entry.allowed_subdomains.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
                        : parseAllowedSubdomains(entry.allowed_subdomains)
                };
            }
            return null;
        })
        .filter(Boolean);

    let blockedRule = null;
    let rejectedSubdomain = null;

    for (const rule of rules) {
        if (host === rule.domain) {
            return { allowed: true, matchedRule: rule, matchType: 'EXACT' };
        }
        if (host.endsWith(`.${rule.domain}`)) {
            const sub = host.slice(0, host.length - rule.domain.length - 1);
            if (rule.subdomain_policy === 'ALL') {
                return { allowed: true, matchedRule: rule, matchType: 'SUBDOMAIN_ALL', matchedSubdomain: sub };
            }
            if (rule.subdomain_policy === 'SPECIFIC' && rule.allowed_subdomains.includes(sub)) {
                return { allowed: true, matchedRule: rule, matchType: 'SUBDOMAIN_SPECIFIC', matchedSubdomain: sub };
            }
            if (!blockedRule) {
                blockedRule = rule;
                rejectedSubdomain = sub;
            }
        }
    }

    if (blockedRule) {
        const label = blockedRule.mall_name ? `${blockedRule.domain} (${blockedRule.mall_name})` : blockedRule.domain;
        const reason = blockedRule.subdomain_policy === 'NONE'
            ? `${label}은(는) 서브도메인을 허용하지 않습니다.`
            : `${label}의 허용되지 않은 서브도메인(${rejectedSubdomain})입니다.`;
        return { allowed: false, blockedRule, rejectedSubdomain, reason };
    }

    return { allowed: false, reason: '화이트리스트에 등록되지 않은 도메인입니다.' };
};

/**
 * 호스트명이 허용 도메인 규칙을 통과하는지 검증
 */
export const isHostnameAllowed = (hostname, allowedRules = []) => {
    return evaluateHostnameAgainstRules(hostname, allowedRules).allowed;
};

export const evaluateAffiliateUrl = (rawUrl, allowedRules = []) => {
    let parsed;
    try {
        parsed = new URL(String(rawUrl || '').trim());
    } catch {
        return { allowed: false, reason: '유효한 URL 형식이 아닙니다.' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { allowed: false, hostname: parsed.hostname, reason: 'http 또는 https 프로토콜만 허용됩니다.' };
    }

    if (parsed.username || parsed.password) {
        return { allowed: false, hostname: parsed.hostname, reason: '인증 정보가 포함된 URL은 허용되지 않습니다.' };
    }

    const hostEval = evaluateHostnameAgainstRules(parsed.hostname, allowedRules);
    if (!hostEval.allowed) {
        return { ...hostEval, hostname: parsed.hostname };
    }

    for (const [, rawValue] of parsed.searchParams.entries()) {
        const candidates = [rawValue];
        try {
            const decoded = decodeURIComponent(rawValue);
            if (decoded !== rawValue) {
                candidates.push(decoded);
            }
        } catch {
            // ignore
        }

        for (const candidate of candidates) {
            const trimmed = String(candidate || '').trim();
            if (/^(https?:\/\/|\/\/)/i.test(trimmed)) {
                let nestedUrl;
                try {
                    nestedUrl = new URL(trimmed, parsed.origin);
                } catch {
                    return { allowed: false, hostname: parsed.hostname, reason: '쿼리 파라미터 내 유효하지 않은 URL이 포함되어 있습니다.' };
                }
                if (nestedUrl.protocol !== 'http:' && nestedUrl.protocol !== 'https:') {
                    return { allowed: false, hostname: parsed.hostname, reason: '쿼리 파라미터 내 허용되지 않은 프로토콜이 포함되어 있습니다.' };
                }
                if (nestedUrl.username || nestedUrl.password) {
                    return { allowed: false, hostname: parsed.hostname, reason: '쿼리 파라미터 내 인증 정보가 포함된 URL이 있습니다.' };
                }
                const nestedEval = evaluateHostnameAgainstRules(nestedUrl.hostname, allowedRules);
                if (!nestedEval.allowed) {
                    return { ...nestedEval, hostname: nestedUrl.hostname };
                }
            }
        }
    }

    return { ...hostEval, hostname: parsed.hostname };
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
    return evaluateAffiliateUrl(rawUrl, allowedDomains).allowed;
};

/**
 * 리다이렉트(3xx Location) 최종 도메인 재검증
 * - 최대 5홉까지 수동 추적하며 비허용 외부 도메인으로의 리다이렉트만 차단
 * - 봇 차단(403/429/503 등)이나 네트워크 타임아웃 시에는 정상 링크 오탐 방지를 위해 통과
 */
export const verifyUrlRedirectWhitelist = async (rawUrl, allowedDomains = [], maxHops = 5) => {
    if (rawUrl === null || rawUrl === undefined || String(rawUrl).trim() === '') {
        return true;
    }

    if (!isValidAffiliateUrl(rawUrl, allowedDomains)) {
        return false;
    }

    let currentUrl = String(rawUrl).trim();
    try {
        for (let hop = 0; hop < maxHops; hop++) {
            const res = await fetch(currentUrl, {
                method: 'GET',
                redirect: 'manual',
                signal: AbortSignal.timeout(3000),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; WabaBot/1.0)'
                }
            });

            if (res.status >= 300 && res.status < 400) {
                const location = res.headers.get('location');
                if (!location) {
                    break;
                }

                let nextUrl;
                try {
                    nextUrl = new URL(location, currentUrl);
                } catch {
                    return false;
                }

                if (!isValidAffiliateUrl(nextUrl.href, allowedDomains)) {
                    return false;
                }

                currentUrl = nextUrl.href;
                continue;
            }

            break;
        }
    } catch {
        // 네트워크 오류/타임아웃 시 비허용 리다이렉트가 확인되지 않았으므로 통과 (봇 차단/일시 장애 오탐 방지)
        return true;
    }

    return true;
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
        const redirectOk = await verifyUrlRedirectWhitelist(url, allowedDomains);
        if (!redirectOk) {
            return { valid: false, invalidUrl: url };
        }
    }

    return { valid: true };
};

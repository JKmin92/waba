import crypto from 'crypto';

// =============================================================================
// 쿠팡 파트너스 Open API 인증 키 설정
// 1) 아래 따옴표 안에 쿠팡 파트너스에서 발급받은 키를 직접 입력하시거나,
// 2) backend/config/.env 파일에 COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY로 등록하실 수 있습니다.
// =============================================================================
const COUPANG_ACCESS_KEY = process.env.COUPANG_ACCESS_KEY || '277e8d12-f072-48c5-a278-73d96e7d2a2e'; // 👈 여기에 Access Key 입력 (공란)
const COUPANG_SECRET_KEY = process.env.COUPANG_SECRET_KEY || '291f5f41b700f02f01e2ed0453e0f36797b61112'; // 👈 여기에 Secret Key 입력 (공란)

const COUPANG_GATEWAY_HOST = 'https://api-gateway.coupang.com';
const DEEPLINK_API_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';

/**
 * 쿠팡 파트너스 Open API HMAC-SHA256 인증 헤더를 생성합니다.
 * @param {string} accessKey - 발급받은 Access Key
 * @param {string} secretKey - 발급받은 Secret Key
 * @param {string} method - HTTP 메서드 ('GET', 'POST' 등)
 * @param {string} path - API 경로
 * @param {string} [query=''] - 쿼리스트링 (있는 경우)
 * @returns {string} CEA 인증 헤더 문자열
 */
export const generateCoupangAuthorization = (accessKey, secretKey, method, path, query = '') => {
    // 날짜 포맷: UTC 기준 yyMMdd'T'HHmmss'Z' (예: 261109T070152Z)
    const now = new Date();
    const yy = String(now.getUTCFullYear()).slice(-2);
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const min = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    const datetime = `${yy}${mm}${dd}T${hh}${min}${ss}Z`;

    // 메시지 조합 규칙: datetime + method + path + query
    const message = datetime + method + path + query;

    // HMAC-SHA256 암호화
    const signature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('hex');

    return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
};

/**
 * 주어진 URL이 쿠팡 상품 관련 URL인지 판별합니다.
 * @param {string} url - 검사할 URL
 * @returns {boolean}
 */
export const isCoupangUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return /https?:\/\/(?:www\.|m\.)?coupang\.com/i.test(url) || /https?:\/\/link\.coupang\.com/i.test(url);
};

/**
 * 쿠팡 URL에서 불필요한 트래킹 파라미터(itemId, vendorItemId 등)를 제거하고
 * 쿠팡 파트너스 API가 인식할 수 있는 순수 상품/검색 URL로 정제합니다.
 * @param {string} rawUrl - 원본 쿠팡 URL
 * @returns {string} 정제된 쿠팡 URL
 */
export const sanitizeCoupangUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();

    // 1. 이미 파트너스 링크인 경우
    if (/^https?:\/\/link\.coupang\.com\/a\//i.test(trimmed)) {
        return trimmed;
    }

    // 2. 상품 상세 페이지 URL (PC /vp/products/12345, 모바일 /vm/products/12345)
    const productMatch = trimmed.match(/\/products\/(\d+)/i);
    if (productMatch && productMatch[1]) {
        return `https://www.coupang.com/vp/products/${productMatch[1]}`;
    }

    // 3. 검색 또는 기타 URL 정제
    try {
        const parsed = new URL(trimmed);
        const allowedParams = ['q', 'channel'];
        const newSearchParams = new URLSearchParams();
        for (const [key, val] of parsed.searchParams.entries()) {
            if (allowedParams.includes(key)) {
                newSearchParams.set(key, val);
            }
        }
        const searchStr = newSearchParams.toString();
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}${searchStr ? '?' + searchStr : ''}`;
    } catch (_) {
        return trimmed;
    }
};

/**
 * 단일 쿠팡 상품 URL을 쿠팡 파트너스 수익 링크(단축 URL)로 변환합니다.
 * 
 * @param {string} originalUrl - 원본 쿠팡 상품 URL (예: https://www.coupang.com/vp/products/...)
 * @param {string} [subId='waba'] - 트래픽 추적용 서브 ID (선택사항)
 * @returns {Promise<string>} 변환된 쿠팡 파트너스 단축 URL (예: https://link.coupang.com/a/...)
 */
export const convertToCoupangPartnersUrl = async (originalUrl, subId = 'waba') => {
    if (!originalUrl || typeof originalUrl !== 'string') {
        throw new Error('변환할 쿠팡 URL을 입력해주세요.');
    }

    // 1. 이미 쿠팡 파트너스 단축 링크인 경우 그대로 반환
    if (/^https?:\/\/link\.coupang\.com\/a\//i.test(originalUrl.trim())) {
        return originalUrl.trim();
    }

    // 2. 쿠팡 URL 정제 (불필요한 트래킹 파라미터 제거)
    const cleanUrl = sanitizeCoupangUrl(originalUrl);

    const accessKey = COUPANG_ACCESS_KEY.trim();
    const secretKey = COUPANG_SECRET_KEY.trim();

    if (!accessKey || !secretKey) {
        throw new Error(
            '쿠팡 파트너스 Access Key 또는 Secret Key가 설정되지 않았습니다. ' +
            'coupangPartners.js 파일 또는 .env 파일에 키를 입력해주세요.'
        );
    }

    const authorization = generateCoupangAuthorization(
        accessKey,
        secretKey,
        'POST',
        DEEPLINK_API_PATH
    );

    const requestBody = {
        coupangUrls: [cleanUrl],
        subId: subId || 'waba',
    };

    const response = await fetch(`${COUPANG_GATEWAY_HOST}${DEEPLINK_API_PATH}`, {
        method: 'POST',
        headers: {
            'Authorization': authorization,
            'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok || result.rCode !== '0') {
        const errorMsg = result.rMessage || result.message || `HTTP ${response.status} 오류`;
        throw new Error(`쿠팡 파트너스 딥링크 생성 실패: ${errorMsg}`);
    }

    if (result.data && result.data.length > 0) {
        const item = result.data[0];
        return item.shortenUrl || item.landingUrl || originalUrl;
    }

    throw new Error('쿠팡 파트너스 변환 결과를 가져올 수 없습니다.');
};

/**
 * 여러 개의 쿠팡 상품 URL을 일괄 변환합니다. (최대 20개 권장)
 * 
 * @param {string[]} originalUrls - 변환할 원본 쿠팡 URL 배열
 * @param {string} [subId='waba'] - 트래픽 추적용 서브 ID (선택사항)
 * @returns {Promise<Array<{ originalUrl: string, shortenUrl: string, landingUrl: string }>>}
 */
export const convertMultipleCoupangUrls = async (originalUrls = [], subId = 'waba') => {
    if (!Array.isArray(originalUrls) || originalUrls.length === 0) {
        return [];
    }

    const accessKey = COUPANG_ACCESS_KEY.trim();
    const secretKey = COUPANG_SECRET_KEY.trim();

    if (!accessKey || !secretKey) {
        throw new Error(
            '쿠팡 파트너스 Access Key 또는 Secret Key가 설정되지 않았습니다. ' +
            'coupangPartners.js 파일 또는 .env 파일에 키를 입력해주세요.'
        );
    }

    const authorization = generateCoupangAuthorization(
        accessKey,
        secretKey,
        'POST',
        DEEPLINK_API_PATH
    );

    const requestBody = {
        coupangUrls: originalUrls.map((u) => sanitizeCoupangUrl(u)),
        subId: subId || 'waba',
    };

    const response = await fetch(`${COUPANG_GATEWAY_HOST}${DEEPLINK_API_PATH}`, {
        method: 'POST',
        headers: {
            'Authorization': authorization,
            'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok || result.rCode !== '0') {
        const errorMsg = result.rMessage || result.message || `HTTP ${response.status} 오류`;
        throw new Error(`쿠팡 파트너스 딥링크 일괄 생성 실패: ${errorMsg}`);
    }

    return result.data || [];
};

export default {
    convertToCoupangPartnersUrl,
    convertMultipleCoupangUrls,
    generateCoupangAuthorization,
    isCoupangUrl,
};

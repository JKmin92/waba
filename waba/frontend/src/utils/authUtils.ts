'use client';

import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_INFO_KEY = 'userInfo';

/**
 * JWT 페이로드 디코딩 헬퍼
 */
export const decodeToken = (token: string): any | null => {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

/**
 * 쿠키에서 Access Token 가져오기
 */
export const getAccessToken = (): string | null => {
    return Cookies.get(ACCESS_TOKEN_KEY) || null;
};

/**
 * 쿠키에서 Refresh Token 가져오기
 */
export const getRefreshToken = (): string | null => {
    return Cookies.get(REFRESH_TOKEN_KEY) || null;
};

/**
 * 쿠키에서 유저 기본 정보 가져오기
 */
export const getUserInfo = (): any | null => {
    const info = Cookies.get(USER_INFO_KEY);
    if (!info) return null;
    try {
        return JSON.parse(info);
    } catch {
        return null;
    }
};

/**
 * 로그인/회원가입 성공 시 쿠키에 토큰 및 유저 정보 저장
 * @param accessToken 15분 토큰
 * @param refreshToken 7일 토큰
 * @param user 유저 프로필 요약 정보
 */
export const setAuthSession = (accessToken: string, refreshToken?: string, user?: any) => {
    // Access Token: 15분 만료 (15분 = 15 / (24 * 60) 일)
    Cookies.set(ACCESS_TOKEN_KEY, accessToken, {
        expires: 15 / (24 * 60),
        sameSite: 'lax',
        path: '/'
    });

    // Refresh Token: 7일 유지
    if (refreshToken) {
        Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
            expires: 7,
            sameSite: 'lax',
            path: '/'
        });
    }

    // 유저 기본 정보: 7일 유지
    if (user) {
        Cookies.set(USER_INFO_KEY, JSON.stringify(user), {
            expires: 7,
            sameSite: 'lax',
            path: '/'
        });
    }

    // ⭐️ 로그인 상태 변경 이벤트 브로드캐스트 (Header 등 리렌더링 트리거)
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
    }
};

/**
 * 로그아웃 시 쿠키 정리
 */
export const clearAuthSession = () => {
    Cookies.remove(ACCESS_TOKEN_KEY, { path: '/' });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: '/' });
    Cookies.remove(USER_INFO_KEY, { path: '/' });

    // ⭐️ 로그아웃 상태 변경 이벤트 브로드캐스트
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
    }
};

/**
 * ⭐️ 현재 회원이 로그인되어 있는 상태인지 확인하여 true / false 반환
 * - 유효한 accessToken이 있거나
 * - 만료되었더라도 유효한 refreshToken이 있으면 true 반환
 */
export const isAuthenticated = (): boolean => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();

    // 두 토큰 모두 없으면 비로그인 상태
    if (!token && !refreshToken) {
        return false;
    }

    // accessToken이 있는 경우 유효시간(exp) 확인
    if (token) {
        const decoded = decodeToken(token);
        if (decoded && decoded.exp) {
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp > currentTime) {
                return true;
            }
        }
    }

    // accessToken이 만료되었어도 refreshToken이 남아있으면 세션 유지 가능(true)
    return !!refreshToken;
};

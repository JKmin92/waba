'use client'

import axios from 'axios';
import { getAccessToken, getRefreshToken, setAuthSession, clearAuthSession } from './authUtils';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

// 요청 인터셉터: 쿠키에 저장된 accessToken 자동 주입
axiosInstance.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (err) => Promise.reject(err)
);

// 응답 인터셉터: 401(토큰 만료) 발생 시 refreshToken으로 자동 갱신
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/user/refresh') &&
            !originalRequest.url.includes('/user/join')
        ) {
            originalRequest._retry = true;

            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                clearAuthSession();
                return Promise.reject(error);
            }

            try {
                // 토큰 재발급 요청 (백엔드 /user/refresh 엔드포인트 연동 대비)
                const res = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api'}/user/refresh`,
                    { refreshToken },
                    { withCredentials: true }
                );

                const newAccessToken = res.data?.accessToken;
                if (newAccessToken) {
                    setAuthSession(newAccessToken, res.data.refreshToken);
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return axiosInstance(originalRequest);
                } else {
                    clearAuthSession();
                    return Promise.reject(error);
                }
            } catch (refreshError) {
                clearAuthSession();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;

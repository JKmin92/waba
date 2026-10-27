'use client'

import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

const authCallbacks = {
    getAccessToken: () => null,
    logout: () => { },
    refreshAuthToken: () => Promise.resolve(null)
};

export const setupInterceptors = (callback: any) => {
    authCallbacks.getAccessToken = callback.getAccessToken || authCallbacks.getAccessToken;
    authCallbacks.logout = callback.logout || authCallbacks.logout;
    authCallbacks.refreshAuthToken = callback.refreshAuthToken || authCallbacks.refreshAuthToken;
};

axiosInstance.interceptors.request.use(
    (config) => {
        const token = authCallbacks.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (err) => Promise.reject(err)
);

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/user/refresh')) {
            originalRequest._retry = true;

            try {
                const newAccessToken = await authCallbacks.refreshAuthToken();
                if (newAccessToken) {
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return axiosInstance(originalRequest);
                } else {
                    authCallbacks.logout();
                    return Promise.reject(error);
                }
            } catch (refreshError) {
                authCallbacks.logout();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
)

export default axiosInstance;
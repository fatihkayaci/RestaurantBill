import axios, { AxiosError } from 'axios';
import { getTenantSlug } from './tenant';

export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/api`,
    timeout: 5000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const slug = getTenantSlug();
    if (slug) {
        config.headers['X-Restaurant-Slug'] = slug;
    }

    return config;
});

// NOT: Burada henüz gerçek /auth/refresh akışı yok (bkz. refresh-token-plani.md adım 5).
// Şimdilik yalnızca 401'de ölü ekranda kalmayı önlüyoruz; token yenileme ve single-flight
// kuyruğu bir sonraki adımda bu interceptor'ın yerini alacak.
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401 && window.location.pathname !== '/login') {
            localStorage.removeItem('token');
            window.location.assign('/login');
        }

        return Promise.reject(error);
    }
);

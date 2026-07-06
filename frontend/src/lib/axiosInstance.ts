import axios from 'axios';
import { getTenantSlug } from './tenant';

export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL ?? 'http://localhost:5077'}/api`,
    timeout: 5000,
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

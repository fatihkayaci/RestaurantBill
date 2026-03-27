import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5077/api',
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json'
    }
});
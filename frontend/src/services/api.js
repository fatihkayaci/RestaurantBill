import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:5077/api',
    timeout: 1000,
});

export const getTables = () => apiClient.get('/Table');
export const getProducts = () => apiClient.get('/Product');

export default apiClient;
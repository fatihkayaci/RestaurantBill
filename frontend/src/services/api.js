import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:5077/api',
    timeout: 1000,
});
// get functions =>
export const getTables = () => apiClient.get('/Table');
export const getProducts = () => apiClient.get('/Product');
export const getCategories = () => apiClient.get('/Category');
export const getActiveOrder = (tableId) => apiClient.get(`/Order/table/${tableId}`);

// insert functions =>
export const addOrderItem = (data) => apiClient.post('/OrderItem', data);

//delete functions =>
export const deleteOrderItem = (orderItemId) => apiClient.delete(`/OrderItem/${orderItemId}`);

export default apiClient;
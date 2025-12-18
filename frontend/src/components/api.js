import axios from 'axios';

// ✅ SMART API URL SWITCHING
const API_BASE_URL = import.meta.env.DEV
    ? "http://localhost:8000"  // Development
    : "https://makhana-ai.onrender.com";  // Production

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 180000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error);
        if (error.code === 'ECONNABORTED') {
            error.message = 'Request timeout - AI is taking too long';
        } else if (error.response?.status === 500) {
            error.message = 'Server error - Please try again';
        } else if (!error.response) {
            error.message = 'Network error - Check your connection';
        }
        return Promise.reject(error);
    }
);

// 1. Generate Diet Plan
export const generateDiet = (profileData) => {
    return api.post('/generate-diet', profileData);
};

// 2. Upload Blood Report
export const uploadReport = (formData) => {
    return api.post('/upload-blood-report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

// 3. Generate Grocery List
export const generateGrocery = (planId) => {
    return api.post(`/generate-grocery/${planId}`);
};

// 4. Save Plan (MISSING IN YOUR SNIPPET)
export const savePlan = (data) => {
    return api.post('/save-plan', data);
};

export default api;
// 5. Export URL for Login page (MISSING IN YOUR SNIPPET)
export { API_BASE_URL };
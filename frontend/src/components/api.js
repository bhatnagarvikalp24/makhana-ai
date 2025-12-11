import axios from 'axios';

// ✅ POINT TO LIVE BACKEND
const API_BASE_URL = "https://makhana-backend.onrender.com"; 

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

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
import axios from 'axios';

// When running locally, point to localhost. 
// When on Netlify, you will change this to your deployed Render backend URL.
const API_URL = "http://127.0.0.1:8000"; 

export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

export const generateDiet = (data) => api.post('/generate-diet', data);
export const generateGrocery = (planId) => api.post(`/generate-grocery/${planId}`);
export const uploadReport = (formData) => api.post('/upload-blood-report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
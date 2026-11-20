import axios from 'axios';

//https://sales-accounts-backend.vercel.app/
export const api = axios.create({
  API_BASE_URL: "http://localhost:3001/",
  baseURL: 'http://localhost:3001/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const Cloudapi = axios.create({
  API_BASE_URL: "http://192.168.10.22:3001/",
  baseURL: 'http://192.168.10.22:3001/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;


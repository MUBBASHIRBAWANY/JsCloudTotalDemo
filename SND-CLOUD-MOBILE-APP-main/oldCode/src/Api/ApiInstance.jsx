import axios from 'axios';

//https://sales-accounts-backend.vercel.app/
export const api = axios.create({
  API_BASE_URL: "https://jsnddemo.jspro4.tech/",
  baseURL: 'https://jsnddemo.jspro4.tech/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const Cloudapi = axios.create({
  API_BASE_URL: "https://jsdemo.jspro4.tech/",
  baseURL: 'https://jsdemo.jspro4.tech/',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;


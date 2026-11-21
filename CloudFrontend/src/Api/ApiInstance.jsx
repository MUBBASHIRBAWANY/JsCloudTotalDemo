import axios from "axios";
import Cookies from "universal-cookie";

const cookies = new Cookies();

const withSlash = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
};

const api = axios.create({
  baseURL: withSlash(import.meta.env.VITE_CLOUD_API_URL || "https://jsdemo.jspro4.tech"),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = cookies.get("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;

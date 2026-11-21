import axios from "axios";

const withSlash = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
};

const sndApiUrl = withSlash(
  import.meta.env.VITE_SND_API_URL || "https://jsnddemo.jspro4.tech"
);

const cloudApiUrl = withSlash(
  import.meta.env.VITE_CLOUD_API_URL || "https://jsdemo.jspro4.tech"
);

export const api = axios.create({
  baseURL: sndApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

export const Cloudapi = axios.create({
  baseURL: cloudApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

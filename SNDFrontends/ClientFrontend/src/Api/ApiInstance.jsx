import axios from "axios";

const withSlash = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
};

const sndApiUrl = withSlash(
  import.meta.env.VITE_SND_API_URL ||
    (import.meta.env.DEV ? "http://localhost:3005" : "https://api.pdl1.online")
);

const cloudApiUrl = withSlash(
  import.meta.env.VITE_CLOUD_API_URL || "https://pdl1.online"
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

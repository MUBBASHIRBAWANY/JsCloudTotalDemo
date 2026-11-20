import axios from "axios";

const withSlash = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
};

const SnDapi = axios.create({
  baseURL: withSlash(
    import.meta.env.VITE_SND_API_URL ||
      (import.meta.env.DEV ? "http://localhost:3005" : "https://api.pdl1.online")
  ),
  headers: {
    "Content-Type": "application/json",
  },
});

export default SnDapi;

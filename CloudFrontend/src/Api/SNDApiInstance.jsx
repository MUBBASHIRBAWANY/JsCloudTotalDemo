import axios from "axios";

const withSlash = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
};

const SnDapi = axios.create({
  baseURL: withSlash(import.meta.env.VITE_SND_API_URL || "https://jsnddemo.jspro4.tech"),
  headers: {
    "Content-Type": "application/json",
  },
});

export default SnDapi;

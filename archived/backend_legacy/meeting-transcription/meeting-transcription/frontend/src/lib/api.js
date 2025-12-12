import axios from "axios";

const fallbackBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "");

const API_BASE_URL = fallbackBaseUrl.replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  withCredentials: false
});

export function resolveMediaUrl(resourcePath = "") {
  if (!resourcePath) return "";
  if (/^https?:\/\//i.test(resourcePath)) {
    return resourcePath;
  }

  if (!API_BASE_URL) {
    return resourcePath;
  }

  return `${API_BASE_URL}${resourcePath.startsWith("/") ? "" : "/"}${resourcePath}`;
}

export default apiClient;

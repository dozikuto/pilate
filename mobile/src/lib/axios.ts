import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import storage from "./storage";

let rawUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
if (!rawUrl.endsWith("/api/v1")) {
  rawUrl = `${rawUrl.replace(/\/+$/, "")}/api/v1`;
}
const API_URL = rawUrl;

export const TOKEN_KEY = "pilatesms_token";

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getItem(TOKEN_KEY);
    if (token && token !== "undefined" && token !== "null" && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const isPasswordChange = error.config?.url?.split("?")[0].endsWith("/auth/change-password");
    if (error.response?.status === 401 && !isPasswordChange) {
      await storage.deleteItem(TOKEN_KEY);
      delete apiClient.defaults.headers.common["Authorization"];
    }
    return Promise.reject(error);
  }
);

export default apiClient;

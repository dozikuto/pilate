import { create } from "zustand";
import storage from "@/lib/storage";
import apiClient, { TOKEN_KEY } from "@/lib/axios";
import type { User, LoginPayload, RegisterPayload, AuthResponse } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.getItem(TOKEN_KEY);
      if (!token || token === "undefined" || token === "null") {
        set({ isLoading: false, isAuthenticated: false, token: null, user: null });
        return;
      }
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      const res = await apiClient.get<any>("/auth/me");
      const userData = res.data?.data?.user || res.data?.data || res.data?.user || res.data;
      set({
        token,
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await storage.deleteItem(TOKEN_KEY);
      delete apiClient.defaults.headers.common["Authorization"];
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (payload: LoginPayload) => {
    set({ isLoading: true });
    try {
      const res = await apiClient.post<any>("/auth/login", payload);
      const raw = res.data;
      const respData = raw?.data ?? raw;
      const token = respData?.accessToken || respData?.token || raw?.accessToken;
      const user = respData?.user || raw?.user;

      if (!token) {
        throw new Error("Không nhận được token xác thực từ máy chủ.");
      }

      await storage.setItem(TOKEN_KEY, token);
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true });
    try {
      const { confirmPassword, ...registerDto } = payload;
      if (registerDto.phone) {
        registerDto.phone = registerDto.phone.replace(/[\s\-\.]/g, "");
      }
      const res = await apiClient.post<any>("/auth/register", registerDto);
      const raw = res.data;
      const respData = raw?.data ?? raw;
      const token = respData?.accessToken || respData?.token || raw?.accessToken;
      const user = respData?.user || raw?.user;

      if (!token) {
        throw new Error("Không nhận được token xác thực từ máy chủ.");
      }

      await storage.setItem(TOKEN_KEY, token);
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await storage.deleteItem(TOKEN_KEY);
    delete apiClient.defaults.headers.common["Authorization"];
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (partial: Partial<User>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...partial } });
    }
  },
}));

import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import type { LoginPayload, RegisterPayload } from "@/types";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token, isLoading, isAuthenticated, login, register, logout } =
    useAuthStore();

  const handleLogin = useCallback(
    async (payload: LoginPayload) => {
      await login(payload);
      queryClient.clear();
      router.replace("/(tabs)/home");
    },
    [login, router, queryClient]
  );

  const handleRegister = useCallback(
    async (payload: RegisterPayload) => {
      await register(payload);
      queryClient.clear();
      router.replace("/(tabs)/home");
    },
    [register, router, queryClient]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    queryClient.clear();
    router.replace("/(auth)/login");
  }, [logout, router, queryClient]);

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}

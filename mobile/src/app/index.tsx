import React, { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import LoadingScreen from "@/components/LoadingScreen";

export default function Index() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Đang khởi động PilatesMS..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}

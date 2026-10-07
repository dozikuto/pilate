import { Alert, Platform } from "react-native";

export function notifyAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
  } else {
    Alert.alert(title, message);
  }
}

export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText = "Xác nhận",
  cancelText = "Hủy"
) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`${title}\n\n${message}`);
      if (ok) {
        onConfirm();
      }
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: "cancel" },
      {
        text: confirmText,
        style: "destructive",
        onPress: onConfirm,
      },
    ]);
  }
}

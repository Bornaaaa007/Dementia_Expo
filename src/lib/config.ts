import Constants from "expo-constants";
import { Platform } from "react-native";

const PORT = 5000;

function resolveBase(): string {
  // Browser (localhost:8081) talks to the backend on localhost
  if (Platform.OS === "web") return `http://localhost:${PORT}`;

  // Expo Go: Metro runs on the same computer as the backend, so its host is the backend's host.
  // Read at startup, so it is correct on any Wi-Fi without editing anything.
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:${PORT}`;

  return process.env.EXPO_PUBLIC_API_URL ?? "";
}

export const API_BASE = resolveBase().replace(/\/$/, "");
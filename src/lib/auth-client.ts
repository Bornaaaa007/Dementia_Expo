import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_BASE } from "./config";

export const authClient =
  Platform.OS === "web"
    ? createAuthClient({ baseURL: API_BASE, fetchOptions: { credentials: "include" } })
    : createAuthClient({
        baseURL: API_BASE,
        plugins: [
          expoClient({
            scheme: "dementianestcare",
            storagePrefix: "dementianestcare",
            storage: SecureStore,
          }),
        ],
      });
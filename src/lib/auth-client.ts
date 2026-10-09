//  import { expoClient } from "@better-auth/expo/client";
// import { createAuthClient } from "better-auth/react";
// import * as SecureStore from "expo-secure-store";

// export const authClient = createAuthClient({
//   baseURL: "http://192.168.1.6:5000",
//   fetchOptions: {
//     headers: {
//       origin: "dementianestcare://",
//     },
//   },
//   plugins: [
//     expoClient({
//       scheme: "dementianestcare",
//       storagePrefix: "dementianestcare",
//       storage: SecureStore,
//     }),
//   ],
// });
// export const { signIn, signUp, useSession } = createAuthClient();
import { Platform } from 'react-native';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export const authClient =
  Platform.OS === 'web'
    ? createAuthClient({ baseURL, fetchOptions: { credentials: 'include' } })
    : createAuthClient({
        baseURL,
        plugins: [
          expoClient({
            scheme: 'dementianestcare',
            storagePrefix: 'dementianestcare',
            storage: SecureStore,
          }),
        ],
      });
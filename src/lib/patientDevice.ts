import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// The patient's device keeps only a token + name (SecureStore values must stay small).
const KEY = "nestcare_patient_device";

export interface PairedDevice {
  token: string;
  patientId: string;
  name: string;
}

// The face-check session lives only in memory, so closing the app locks it again.
let faceSession: string | null = null;
export const setFaceSession = (token: string | null) => {
  faceSession = token;
};
export const getFaceSession = () => faceSession;

export async function loadDevice(): Promise<PairedDevice | null> {
  try {
    const raw = Platform.OS === "web" ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as PairedDevice) : null;
  } catch {
    return null;
  }
}

export async function saveDevice(device: PairedDevice) {
  const raw = JSON.stringify(device);
  if (Platform.OS === "web") window.localStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearDevice() {
  faceSession = null;
  try {
    if (Platform.OS === "web") window.localStorage.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
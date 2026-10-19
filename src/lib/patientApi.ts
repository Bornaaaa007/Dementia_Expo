import { api, ApiError } from "./api";
import { clearDevice, getFaceSession, loadDevice, setFaceSession } from "./patientDevice";

// Thrown when the patient screen has to be locked again (not paired, no face check, or the server refused)
export class PatientLockedError extends Error {}

// Calls the backend as the patient's device: device token + face session, like patient/home.tsx does.
export async function patientApi<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const device = await loadDevice();
  const session = getFaceSession();
  if (!device || !session) throw new PatientLockedError();

  try {
    return await api<T>(path, { ...opts, deviceToken: device.token, faceSession: session });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      if (e.code === "NO_DEVICE") await clearDevice(); // pairing was removed
      setFaceSession(null); // face session expired: lock again
      throw new PatientLockedError();
    }
    throw e;
  }
}
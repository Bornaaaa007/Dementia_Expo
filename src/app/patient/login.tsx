import { FaceCapture } from "@/components/FaceCapture";
import { Avatar, Button, colors } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { confirmAction, notify } from "@/lib/notify";
import { clearDevice, loadDevice, saveDevice, setFaceSession } from "@/lib/patientDevice";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface Profile {
  name: string;
  photoUrl: string | null;
}

export default function PatientLogin() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null); // paired device
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pairing, setPairing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null); // gentle "try again" text
  const [blocked, setBlocked] = useState<string | null>(null); // can't continue without family help

  // On open: if this device was paired before, confirm the pairing is still valid
  useEffect(() => {
    (async () => {
      setFaceSession(null); // landing here always means "locked"
      const device = await loadDevice();
      if (!device) return setChecking(false);
      setDeviceToken(device.token);
      try {
        const { patient } = await api<{ patient: { name: string; photoUrl: string | null } }>("/api/patient-device/me", {
          deviceToken: device.token,
        });
        setProfile({ name: patient.name, photoUrl: patient.photoUrl });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await clearDevice(); // family re-generated the codes
          setDeviceToken(null);
        } else setProfile({ name: device.name, photoUrl: null }); // offline: still show the lock screen
      }
      setChecking(false);
    })();
  }, []);

  const pair = async () => {
    if (!code.trim()) return notify("Missing code", "Ask your family for the patient device code.");
    setPairing(true);
    try {
      const data = await api<{ token: string; patient: { id: string; name: string; photoUrl: string | null } }>(
        "/api/patient-device/pair",
        { body: { pairCode: code.trim() } }
      );
      await saveDevice({ token: data.token, patientId: data.patient.id, name: data.patient.name });
      setDeviceToken(data.token);
      setProfile({ name: data.patient.name, photoUrl: data.patient.photoUrl });
      setCode("");
    } catch (e) {
      notify("Couldn't pair this device", errorMessage(e));
    } finally {
      setPairing(false);
    }
  };

  const unlock = async (image: string) => {
    if (!deviceToken) return;
    setVerifying(true);
    setMessage(null);
    try {
      const res = await api<{ sessionToken: string }>("/api/patient-device/face-login", {
        body: { image },
        deviceToken,
      });
      setFaceSession(res.sessionToken);
      router.replace("/patient/home");
    } catch (e) {
      if (e instanceof ApiError && e.code === "NO_DEVICE") {
        await clearDevice();
        setProfile(null);
        setDeviceToken(null);
      } else if (e instanceof ApiError && (e.code === "FACE_NOT_ENROLLED" || e.code === "FACE_LOCKED")) {
        setBlocked(e.message);
      } else {
        setMessage(errorMessage(e));
      }
    } finally {
      setVerifying(false);
    }
  };

  const switchProfile = async () => {
    const ok = await confirmAction("Not you?", "This removes the picture from this device. A family member will need to give you a new code.", "Remove");
    if (!ok) return;
    if (deviceToken) {
      try {
        await api("/api/patient-device/unpair", { method: "DELETE", deviceToken });
      } catch {}
    }
    await clearDevice();
    setProfile(null);
    setDeviceToken(null);
    setBlocked(null);
    setMessage(null);
  };

  if (checking) {
    return (
      <View style={[styles.container, { alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.brown} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {profile ? (
        <>
          <View style={{ alignItems: "center" }}>
            <Avatar name={profile.name} uri={profile.photoUrl} size={90} />
          </View>
          <Text style={styles.title}>Hello, {profile.name}</Text>

          {blocked ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{blocked}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sub}>Look at the camera, then tap the button.</Text>
              {message ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>{message}</Text>
                </View>
              ) : null}
              <FaceCapture label="Unlock" onCapture={unlock} busy={verifying} />
            </>
          )}

          <TouchableOpacity onPress={switchProfile}>
            <Text style={styles.small}>Not {profile.name}?</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Set up this device</Text>
          <Text style={styles.sub}>Ask a family member for the patient device code.</Text>
          <TextInput
            style={styles.input}
            placeholder="Device code"
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={setCode}
          />
          <Button title="Connect" onPress={pair} loading={pairing} />
        </>
      )}

      <TouchableOpacity onPress={() => router.replace("/")}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", backgroundColor: colors.bg, padding: 24, gap: 6 },
  title: { fontSize: 26, fontWeight: "700", color: "#333", marginVertical: 10, textAlign: "center" },
  sub: { fontSize: 16, color: colors.muted, textAlign: "center", marginBottom: 14 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 22, letterSpacing: 3,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border, textAlign: "center",
  },
  notice: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.maroon, padding: 14, marginBottom: 12 },
  noticeText: { fontSize: 16, color: colors.maroon, textAlign: "center", lineHeight: 22 },
  small: { color: colors.muted, textAlign: "center", marginTop: 14, fontSize: 14 },
  backText: { color: "#999", textAlign: "center", marginTop: 20, fontSize: 14 },
});
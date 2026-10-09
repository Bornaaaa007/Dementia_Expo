import { Avatar, Button, colors } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { confirmAction, notify } from "@/lib/notify";
import { clearDevice, loadDevice, saveDevice } from "@/lib/patientDevice";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface Profile {
  name: string;
  photoUrl: string | null;
}

export default function PatientLogin() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null); // paired device
  const [code, setCode] = useState("");
  const [pairing, setPairing] = useState(false);

  // On open: if this device was paired before, confirm the pairing is still valid
  useEffect(() => {
    (async () => {
      const device = await loadDevice();
      if (!device) return setChecking(false);
      try {
        const { patient } = await api<{ patient: { name: string; photoUrl: string | null } }>("/api/patient-device/me", {
          deviceToken: device.token,
        });
        setProfile({ name: patient.name, photoUrl: patient.photoUrl });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await clearDevice(); // family re-generated the codes
        else setProfile({ name: device.name, photoUrl: null }); // offline: still let them in
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
      setProfile({ name: data.patient.name, photoUrl: data.patient.photoUrl });
      setCode("");
    } catch (e) {
      notify("Couldn't pair this device", errorMessage(e));
    } finally {
      setPairing(false);
    }
  };

  const switchProfile = async () => {
    const ok = await confirmAction("Not you?", "This removes the picture from this device. A family member will need to give you a new code.", "Remove");
    if (!ok) return;
    const device = await loadDevice();
    if (device) {
      try {
        await api("/api/patient-device/unpair", { method: "DELETE", deviceToken: device.token });
      } catch {}
    }
    await clearDevice();
    setProfile(null);
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.brown} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile ? (
        <>
          <Text style={styles.title}>Tap your picture</Text>
          <TouchableOpacity style={styles.profileCard} onPress={() => router.replace("/patient/home")}>
            <Avatar name={profile.name} uri={profile.photoUrl} size={110} />
            <Text style={styles.profileName}>{profile.name}</Text>
          </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "stretch", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  title: { fontSize: 26, fontWeight: "700", color: "#333", marginBottom: 12, textAlign: "center" },
  sub: { fontSize: 15, color: colors.muted, textAlign: "center", marginBottom: 22 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 22, letterSpacing: 3,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border, textAlign: "center",
  },
  profileCard: { alignItems: "center", alignSelf: "center", backgroundColor: "#fff", borderRadius: 24, paddingVertical: 28, paddingHorizontal: 48, marginVertical: 20 },
  profileName: { fontSize: 24, fontWeight: "700", color: "#333", marginTop: 14 },
  small: { color: colors.muted, textAlign: "center", marginTop: 4, fontSize: 14 },
  backText: { color: "#999", textAlign: "center", marginTop: 28, fontSize: 14 },
});

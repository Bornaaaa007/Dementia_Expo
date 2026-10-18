import { MemoryBigCard } from "@/components/MemoryCard";
import { colors } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { clearDevice, loadDevice } from "@/lib/patientDevice";
import { Memory } from "@/lib/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Large, calm screen for the patient: one person at a time, big buttons, plain words.
export default function PatientMemories() {
  const router = useRouter();
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setMemories(null);
    const device = await loadDevice();
    if (!device) {
      router.replace("/patient/login");
      return;
    }
    try {
      const res = await api<{ memories: Memory[] }>("/api/patient-device/memories", {
        deviceToken: device.token,
        // If your patient calls need the face check, pass the same value here as in patient/home.tsx:
        // faceSession: <your face session value>,
      });
      setMemories(res.memories);
      setIndex(0);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearDevice();
        router.replace("/patient/login");
        return;
      }
      setError(errorMessage(e));
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const total = memories?.length ?? 0;
  const next = () => setIndex((i) => (i + 1) % total);
  const previous = () => setIndex((i) => (i - 1 + total) % total);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>People who love you</Text>

        {error ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>We couldn't load your memories right now.</Text>
            <BigButton label="Try again" onPress={load} />
          </View>
        ) : null}

        {!memories && !error ? (
          <View style={styles.message}>
            <ActivityIndicator size="large" color={colors.brown} />
            <Text style={styles.messageText}>Loading your memories…</Text>
          </View>
        ) : null}

        {memories && total === 0 ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>Your family will add photos of the people you love here.</Text>
          </View>
        ) : null}

        {memories && total > 0 ? (
          <>
            <Text style={styles.counter}>{index + 1} of {total}</Text>
            <MemoryBigCard memory={memories[index]} />
            {total > 1 ? (
              <View style={styles.navRow}>
                <BigButton label="‹  Back" onPress={previous} style={{ flex: 1 }} />
                <BigButton label="Next  ›" onPress={next} style={{ flex: 1 }} />
              </View>
            ) : null}
          </>
        ) : null}

        <BigButton label="Home" onPress={() => router.replace("/patient/home")} variant="light" />
      </ScrollView>
    </SafeAreaView>
  );
}

function BigButton({
  label, onPress, variant = "dark", style,
}: { label: string; onPress: () => void; variant?: "dark" | "light"; style?: object }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.bigButton, variant === "light" ? styles.bigButtonLight : styles.bigButtonDark, style]}
    >
      <Text style={[styles.bigButtonText, variant === "light" && { color: colors.maroon }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 18 },
  title: { fontSize: 30, fontWeight: "800", color: "#222", textAlign: "center" },
  counter: { fontSize: 20, color: colors.muted, textAlign: "center" },
  message: { alignItems: "center", gap: 16, paddingVertical: 40 },
  messageText: { fontSize: 24, lineHeight: 34, color: "#222", textAlign: "center" },
  navRow: { flexDirection: "row", gap: 14 },
  bigButton: { minHeight: 76, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigButtonDark: { backgroundColor: colors.maroon },
  bigButtonLight: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.maroon },
  bigButtonText: { fontSize: 28, fontWeight: "800", color: "#fff" },
});
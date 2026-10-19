import { colors } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { PatientLockedError, patientApi } from "@/lib/patientApi";
import { JarNote } from "@/lib/types";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type State = "idle" | "loading" | "empty" | "error";

// The Compliment & Encouragement Jar: one tap shows one kind note from the family.
export default function PatientJar() {
  const router = useRouter();
  const [note, setNote] = useState<JarNote | null>(null);
  const [state, setState] = useState<State>("idle");
  const lastId = useRef<string | null>(null);

  const open = async () => {
    setState("loading");
    try {
      const res = await patientApi<{ note: JarNote | null }>("/api/patient-device/jar/reveal", {
        method: "POST",
        body: { lastId: lastId.current ?? undefined }, // so the same note is not shown twice in a row
      });
      if (!res.note) {
        setNote(null);
        setState("empty");
        return;
      }
      lastId.current = res.note.id;
      setNote(res.note);
      setState("idle");
    } catch (e) {
      if (e instanceof PatientLockedError) {
        router.replace("/patient/login");
        return;
      }
      console.log("[jar]", errorMessage(e));
      setState("error");
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your kind notes</Text>

        {state === "loading" ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brown} />
          </View>
        ) : null}

        {state === "empty" ? (
          <View style={styles.center}>
            <Text style={styles.jar}>🫙</Text>
            <Text style={styles.message}>Your family hasn't added any notes yet. Please check again soon.</Text>
          </View>
        ) : null}

        {state === "error" ? (
          <View style={styles.center}>
            <Text style={styles.message}>We couldn't open a note right now.</Text>
            <BigButton label="Try again" onPress={open} />
          </View>
        ) : null}

        {state === "idle" && !note ? (
          <View style={styles.center}>
            <Text style={styles.jar}>🫙</Text>
            <Text style={styles.message}>Tap to open a kind note from your family.</Text>
            <BigButton label="Open a note" onPress={open} />
          </View>
        ) : null}

        {state === "idle" && note ? (
          <>
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>{note.text}</Text>
              <Text style={styles.noteFrom}>— {note.senderName}</Text>
            </View>
            <BigButton label="Another note" onPress={open} />
          </>
        ) : null}

        <BigButton label="Home" onPress={() => router.replace("/patient/home")} variant="light" />
      </ScrollView>
    </SafeAreaView>
  );
}

function BigButton({ label, onPress, variant = "dark" }: { label: string; onPress: () => void; variant?: "dark" | "light" }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.bigButton, variant === "light" ? styles.bigButtonLight : styles.bigButtonDark]}
    >
      <Text style={[styles.bigButtonText, variant === "light" && { color: colors.maroon }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 20 },
  title: { fontSize: 30, fontWeight: "800", color: "#222", textAlign: "center" },
  center: { alignItems: "center", gap: 18, paddingVertical: 30 },
  jar: { fontSize: 96 },
  message: { fontSize: 26, lineHeight: 36, color: "#222", textAlign: "center" },
  noteCard: { backgroundColor: "#fff", borderRadius: 28, padding: 28, gap: 18, borderWidth: 2, borderColor: colors.maroon },
  noteText: { fontSize: 34, lineHeight: 46, fontWeight: "700", color: "#222", textAlign: "center" },
  noteFrom: { fontSize: 24, color: colors.maroon, fontWeight: "700", textAlign: "center" },
  bigButton: { minHeight: 76, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigButtonDark: { backgroundColor: colors.maroon },
  bigButtonLight: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.maroon },
  bigButtonText: { fontSize: 28, fontWeight: "800", color: "#fff" },
});
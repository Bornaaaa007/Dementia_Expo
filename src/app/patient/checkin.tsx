import { colors } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { MOOD_EMOJI } from "@/lib/format";
import { PatientLockedError, patientApi } from "@/lib/patientApi";
import { PetStatus } from "@/lib/types";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "loading" | "hello" | "mood" | "pain" | "saving" | "done" | "error";

const MOODS = [
  { v: 1, label: "Very sad" }, { v: 2, label: "Sad" }, { v: 3, label: "Okay" }, { v: 4, label: "Good" }, { v: 5, label: "Great" },
];
const PAINS = [
  { v: 0, emoji: "😊", label: "No pain" }, { v: 1, emoji: "😕", label: "A little pain" }, { v: 2, emoji: "😣", label: "A lot of pain" },
];

// Buddy asks how you feel and whether anything hurts. The answers go to the family dashboard.
export default function PatientCheckIn() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [pet, setPet] = useState<PetStatus>({ checkedInToday: false, streak: 0 });
  const [mood, setMood] = useState(0);
  const [pain, setPain] = useState(0);
  const [justDone, setJustDone] = useState(false);

  const locked = (e: unknown) => {
    if (e instanceof PatientLockedError) {
      router.replace("/patient/login");
      return true;
    }
    return false;
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await patientApi<PetStatus>(`/api/patient-device/pet?tz=${new Date().getTimezoneOffset()}`);
        setPet(res);
        setStep(res.checkedInToday ? "done" : "hello");
      } catch (e) {
        if (locked(e)) return;
        console.log("[pet]", errorMessage(e));
        setStep("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (painValue: number) => {
    setPain(painValue);
    setStep("saving");
    try {
      await patientApi("/api/patient-device/pet/checkin", { method: "POST", body: { mood, pain: painValue } });
      setPet((p) => ({ checkedInToday: true, streak: p.checkedInToday ? p.streak : p.streak + 1 }));
      setJustDone(true);
      setStep("done");
    } catch (e) {
      if (locked(e)) return;
      console.log("[pet]", errorMessage(e));
      setStep("error");
    }
  };

  const reply =
    !justDone ? "You already said hello to Buddy today."
    : pain === 2 ? "Thank you for telling me. I've let your family know."
    : mood <= 2 ? "Thank you for telling me. I'm here with you."
    : "Buddy is so happy to see you!";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pet}>{step === "done" ? "🐶" : "🐕"}</Text>
        <Text style={styles.title}>Buddy</Text>

        {step === "loading" || step === "saving" ? <ActivityIndicator size="large" color={colors.brown} /> : null}

        {step === "hello" ? (
          <>
            <Text style={styles.message}>Hello! I missed you. Will you say hello?</Text>
            {pet.streak > 0 ? <Text style={styles.sub}>{pet.streak} day{pet.streak === 1 ? "" : "s"} in a row 🐾</Text> : null}
            <BigButton label="Say hello" onPress={() => setStep("mood")} />
          </>
        ) : null}

        {step === "mood" ? (
          <>
            <Text style={styles.message}>How are you feeling today?</Text>
            <View style={styles.moodRow}>
              {MOODS.map((m) => (
                <TouchableOpacity
                  key={m.v}
                  style={styles.moodBtn}
                  accessibilityRole="button"
                  accessibilityLabel={m.label}
                  onPress={() => { setMood(m.v); setStep("pain"); }}
                >
                  <Text style={styles.moodEmoji}>{MOOD_EMOJI[m.v]}</Text>
                  <Text style={styles.moodLabel}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        {step === "pain" ? (
          <>
            <Text style={styles.message}>Does anything hurt?</Text>
            {PAINS.map((p) => (
              <TouchableOpacity key={p.v} style={styles.painBtn} accessibilityRole="button" onPress={() => submit(p.v)}>
                <Text style={styles.painEmoji}>{p.emoji}</Text>
                <Text style={styles.painLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {step === "done" ? (
          <>
            <Text style={styles.message}>{reply}</Text>
            {pet.streak > 1 ? <Text style={styles.sub}>{pet.streak} days in a row 🐾</Text> : null}
            <BigButton label="Home" onPress={() => router.replace("/patient/home")} />
            <BigButton label="Check in again" variant="light" onPress={() => { setJustDone(false); setStep("hello"); }} />
          </>
        ) : null}

        {step === "error" ? (
          <>
            <Text style={styles.message}>Buddy couldn't hear you just now.</Text>
            <BigButton label="Try again" onPress={() => setStep("hello")} />
            <BigButton label="Home" variant="light" onPress={() => router.replace("/patient/home")} />
          </>
        ) : null}
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
  content: { padding: 20, gap: 18, alignItems: "stretch" },
  pet: { fontSize: 110, textAlign: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#222", textAlign: "center" },
  message: { fontSize: 28, lineHeight: 38, color: "#222", textAlign: "center", fontWeight: "600" },
  sub: { fontSize: 20, color: colors.brown, textAlign: "center", fontWeight: "700" },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  moodBtn: { width: "30%", minWidth: 96, backgroundColor: "#fff", borderRadius: 20, paddingVertical: 16, alignItems: "center", borderWidth: 2, borderColor: colors.border },
  moodEmoji: { fontSize: 44 },
  moodLabel: { fontSize: 16, color: "#222", fontWeight: "700", marginTop: 4 },
  painBtn: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#fff", borderRadius: 20, padding: 18, borderWidth: 2, borderColor: colors.border },
  painEmoji: { fontSize: 44 },
  painLabel: { fontSize: 26, fontWeight: "800", color: "#222" },
  bigButton: { minHeight: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigButtonDark: { backgroundColor: colors.maroon },
  bigButtonLight: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.maroon },
  bigButtonText: { fontSize: 28, fontWeight: "800", color: "#fff" },
});
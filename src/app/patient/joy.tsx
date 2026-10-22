import { colors } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { PatientLockedError, patientApi } from "@/lib/patientApi";
import { JoyItem } from "@/lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const JOY_DATE_KEY = "joy_last_date";

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

type State = "idle" | "loading" | "shown" | "empty" | "error" | "already";

export default function PatientJoy() {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [item, setItem] = useState<JoyItem | null>(null);
  const checkedRef = useRef(false);

  // On mount, check if the patient already had their joy today
  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      try {
        const last = await AsyncStorage.getItem(JOY_DATE_KEY);
        if (last === todayString()) setState("already");
      } catch {}
    })();
  }, []);

  const reveal = async () => {
    setState("loading");
    try {
      const res = await patientApi<{ item: JoyItem | null }>("/api/patient-device/joy/reveal", {
        method: "POST",
        body: {},
      });
      if (!res.item) {
        setState("empty");
        return;
      }
      await AsyncStorage.setItem(JOY_DATE_KEY, todayString()).catch(() => {});
      setItem(res.item);
      setState("shown");
    } catch (e) {
      if (e instanceof PatientLockedError) { router.replace("/patient/login"); return; }
      console.log("[joy]", errorMessage(e));
      setState("error");
    }
  };

  const override = () => setState("idle"); // let them tap again if they want

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Daily Joy ✨</Text>

        {/* Loading */}
        {state === "loading" ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brown} />
          </View>
        ) : null}

        {/* Already had joy today */}
        {state === "already" ? (
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>🌟</Text>
            <Text style={styles.message}>You already had your joy moment today. Come back tomorrow!</Text>
            <BigButton label="Show it again" onPress={override} variant="light" />
          </View>
        ) : null}

        {/* Empty — no songs or photos yet */}
        {state === "empty" ? (
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>🌱</Text>
            <Text style={styles.message}>Your family hasn't added any songs or photos yet. Check again soon!</Text>
          </View>
        ) : null}

        {/* Error */}
        {state === "error" ? (
          <View style={styles.center}>
            <Text style={styles.message}>We couldn't load your joy moment right now.</Text>
            <BigButton label="Try again" onPress={reveal} />
          </View>
        ) : null}

        {/* Prompt to tap */}
        {state === "idle" ? (
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>🎁</Text>
            <Text style={styles.message}>Tap the button for something that might make you smile.</Text>
            <BigButton label="Surprise me!" onPress={reveal} />
          </View>
        ) : null}

        {/* Show the item */}
        {state === "shown" && item ? (
          item.kind === "song" ? (
            <View style={styles.joyCard}>
              <Text style={styles.joyEmoji}>🎵</Text>
              <Text style={styles.joyTitle}>{item.title}</Text>
              {item.artist ? <Text style={styles.joySubtitle}>{item.artist}</Text> : null}
              {item.note ? (
                <Text style={styles.joyNote}>{item.note}</Text>
              ) : null}
              <Text style={styles.joyHint}>Ask a family member or carer to play this song for you!</Text>
            </View>
          ) : (
            <View style={styles.joyCard}>
              <Image
                source={{ uri: item.photoUrl }}
                style={styles.joyPhoto}
                resizeMode="cover"
                accessibilityLabel={item.caption || "A memory photo for you"}
              />
              {item.caption ? <Text style={styles.joyTitle}>{item.caption}</Text> : null}
              {item.takenAt ? <Text style={styles.joySubtitle}>📅 {item.takenAt}</Text> : null}
            </View>
          )
        ) : null}

        <BigButton label="Home" onPress={() => router.replace("/patient/home")} variant="light" />
      </ScrollView>
    </SafeAreaView>
  );
}

function BigButton({
  label, onPress, variant = "dark",
}: { label: string; onPress: () => void; variant?: "dark" | "light" }) {
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
  content: { padding: 20, gap: 18 },
  title:    { fontSize: 30, fontWeight: "800", color: "#222", textAlign: "center" },
  center:   { alignItems: "center", gap: 18, paddingVertical: 30 },
  bigEmoji: { fontSize: 90 },
  message:  { fontSize: 26, lineHeight: 36, color: "#222", textAlign: "center" },

  joyCard: {
    backgroundColor: "#fff", borderRadius: 28, padding: 24, gap: 14,
    borderWidth: 2, borderColor: colors.maroon, alignItems: "center",
  },
  joyEmoji:    { fontSize: 80 },
  joyPhoto:    { width: "100%", height: 280, borderRadius: 20 },
  joyTitle:    { fontSize: 30, fontWeight: "800", color: "#222", textAlign: "center" },
  joySubtitle: { fontSize: 22, color: colors.muted, textAlign: "center" },
  joyNote:     { fontSize: 22, color: colors.brown, fontStyle: "italic", textAlign: "center", lineHeight: 32 },
  joyHint:     { fontSize: 18, color: colors.muted, textAlign: "center" },

  bigButton:      { minHeight: 76, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigButtonDark:  { backgroundColor: colors.maroon },
  bigButtonLight: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.maroon },
  bigButtonText:  { fontSize: 28, fontWeight: "800", color: "#fff" },
});
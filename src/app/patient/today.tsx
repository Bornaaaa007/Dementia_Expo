import { colors } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { PatientLockedError, patientApi } from "@/lib/patientApi";
import { TodayItem } from "@/lib/types";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Today's medicines and routines. Confirming asks "Did you take it?" first, so a stray tap doesn't log a dose.
export default function PatientToday() {
  const router = useRouter();
  const [items, setItems] = useState<TodayItem[] | null>(null);
  const [error, setError] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await patientApi<{ items: TodayItem[] }>(`/api/patient-device/today?tz=${new Date().getTimezoneOffset()}`);
      setItems(res.items);
    } catch (e) {
      if (e instanceof PatientLockedError) {
        router.replace("/patient/login");
        return;
      }
      console.log("[today]", errorMessage(e));
      setError(true);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const done = async (item: TodayItem) => {
    setBusyId(item.id);
    setMessage(null);
    try {
      await patientApi(`/api/patient-device/reminders/${item.id}/done`, { method: "POST", body: {} });
      setConfirmId(null);
      await load();
    } catch (e) {
      if (e instanceof PatientLockedError) {
        router.replace("/patient/login");
        return;
      }
      setMessage(errorMessage(e));
      setConfirmId(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Today</Text>

        {items === null && !error ? <ActivityIndicator size="large" color={colors.brown} /> : null}

        {error ? (
          <View style={styles.center}>
            <Text style={styles.message}>We couldn't load your day right now.</Text>
            <BigButton label="Try again" onPress={load} />
          </View>
        ) : null}

        {items && items.length === 0 ? <Text style={styles.message}>Nothing is planned for today.</Text> : null}
        {message ? <Text style={styles.warn}>{message}</Text> : null}

        {items?.map((it) => {
          const finished = it.status === "taken";
          const asking = confirmId === it.id;
          return (
            <View key={it.id} style={[styles.card, it.status === "due" && styles.cardDue, finished && styles.cardDone]}>
              <Text style={styles.time}>{formatTime(it.scheduledAt)}</Text>
              <Text style={styles.itemTitle}>{it.kind === "medication" ? "💊 " : "🌿 "}{it.title}</Text>
              {it.dose ? <Text style={styles.dose}>{it.dose}</Text> : null}

              {finished ? (
                <Text style={styles.done}>✓ Done</Text>
              ) : asking ? (
                <View style={{ gap: 12 }}>
                  <Text style={styles.ask}>{it.kind === "medication" ? "Did you take it?" : "Did you do it?"}</Text>
                  <BigButton label="Yes" onPress={() => done(it)} loading={busyId === it.id} />
                  <BigButton label="Not yet" onPress={() => setConfirmId(null)} variant="light" />
                </View>
              ) : it.canTake ? (
                <BigButton label={it.kind === "medication" ? "I took it" : "I did it"} onPress={() => setConfirmId(it.id)} />
              ) : it.status === "missed" ? (
                <Text style={styles.late}>This one has passed. Please tell your family.</Text>
              ) : (
                <Text style={styles.later}>Later today</Text>
              )}
            </View>
          );
        })}

        <BigButton label="Home" onPress={() => router.replace("/patient/home")} variant="light" />
      </ScrollView>
    </SafeAreaView>
  );
}

function BigButton({ label, onPress, variant = "dark", loading }: { label: string; onPress: () => void; variant?: "dark" | "light"; loading?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={[styles.bigButton, variant === "light" ? styles.bigButtonLight : styles.bigButtonDark, loading && { opacity: 0.6 }]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "light" ? colors.maroon : "#fff"} />
      ) : (
        <Text style={[styles.bigButtonText, variant === "light" && { color: colors.maroon }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 32, fontWeight: "800", color: "#222", textAlign: "center" },
  center: { alignItems: "center", gap: 18, paddingVertical: 30 },
  message: { fontSize: 24, lineHeight: 34, color: "#222", textAlign: "center" },
  warn: { fontSize: 20, color: colors.maroon, textAlign: "center", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 22, gap: 10, borderWidth: 2, borderColor: colors.border },
  cardDue: { borderColor: colors.maroon },
  cardDone: { backgroundColor: "#E3F2E5", borderColor: colors.good },
  time: { fontSize: 22, color: colors.muted, fontWeight: "700" },
  itemTitle: { fontSize: 30, fontWeight: "800", color: "#222" },
  dose: { fontSize: 20, color: colors.muted },
  done: { fontSize: 28, fontWeight: "800", color: colors.good },
  ask: { fontSize: 26, fontWeight: "700", color: "#222", textAlign: "center" },
  late: { fontSize: 20, color: colors.maroon },
  later: { fontSize: 20, color: colors.muted },
  bigButton: { minHeight: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigButtonDark: { backgroundColor: colors.maroon },
  bigButtonLight: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.maroon },
  bigButtonText: { fontSize: 28, fontWeight: "800", color: "#fff" },
});
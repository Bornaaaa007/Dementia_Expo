import { colors } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { PatientLockedError, patientApi } from "@/lib/patientApi";
import { PatientMessage } from "@/lib/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Messages from family: large text, one clear button. Tapping "Got it" marks the message as read for the family.
export default function PatientMessages() {
  const router = useRouter();
  const [messages, setMessages] = useState<PatientMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lock = useCallback(() => router.replace("/patient/login"), [router]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await patientApi<{ messages: PatientMessage[] }>("/api/patient-device/messages");
      setMessages(res.messages);
    } catch (e) {
      if (e instanceof PatientLockedError) return lock();
      setError(errorMessage(e));
    }
  }, [lock]);

  useEffect(() => {
    load();
  }, [load]);

  const gotIt = async (id: string) => {
    setMessages((list) => list?.map((m) => (m.id === id ? { ...m, read: true } : m)) ?? null); // instant feedback
    try {
      await patientApi(`/api/patient-device/messages/${id}/read`, { method: "POST", body: {} });
    } catch (e) {
      if (e instanceof PatientLockedError) return lock();
      load(); // saving failed: show the real state again
    }
  };

  const unread = messages?.filter((m) => !m.read).length ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Messages from your family</Text>
        {unread > 0 ? <Text style={styles.newCount}>{unread === 1 ? "You have 1 new message" : `You have ${unread} new messages`}</Text> : null}

        {error ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>We couldn't load your messages right now.</Text>
            <BigButton label="Try again" onPress={load} />
          </View>
        ) : null}

        {!messages && !error ? (
          <View style={styles.message}>
            <ActivityIndicator size="large" color={colors.brown} />
            <Text style={styles.messageText}>Loading your messages…</Text>
          </View>
        ) : null}

        {messages && messages.length === 0 ? (
          <View style={styles.message}>
            <Text style={styles.messageText}>No messages yet. When your family writes to you, it will appear here.</Text>
          </View>
        ) : null}

        {messages?.map((m) => (
          <View key={m.id} style={[styles.card, !m.read && styles.cardNew]}>
            <View style={styles.cardTop}>
              <Text style={styles.from}>From {m.senderName}</Text>
              {!m.read ? (
                <View style={styles.newTag}>
                  <Text style={styles.newTagText}>NEW</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.body}>{m.text}</Text>
            <Text style={styles.time}>{timeAgo(m.sentAt)}</Text>
            {!m.read ? <BigButton label="Got it ✓" onPress={() => gotIt(m.id)} /> : <Text style={styles.readTag}>✓ Read</Text>}
          </View>
        ))}

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
  content: { padding: 20, gap: 18 },
  title: { fontSize: 30, fontWeight: "800", color: "#222", textAlign: "center" },
  newCount: { fontSize: 22, color: colors.maroon, fontWeight: "700", textAlign: "center" },
  message: { alignItems: "center", gap: 16, paddingVertical: 40 },
  messageText: { fontSize: 24, lineHeight: 34, color: "#222", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 22, gap: 12, borderWidth: 2, borderColor: colors.border },
  cardNew: { borderColor: colors.maroon },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  from: { fontSize: 24, fontWeight: "800", color: "#222", flexShrink: 1 },
  newTag: { backgroundColor: colors.maroon, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 },
  newTagText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  body: { fontSize: 28, lineHeight: 38, color: "#222" },
  time: { fontSize: 16, color: colors.muted },
  readTag: { fontSize: 18, color: colors.good, fontWeight: "700" },
  bigButton: { minHeight: 76, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigButtonDark: { backgroundColor: colors.maroon },
  bigButtonLight: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.maroon },
  bigButtonText: { fontSize: 28, fontWeight: "800", color: "#fff" },
});
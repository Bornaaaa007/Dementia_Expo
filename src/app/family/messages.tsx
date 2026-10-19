import { Banner, Button, Card, Pill, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { confirmAction, notify } from "@/lib/notify";
import { FamilyMessage } from "@/lib/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "message" | "jar";
const MAX = 300;

export default function FamilyMessages() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const [tab, setTab] = useState<Tab>("message");
  const [items, setItems] = useState<FamilyMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) {
      setError("No patient selected. Go back and choose a patient first.");
      return;
    }
    try {
      setError(null);
      const res = await api<{ messages: FamilyMessage[] }>(`/api/patients/${patientId}/messages?kind=${tab}`);
      setItems(res.messages);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [patientId, tab]);

  // reload when the screen is shown and whenever the tab changes
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setItems(null);
    setText("");
    setTab(next);
  };

  const send = async () => {
    if (!patientId) return;
    if (!text.trim()) return notify(tab === "jar" ? "Write a kind note first" : "Write a message first");
    setSending(true);
    try {
      await api(`/api/patients/${patientId}/messages`, { body: { kind: tab, text: text.trim() } });
      setText("");
      await load();
    } catch (e) {
      notify("Couldn't send", errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const remove = async (m: FamilyMessage) => {
    const ok = await confirmAction(
      "Delete this?",
      tab === "jar" ? "This note will leave the jar." : "The patient will no longer see this message.",
      "Delete"
    );
    if (!ok) return;
    try {
      await api(`/api/patients/${patientId}/messages/${m.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      notify("Couldn't delete", errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Messages</Text>

          <View style={styles.tabs}>
            <TabButton label="Messages" active={tab === "message"} onPress={() => switchTab("message")} />
            <TabButton label="Encouragement jar" active={tab === "jar"} onPress={() => switchTab("jar")} />
          </View>

          <Text style={styles.sub}>
            {tab === "message"
              ? "Short texts for the patient. They appear on the patient's device, and you can see when they have been read."
              : "Add short, kind notes. The patient taps the jar to open a random one, and each tap counts as a light check-in."}
          </Text>

          <Card>
            <TextInput
              style={styles.input}
              placeholder={tab === "jar" ? "e.g. You make every day brighter." : "e.g. Coming to visit on Friday!"}
              value={text}
              onChangeText={setText}
              maxLength={MAX}
              multiline
            />
            <Text style={styles.counter}>{text.length}/{MAX}</Text>
            <Button title={tab === "jar" ? "Add to the jar" : "Send message"} onPress={send} loading={sending} disabled={!patientId} />
          </Card>

          {error ? (
            <Banner tone="danger" title="Couldn't load" text={error}>
              <View style={{ marginTop: 10 }}>
                <Button title="Try again" small onPress={load} />
              </View>
            </Banner>
          ) : null}

          {!items && !error ? <ActivityIndicator style={{ marginTop: 24 }} color={colors.maroon} /> : null}

          {items && items.length === 0 ? (
            <Card>
              <Text style={styles.emptyTitle}>{tab === "jar" ? "The jar is empty" : "No messages yet"}</Text>
              <Text style={styles.emptyText}>
                {tab === "jar" ? "Add a few kind notes so there is always something nice to open." : "Your messages will be listed here with their read status."}
              </Text>
            </Card>
          ) : null}

          {items?.map((m) => (
            <Card key={m.id}>
              <View style={styles.rowTop}>
                <Text style={styles.sender}>{m.senderName}</Text>
                {tab === "message" ? (
                  <Pill label={m.read ? `Read ${timeAgo(m.readAt)}` : "Not read yet"} tone={m.read ? "good" : "neutral"} />
                ) : null}
              </View>
              <Text style={styles.body}>{m.text}</Text>
              <View style={styles.rowTop}>
                <Text style={styles.time}>Sent {timeAgo(m.sentAt)}</Text>
                {m.canDelete ? (
                  <TouchableOpacity onPress={() => remove(m)}>
                    <Text style={styles.delete}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </Card>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, active && styles.tabActive]} accessibilityRole="tab">
      <Text style={{ color: active ? "#fff" : colors.maroon, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  back: { color: colors.maroon, fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 12 },
  tabs: { flexDirection: "row", gap: 10, marginBottom: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.maroon, backgroundColor: "#fff" },
  tabActive: { backgroundColor: colors.maroon },
  sub: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 14 },
  input: {
    backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 90,
    textAlignVertical: "top", borderWidth: 1, borderColor: colors.border,
  },
  counter: { alignSelf: "flex-end", fontSize: 12, color: colors.muted, marginVertical: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sender: { fontSize: 15, fontWeight: "700", color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 23, marginVertical: 10 },
  time: { fontSize: 12, color: colors.muted },
  delete: { fontSize: 13, color: colors.danger, fontWeight: "600" },
});
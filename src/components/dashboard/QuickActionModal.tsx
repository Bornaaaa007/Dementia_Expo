import { Button, colors } from "@/components/ui";
import { MOOD_EMOJI } from "@/lib/format";
import { notify } from "@/lib/notify";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export type QuickMode = "reminder" | "mood" | "note";

export type QuickPayload =
  | { mode: "reminder"; title: string; kind: "medication" | "routine"; scheduledAt: string }
  | { mode: "mood"; value: number; message: string }
  | { mode: "note"; message: string };

export function QuickActionModal({
  mode, busy, onClose, onSubmit,
}: { mode: QuickMode | null; busy: boolean; onClose: () => void; onSubmit: (payload: QuickPayload) => void }) {
  return (
    <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.sheet}>{mode ? <Form key={mode} mode={mode} busy={busy} onClose={onClose} onSubmit={onSubmit} /> : null}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Form({ mode, busy, onClose, onSubmit }: { mode: QuickMode; busy: boolean; onClose: () => void; onSubmit: (p: QuickPayload) => void }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [tomorrow, setTomorrow] = useState(false);
  const [kind, setKind] = useState<"medication" | "routine">("medication");
  const [mood, setMood] = useState(0);
  const [text, setText] = useState("");

  const submit = () => {
    if (mode === "note") {
      if (!text.trim()) return notify("Write a note first");
      return onSubmit({ mode: "note", message: text.trim() });
    }
    if (mode === "mood") {
      if (!mood) return notify("Pick a mood", "Tap one of the faces.");
      return onSubmit({ mode: "mood", value: mood, message: text.trim() });
    }
    // reminder
    if (!title.trim()) return notify("Missing title", "What should the reminder say?");
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
    if (!match) return notify("Check the time", "Use 24-hour format, for example 08:30 or 20:00.");
    const when = new Date();
    when.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (tomorrow) when.setDate(when.getDate() + 1);
    else if (when.getTime() < Date.now()) return notify("That time has passed today", "Choose Tomorrow or a later time.");
    onSubmit({ mode: "reminder", title: title.trim(), kind, scheduledAt: when.toISOString() });
  };

  return (
    <>
      <Text style={styles.title}>{mode === "reminder" ? "Add a reminder" : mode === "mood" ? "Log mood" : "Add a note"}</Text>

      {mode === "reminder" ? (
        <>
          <TextInput style={styles.input} placeholder="e.g. Evening medication" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Time, 24-hour (e.g. 20:00)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
          <View style={styles.toggleRow}>
            <Choice label="Today" active={!tomorrow} onPress={() => setTomorrow(false)} />
            <Choice label="Tomorrow" active={tomorrow} onPress={() => setTomorrow(true)} />
          </View>
          <View style={styles.toggleRow}>
            <Choice label="Medication" active={kind === "medication"} onPress={() => setKind("medication")} />
            <Choice label="Routine" active={kind === "routine"} onPress={() => setKind("routine")} />
          </View>
        </>
      ) : null}

      {mode === "mood" ? (
        <>
          <View style={styles.moodRow}>
            {[1, 2, 3, 4, 5].map((v) => (
              <TouchableOpacity key={v} onPress={() => setMood(v)} style={[styles.moodBtn, mood === v && styles.moodBtnActive]} accessibilityLabel={`Mood ${v}`}>
                <Text style={{ fontSize: 30 }}>{MOOD_EMOJI[v]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Optional note (what did you notice?)" value={text} onChangeText={setText} />
        </>
      ) : null}

      {mode === "note" ? (
        <TextInput style={[styles.input, { height: 100, textAlignVertical: "top" }]} placeholder="Write a note for the family" value={text} onChangeText={setText} multiline />
      ) : null}

      <View style={{ gap: 10, marginTop: 6 }}>
        <Button title="Save" onPress={submit} loading={busy} />
        <Button title="Cancel" variant="secondary" onPress={onClose} disabled={busy} />
      </View>
    </>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={{ color: active ? "#fff" : colors.maroon, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  title: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 14 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  choice: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.maroon, backgroundColor: "#fff" },
  choiceActive: { backgroundColor: colors.maroon },
  moodRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  moodBtn: { padding: 8, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  moodBtnActive: { borderColor: colors.maroon, backgroundColor: "#fff" },
});

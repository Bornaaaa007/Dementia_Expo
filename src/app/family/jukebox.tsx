import { colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { Song } from "@/lib/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Mode = "list" | "add" | "edit";

interface FormState {
  title: string;
  artist: string;
  note: string;
  youtubeUrl: string;
}

const empty: FormState = { title: "", artist: "", note: "", youtubeUrl: "" };

function isValidYoutubeUrl(url: string): boolean {
  if (!url.trim()) return true; // optional field
  return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(url.trim());
}

export default function FamilyJukebox() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [form, setForm] = useState<FormState>(empty);
  const [editTarget, setEditTarget] = useState<Song | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setSongs(null);
    try {
      const res = await api<{ songs: Song[] }>(`/api/patients/${patientId}/jukebox`);
      setSongs(res.songs);
    } catch (e) { setError(errorMessage(e)); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const startAdd = () => { setForm(empty); setEditTarget(null); setMode("add"); };
  const startEdit = (s: Song) => {
    setForm({ title: s.title, artist: s.artist, note: s.note, youtubeUrl: s.audioUrl ?? "" });
    setEditTarget(s);
    setMode("edit");
  };

  const save = async () => {
    if (!form.title.trim()) { Alert.alert("Please enter a song title"); return; }
    if (!isValidYoutubeUrl(form.youtubeUrl)) {
      Alert.alert("Invalid link", "Please enter a valid YouTube link, e.g.\nhttps://www.youtube.com/watch?v=...\nor leave it empty.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title,
        artist: form.artist,
        note: form.note,
        audioUrl: form.youtubeUrl.trim(), // stored in audioUrl field
      };
      if (mode === "add") {
        await api(`/api/patients/${patientId}/jukebox`, { method: "POST", body });
      } else if (editTarget) {
        await api(`/api/patients/${patientId}/jukebox/${editTarget.id}`, { method: "PUT", body });
      }
      await load();
      setMode("list");
    } catch (e) { Alert.alert("Error", errorMessage(e)); }
    finally { setSaving(false); }
  };

  const remove = (s: Song) => {
    Alert.alert("Remove song", `Remove "${s.title}" from the jukebox?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/patients/${patientId}/jukebox/${s.id}`, { method: "DELETE" });
            await load();
          } catch (e) { Alert.alert("Error", errorMessage(e)); }
        },
      },
    ]);
  };

  // ── Add / Edit form ─────────────────────────────────────────────────────────
  if (mode === "add" || mode === "edit") {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{mode === "add" ? "Add a song" : "Edit song"}</Text>

          <Text style={styles.label}>Song title *</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="e.g. What a Wonderful World"
            maxLength={120}
          />

          <Text style={styles.label}>Artist</Text>
          <TextInput
            style={styles.input}
            value={form.artist}
            onChangeText={(v) => setForm((f) => ({ ...f, artist: v }))}
            placeholder="e.g. Louis Armstrong"
            maxLength={80}
          />

          <Text style={styles.label}>YouTube link (optional)</Text>
          <TextInput
            style={styles.input}
            value={form.youtubeUrl}
            onChangeText={(v) => setForm((f) => ({ ...f, youtubeUrl: v }))}
            placeholder="https://www.youtube.com/watch?v=..."
            autoCapitalize="none"
            keyboardType="url"
            maxLength={300}
          />
          <Text style={styles.hint}>
            💡 Go to YouTube, find the song, tap Share → Copy link, then paste it here. The patient can tap "Play on YouTube" to open it directly.
          </Text>

          <Text style={styles.label}>Personal note (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.note}
            onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
            placeholder='e.g. "Grandma loved to hum this in the kitchen"'
            maxLength={300}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save song</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode("list")}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Song list ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Memory Jukebox 🎵</Text>

        {error ? (
          <View style={styles.center}>
            <Text style={styles.message}>{error}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={load}>
              <Text style={styles.saveBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!songs && !error ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brown} />
          </View>
        ) : null}

        {songs && songs.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>🎵</Text>
            <Text style={styles.message}>No songs yet. Add a song your loved one enjoys!</Text>
          </View>
        ) : null}

        {songs?.map((s) => (
          <View key={s.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              {s.artist ? <Text style={styles.rowSub}>{s.artist}</Text> : null}
              {s.note ? <Text style={styles.rowNote}>{s.note}</Text> : null}
              {s.audioUrl ? (
                <Text style={styles.rowYt}>🔗 YouTube link added</Text>
              ) : (
                <Text style={styles.rowNoYt}>No YouTube link yet</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(s)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(s)}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={startAdd}>
          <Text style={styles.saveBtnText}>+ Add a song</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.bg },
  content:  { padding: 20, gap: 14 },
  title:    { fontSize: 28, fontWeight: "800", color: "#222", textAlign: "center" },
  center:   { alignItems: "center", gap: 16, paddingVertical: 30 },
  message:  { fontSize: 20, color: "#222", textAlign: "center" },
  bigEmoji: { fontSize: 64 },
  label:    { fontSize: 18, fontWeight: "700", color: "#222" },
  input:    { borderWidth: 2, borderColor: "#ccc", borderRadius: 14, padding: 14, fontSize: 18, backgroundColor: "#fff" },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  hint:     { fontSize: 15, color: colors.muted, lineHeight: 22, backgroundColor: "#f0f0f0", borderRadius: 12, padding: 14 },

  row:       { backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 2, borderColor: "#ddd" },
  rowText:   { flex: 1, gap: 4 },
  rowTitle:  { fontSize: 20, fontWeight: "800", color: "#222" },
  rowSub:    { fontSize: 16, color: colors.muted },
  rowNote:   { fontSize: 15, color: colors.brown, fontStyle: "italic" },
  rowYt:     { fontSize: 14, color: "#c00" },
  rowNoYt:   { fontSize: 14, color: colors.muted },

  editBtn:      { backgroundColor: colors.brown, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  editBtnText:  { color: "#fff", fontWeight: "700", fontSize: 16 },
  deleteBtn:     { backgroundColor: "#c00", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  deleteBtnText: { color: "#fff", fontWeight: "800", fontSize: 18 },

  saveBtn:      { backgroundColor: colors.maroon, borderRadius: 16, minHeight: 60, alignItems: "center", justifyContent: "center" },
  saveBtnText:  { color: "#fff", fontSize: 22, fontWeight: "800" },
  cancelBtn:     { backgroundColor: "#fff", borderRadius: 16, minHeight: 60, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.maroon },
  cancelBtnText: { color: colors.maroon, fontSize: 22, fontWeight: "800" },
});
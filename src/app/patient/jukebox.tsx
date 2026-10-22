import { colors } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { PatientLockedError, patientApi } from "@/lib/patientApi";
import { Song, SongListItem } from "@/lib/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Screen = "list" | "playing";

export default function PatientJukebox() {
  const router = useRouter();
  const [songs, setSongs] = useState<SongListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("list");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Song | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setSongs(null);
    try {
      const res = await patientApi<{ songs: SongListItem[] }>("/api/patient-device/jukebox");
      setSongs(res.songs);
    } catch (e) {
      if (e instanceof PatientLockedError) { router.replace("/patient/login"); return; }
      setError(errorMessage(e));
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const open = async (song: SongListItem) => {
    setLoading(true);
    try {
      const res = await patientApi<{ song: Song }>(`/api/patient-device/jukebox/${song.id}`);
      setCurrent(res.song);
      setScreen("playing");
    } catch (e) {
      if (e instanceof PatientLockedError) { router.replace("/patient/login"); return; }
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const openYoutube = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot open link", "Please ask a family member for help.");
      }
    } catch {
      Alert.alert("Cannot open link", "Please ask a family member for help.");
    }
  };

  // ── Now playing screen ──────────────────────────────────────────────────────
  if (screen === "playing" && current) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.nowLabel}>Now playing</Text>

          <View style={styles.disc}>
            <Text style={styles.discIcon}>🎵</Text>
          </View>

          <Text style={styles.songTitle}>{current.title}</Text>
          {current.artist ? <Text style={styles.songArtist}>{current.artist}</Text> : null}

          {current.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>"{current.note}"</Text>
            </View>
          ) : null}

          {current.audioUrl ? (
            // audioUrl holds the YouTube link
            <TouchableOpacity
              style={styles.ytButton}
              onPress={() => openYoutube(current.audioUrl!)}
              accessibilityRole="button"
            >
              <Text style={styles.ytButtonText}>▶  Play on YouTube</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noLinkBox}>
              <Text style={styles.noLinkText}>
                No YouTube link yet. Ask your family to add one!
              </Text>
            </View>
          )}

          <BigButton label="Back to songs" onPress={() => setScreen("list")} variant="light" />
          <BigButton label="Home" onPress={() => router.replace("/patient/home")} variant="light" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Song list ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your music 🎶</Text>

        {error ? (
          <View style={styles.center}>
            <Text style={styles.message}>Couldn't load your songs right now.</Text>
            <BigButton label="Try again" onPress={load} />
          </View>
        ) : null}

        {!songs && !error ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brown} />
            <Text style={styles.message}>Loading your music…</Text>
          </View>
        ) : null}

        {songs && songs.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>🎵</Text>
            <Text style={styles.message}>Your family will add songs for you here.</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brown} />
          </View>
        ) : null}

        {songs && songs.length > 0 && !loading
          ? songs.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.songRow}
                onPress={() => open(s)}
                accessibilityRole="button"
              >
                <Text style={styles.songRowIcon}>🎵</Text>
                <View style={styles.songRowText}>
                  <Text style={styles.songRowTitle}>{s.title}</Text>
                  {s.artist ? <Text style={styles.songRowArtist}>{s.artist}</Text> : null}
                  {s.note   ? <Text style={styles.songRowNote}>{s.note}</Text>   : null}
                </View>
                <Text style={styles.playArrow}>▶</Text>
              </TouchableOpacity>
            ))
          : null}

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
  screen:  { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16 },
  title:   { fontSize: 30, fontWeight: "800", color: "#222", textAlign: "center" },
  center:  { alignItems: "center", gap: 16, paddingVertical: 30 },
  message: { fontSize: 24, lineHeight: 34, color: "#222", textAlign: "center" },
  bigEmoji:{ fontSize: 80 },

  // Song list
  songRow:       { backgroundColor: "#fff", borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 2, borderColor: colors.maroon },
  songRowIcon:   { fontSize: 32 },
  songRowText:   { flex: 1, gap: 4 },
  songRowTitle:  { fontSize: 24, fontWeight: "800", color: "#222" },
  songRowArtist: { fontSize: 18, color: colors.muted },
  songRowNote:   { fontSize: 16, color: colors.brown, fontStyle: "italic" },
  playArrow:     { fontSize: 28, color: colors.maroon, fontWeight: "800" },

  // Now playing
  nowLabel:   { fontSize: 22, color: colors.muted, textAlign: "center" },
  disc:       { alignItems: "center", paddingVertical: 20 },
  discIcon:   { fontSize: 100 },
  songTitle:  { fontSize: 34, fontWeight: "800", color: "#222", textAlign: "center" },
  songArtist: { fontSize: 24, color: colors.muted, textAlign: "center" },
  noteBox:    { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 2, borderColor: colors.maroon },
  noteText:   { fontSize: 22, lineHeight: 32, color: "#222", textAlign: "center", fontStyle: "italic" },

  // YouTube button — big, red, hard to miss
  ytButton: {
    backgroundColor: "#FF0000",
    borderRadius: 20,
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  ytButtonText: { fontSize: 28, fontWeight: "800", color: "#fff" },

  noLinkBox:  { backgroundColor: "#f0f0f0", borderRadius: 16, padding: 18 },
  noLinkText: { fontSize: 20, lineHeight: 30, color: "#444", textAlign: "center" },

  bigButton:      { minHeight: 76, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  bigButtonDark:  { backgroundColor: colors.maroon },
  bigButtonLight: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.maroon },
  bigButtonText:  { fontSize: 28, fontWeight: "800", color: "#fff" },
});
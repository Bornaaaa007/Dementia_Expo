import { colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pickPhoto } from "@/lib/image";
import { GalleryPhoto } from "@/lib/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Mode = "grid" | "add" | "view";

interface FormState {
  photo: string; // data URL from pickPhoto(), same as the loved-ones form
  caption: string;
  takenAt: string;
}

const emptyForm: FormState = { photo: "", caption: "", takenAt: "" };

// Photos saved by an old version only stored a path on the phone, so there is no image left to show
const isStored = (url: string) => url.startsWith("data:image/") || url.startsWith("http");

export default function FamilyGallery() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("grid");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [viewing, setViewing] = useState<GalleryPhoto | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setPhotos(null);
    try {
      const res = await api<{ photos: GalleryPhoto[] }>(`/api/patients/${patientId}/gallery`);
      setPhotos(res.photos);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  // Same helper the loved-ones form uses: picks the photo, shrinks it, returns a data URL
  const choosePhoto = async () => {
    const picked = await pickPhoto();
    if (picked) setForm((f) => ({ ...f, photo: picked }));
  };

  const save = async () => {
    if (!form.photo) {
      Alert.alert("Please choose a photo first");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/patients/${patientId}/gallery`, {
        method: "POST",
        body: { photoUrl: form.photo, caption: form.caption, takenAt: form.takenAt },
      });
      await load();
      setMode("grid");
      setForm(emptyForm);
    } catch (e) {
      Alert.alert("Couldn't save the photo", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = (p: GalleryPhoto) => {
    Alert.alert("Remove photo", "Remove this photo from the gallery?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/patients/${patientId}/gallery/${p.id}`, { method: "DELETE" });
            setViewing(null);
            setMode("grid");
            await load();
          } catch (e) {
            Alert.alert("Error", errorMessage(e));
          }
        },
      },
    ]);
  };

  // ── Add form ────────────────────────────────────────────────────────────────
  if (mode === "add") {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add a photo</Text>

          <TouchableOpacity style={styles.pickBtn} onPress={choosePhoto}>
            {form.photo ? (
              <Image source={{ uri: form.photo }} style={styles.preview} resizeMode="cover" />
            ) : (
              <Text style={styles.pickBtnText}>📷  Choose a photo</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={styles.input}
            value={form.caption}
            onChangeText={(v) => setForm((f) => ({ ...f, caption: v }))}
            placeholder="e.g. A day at the beach with family"
            maxLength={200}
          />

          <Text style={styles.label}>When was this taken?</Text>
          <TextInput
            style={styles.input}
            value={form.takenAt}
            onChangeText={(v) => setForm((f) => ({ ...f, takenAt: v }))}
            placeholder="e.g. Summer 2019"
            maxLength={30}
          />

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save photo</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setMode("grid");
              setForm(emptyForm);
            }}
            disabled={saving}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Single photo view ───────────────────────────────────────────────────────
  if (mode === "view" && viewing) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          {isStored(viewing.photoUrl) ? (
            <Image source={{ uri: viewing.photoUrl }} style={styles.bigPhoto} resizeMode="contain" />
          ) : (
            <View style={[styles.bigPhoto, styles.missing]}>
              <Text style={styles.missingEmoji}>⚠️</Text>
              <Text style={styles.missingText}>
                This photo was never saved properly, so it can't be shown. Remove it and add it again.
              </Text>
            </View>
          )}
          {viewing.caption ? <Text style={styles.viewCaption}>{viewing.caption}</Text> : null}
          {viewing.takenAt ? <Text style={styles.viewDate}>📅 {viewing.takenAt}</Text> : null}
          <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(viewing)}>
            <Text style={styles.deleteBtnText}>Remove photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setViewing(null);
              setMode("grid");
            }}
          >
            <Text style={styles.cancelBtnText}>Back to gallery</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Grid ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Memory Gallery 📷</Text>

        {error ? (
          <View style={styles.center}>
            <Text style={styles.message}>{error}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={load}>
              <Text style={styles.saveBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!photos && !error ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brown} />
          </View>
        ) : null}

        {photos && photos.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.bigEmoji}>📷</Text>
            <Text style={styles.message}>No photos yet. Add a photo your loved one will enjoy!</Text>
          </View>
        ) : null}

        {photos && photos.length > 0 ? (
          <View style={styles.grid}>
            {photos.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.thumb}
                onPress={() => {
                  setViewing(p);
                  setMode("view");
                }}
              >
                {isStored(p.photoUrl) ? (
                  <Image source={{ uri: p.photoUrl }} style={styles.thumbImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumbImg, styles.missing]}>
                    <Text style={styles.missingEmoji}>⚠️</Text>
                    <Text style={styles.missingSmall}>Photo missing</Text>
                  </View>
                )}
                {p.caption ? (
                  <Text style={styles.thumbCaption} numberOfLines={2}>
                    {p.caption}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.saveBtn} onPress={() => setMode("add")}>
          <Text style={styles.saveBtnText}>+ Add a photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: "800", color: "#222", textAlign: "center" },
  center: { alignItems: "center", gap: 16, paddingVertical: 30 },
  message: { fontSize: 20, color: "#222", textAlign: "center" },
  bigEmoji: { fontSize: 64 },
  label: { fontSize: 18, fontWeight: "700", color: "#222" },
  input: { borderWidth: 2, borderColor: "#ccc", borderRadius: 14, padding: 14, fontSize: 18, backgroundColor: "#fff" },

  pickBtn: {
    borderWidth: 2, borderColor: colors.maroon, borderRadius: 16, minHeight: 160, alignItems: "center",
    justifyContent: "center", backgroundColor: "#fff", overflow: "hidden",
  },
  pickBtnText: { fontSize: 22, color: colors.maroon, fontWeight: "700" },
  preview: { width: "100%", height: 220 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  thumb: { width: 155, borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", borderWidth: 2, borderColor: "#ddd" },
  thumbImg: { width: 155, height: 130 },
  thumbCaption: { fontSize: 13, color: "#222", padding: 6, lineHeight: 18 },

  missing: { backgroundColor: "#FFF1D6", alignItems: "center", justifyContent: "center", padding: 12, gap: 6 },
  missingEmoji: { fontSize: 32 },
  missingSmall: { fontSize: 13, color: colors.warn, fontWeight: "700" },
  missingText: { fontSize: 16, color: colors.warn, textAlign: "center", lineHeight: 22 },

  bigPhoto: { width: "100%", height: 320, borderRadius: 20 },
  viewCaption: { fontSize: 24, fontWeight: "700", color: "#222", textAlign: "center" },
  viewDate: { fontSize: 18, color: colors.muted, textAlign: "center" },

  saveBtn: { backgroundColor: colors.maroon, borderRadius: 16, minHeight: 60, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  cancelBtn: {
    backgroundColor: "#fff", borderRadius: 16, minHeight: 60, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.maroon,
  },
  cancelBtnText: { color: colors.maroon, fontSize: 22, fontWeight: "800" },
  deleteBtn: { backgroundColor: "#c00", borderRadius: 16, minHeight: 60, alignItems: "center", justifyContent: "center" },
  deleteBtnText: { color: "#fff", fontSize: 22, fontWeight: "800" },
});
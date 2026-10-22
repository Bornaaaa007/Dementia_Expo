import { colors } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { patientApi, PatientLockedError } from "@/lib/patientApi";
import { GalleryPhoto } from "@/lib/types";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

// Photos saved by an old version only stored a path on the family phone, so they can't be shown here
const isStored = (url: string) => url.startsWith("data:image/") || url.startsWith("http");

export default function PatientGallery() {
  const router = useRouter();
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<GalleryPhoto | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setPhotos(null);
    try {
      const res = await patientApi<{ photos: GalleryPhoto[] }>("/api/patient-device/gallery");
      setPhotos(res.photos.filter((p) => isStored(p.photoUrl)));
    } catch (e) {
      if (e instanceof PatientLockedError) {
        router.replace("/patient/login"); // same destination patient/home.tsx uses
        return;
      }
      setError(errorMessage(e));
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Single photo view ───────────────────────────────────────────────────────
  if (viewing) {
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={{ uri: viewing.photoUrl }} style={styles.bigPhoto} resizeMode="contain" />
          {viewing.caption ? <Text style={styles.viewCaption}>{viewing.caption}</Text> : null}
          {viewing.takenAt ? <Text style={styles.viewDate}>📅 {viewing.takenAt}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={() => setViewing(null)}>
            <Text style={styles.btnText}>Back to photos</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Grid ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>My Photos 📷</Text>

        {error ? (
          <View style={styles.center}>
            <Text style={styles.message}>{error}</Text>
            <TouchableOpacity style={styles.btn} onPress={load}>
              <Text style={styles.btnText}>Try again</Text>
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
            <Text style={styles.message}>No photos yet. Your family will add some soon!</Text>
          </View>
        ) : null}

        {photos && photos.length > 0 ? (
          <View style={styles.grid}>
            {photos.map((p) => (
              <TouchableOpacity key={p.id} style={styles.thumb} onPress={() => setViewing(p)}>
                <Image source={{ uri: p.photoUrl }} style={styles.thumbImg} resizeMode="cover" />
                {p.caption ? (
                  <Text style={styles.thumbCaption} numberOfLines={2}>
                    {p.caption}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.btnOutline} onPress={() => router.back()}>
          <Text style={styles.btnOutlineText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 30, fontWeight: "800", color: "#222", textAlign: "center" },
  center: { alignItems: "center", gap: 16, paddingVertical: 30 },
  message: { fontSize: 22, color: "#222", textAlign: "center" },
  bigEmoji: { fontSize: 64 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  thumb: { width: 155, borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", borderWidth: 2, borderColor: "#ddd" },
  thumbImg: { width: 155, height: 130 },
  thumbCaption: { fontSize: 15, color: "#222", padding: 6, lineHeight: 20 },
  bigPhoto: { width: "100%", height: 380, borderRadius: 20 },
  viewCaption: { fontSize: 26, fontWeight: "700", color: "#222", textAlign: "center" },
  viewDate: { fontSize: 20, color: colors.muted, textAlign: "center" },
  btn: {
    backgroundColor: colors.maroon, borderRadius: 16, minHeight: 64,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 24,
  },
  btnText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  btnOutline: {
    backgroundColor: "#fff", borderRadius: 16, minHeight: 64, alignItems: "center",
    justifyContent: "center", borderWidth: 2, borderColor: colors.maroon,
  },
  btnOutlineText: { color: colors.maroon, fontSize: 22, fontWeight: "800" },
});
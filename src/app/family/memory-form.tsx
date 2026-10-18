import { MemoryPhoto } from "@/components/MemoryCard";
import { Button, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { pickPhoto } from "@/lib/image";
import { confirmAction, notify } from "@/lib/notify";
import { Memory } from "@/lib/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const RELATIONSHIPS = ["Daughter", "Son", "Husband", "Wife", "Grandchild", "Sibling", "Friend", "Caregiver"];
const STORY_MAX = 600;

export default function MemoryForm() {
  const router = useRouter();
  const { patientId, memoryId } = useLocalSearchParams<{ patientId?: string; memoryId?: string }>();
  const editing = !!memoryId;

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [story, setStory] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoChanged, setPhotoChanged] = useState(false); // only send the photo when it was changed
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  // edit mode: load the existing card
  useEffect(() => {
    if (!editing) return;
    (async () => {
      try {
        const { memory } = await api<{ memory: Memory }>(`/api/patients/${patientId}/memories/${memoryId}`);
        setName(memory.name);
        setRelationship(memory.relationship);
        setStory(memory.story);
        setPhoto(memory.photoUrl);
      } catch (e) {
        notify("Couldn't open this card", errorMessage(e));
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, patientId, memoryId, router]);

  const choosePhoto = async () => {
    const picked = await pickPhoto();
    if (picked) {
      setPhoto(picked);
      setPhotoChanged(true);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoChanged(true);
  };

  const save = async () => {
    if (!patientId) return notify("No patient selected", "Go back and choose a patient first.");
    if (!name.trim()) return notify("Missing name", "Enter the person's name.");
    if (!relationship.trim()) return notify("Missing relationship", "Choose or type how they are related to the patient.");

    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), relationship: relationship.trim(), story: story.trim() };
      if (!editing || photoChanged) body.photoUrl = photo ?? "";

      if (editing) await api(`/api/patients/${patientId}/memories/${memoryId}`, { method: "PUT", body });
      else await api(`/api/patients/${patientId}/memories`, { body });
      router.back();
    } catch (e) {
      notify("Couldn't save", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmAction("Delete this card?", `${name || "This person"} will no longer appear on the patient's device.`, "Delete");
    if (!ok) return;
    setSaving(true);
    try {
      await api(`/api/patients/${patientId}/memories/${memoryId}`, { method: "DELETE" });
      router.back();
    } catch (e) {
      notify("Couldn't delete", errorMessage(e));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.maroon} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{editing ? "Edit loved one" : "Add a loved one"}</Text>

        <TouchableOpacity style={styles.photoBox} onPress={choosePhoto} accessibilityRole="button" accessibilityLabel="Choose a photo">
          {photo ? <MemoryPhoto name={name} uri={photo} size={140} /> : <Text style={styles.photoHint}>+ Add photo</Text>}
        </TouchableOpacity>
        <View style={styles.photoLinks}>
          {photo ? (
            <>
              <TouchableOpacity onPress={choosePhoto}><Text style={styles.link}>Change photo</Text></TouchableOpacity>
              <TouchableOpacity onPress={removePhoto}><Text style={[styles.link, { color: colors.danger }]}>Remove photo</Text></TouchableOpacity>
            </>
          ) : (
            <Text style={styles.hint}>A clear face photo works best.</Text>
          )}
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} placeholder="e.g. Aisha" value={name} onChangeText={setName} maxLength={60} />

        <Text style={styles.label}>Relationship to the patient</Text>
        <View style={styles.chips}>
          {RELATIONSHIPS.map((r) => (
            <TouchableOpacity key={r} style={[styles.chip, relationship === r && styles.chipActive]} onPress={() => setRelationship(r)}>
              <Text style={{ color: relationship === r ? "#fff" : colors.maroon, fontWeight: "600" }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Or type your own (e.g. Neighbour)" value={relationship} onChangeText={setRelationship} maxLength={40} />

        <Text style={styles.label}>A short story or memory (optional)</Text>
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: "top" }]}
          placeholder="e.g. Aisha visits every Friday and brings sweets from the bakery."
          value={story}
          onChangeText={setStory}
          maxLength={STORY_MAX}
          multiline
        />
        <Text style={styles.counter}>{story.length}/{STORY_MAX}</Text>

        <View style={{ gap: 10, marginTop: 8 }}>
          <Button title={editing ? "Save changes" : "Save loved one"} onPress={save} loading={saving} />
          {editing ? <Button title="Delete this card" variant="danger" onPress={remove} disabled={saving} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 50, paddingBottom: 50, backgroundColor: colors.bg },
  back: { color: colors.maroon, fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 18 },
  photoBox: {
    alignSelf: "center", width: 140, height: 140, borderRadius: 70, backgroundColor: "#fff", borderWidth: 1,
    borderColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  photoHint: { color: colors.muted, fontSize: 14 },
  photoLinks: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 10, marginBottom: 16 },
  link: { color: colors.maroon, fontWeight: "600", fontSize: 14 },
  hint: { color: colors.muted, fontSize: 12 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, marginTop: 6 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.maroon, backgroundColor: "#fff" },
  chipActive: { backgroundColor: colors.maroon },
  counter: { alignSelf: "flex-end", fontSize: 12, color: colors.muted, marginTop: -4 },
});
import { Button, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { notify } from "@/lib/notify";
import { PatientSummary } from "@/lib/types";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function CreatePatient() {
  const router = useRouter();
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [created, setCreated] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify("Permission needed", "Allow photo access to add a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4, // keep it small: the picture is stored with the profile
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleCreate = async () => {
    if (!patientName.trim()) return notify("Missing name", "Enter the patient's name.");
    setLoading(true);
    try {
      const data = await api<{ patient: PatientSummary }>("/api/patients", {
        body: {
          name: patientName.trim(),
          age: age ? Number(age) : undefined,
          dob: dob.trim(),
          photoUrl: photo ?? undefined,
        },
      });
      setCreated(data.patient);
    } catch (e) {
      notify("Couldn't create profile", errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create Patient Profile</Text>

      {!created ? (
        <>
          <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
            {photo ? <Image source={{ uri: photo }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>+ Add Photo</Text>}
          </TouchableOpacity>

          <TextInput style={styles.input} placeholder="Patient's Name" value={patientName} onChangeText={setPatientName} />
          <TextInput style={styles.input} placeholder="Age" keyboardType="number-pad" value={age} onChangeText={setAge} />
          <TextInput style={styles.input} placeholder="Date of Birth (e.g. 12/05/1950)" value={dob} onChangeText={setDob} />

          <Button title="Create Profile" onPress={handleCreate} loading={loading} />
        </>
      ) : (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Family invite code</Text>
          <Text style={styles.codeText}>{created.inviteCode}</Text>
          <Text style={styles.hint}>Other family members enter this when they sign up or tap "Join a patient".</Text>

          <Text style={[styles.codeLabel, { marginTop: 10 }]}>Patient device code</Text>
          <Text style={styles.codeText}>{created.pairCode}</Text>
          <Text style={styles.hint}>Enter this once on {created.name}'s own phone or tablet (Patient → pairing). You can find both codes later in Settings.</Text>

          <Button title="Continue to Dashboard" onPress={() => router.replace("/family/home")} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: "700", color: "#333", marginBottom: 24, textAlign: "center" },
  photoPicker: {
    alignSelf: "center", width: 110, height: 110, borderRadius: 55, backgroundColor: "#fff", borderWidth: 1,
    borderColor: colors.border, alignItems: "center", justifyContent: "center", marginBottom: 20, overflow: "hidden",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoPickerText: { color: "#999", fontSize: 13, textAlign: "center" },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  codeBox: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  codeLabel: { fontSize: 14, color: "#777", marginBottom: 6 },
  codeText: { fontSize: 30, fontWeight: "700", letterSpacing: 4, color: colors.maroon, marginBottom: 8 },
  hint: { fontSize: 12, color: "#999", marginBottom: 18, textAlign: "center" },
});

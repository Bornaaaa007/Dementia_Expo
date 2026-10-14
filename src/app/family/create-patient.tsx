import { FaceCapture } from "@/components/FaceCapture";
import { Button, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { notify } from "@/lib/notify";
import { PatientSummary } from "@/lib/types";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

const REQUIRED_PHOTOS = 3;
const PROMPTS = ["Look straight at the camera", "Turn slightly to the left", "Turn slightly to the right"];

export default function CreatePatient() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "face" | "codes">("details");
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [created, setCreated] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [shots, setShots] = useState(0);
  const [enrolling, setEnrolling] = useState(false);

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
      setStep("face");
    } catch (e) {
      notify("Couldn't create profile", errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  // Each photo is sent to the server, turned into numbers, and discarded
  const enrollShot = async (image: string) => {
    if (!created) return;
    setEnrolling(true);
    try {
      const res = await api<{ count: number }>(`/api/patients/${created.id}/face`, {
        body: { image, consent: true },
      });
      setShots(res.count);
      if (res.count >= REQUIRED_PHOTOS) setStep("codes");
    } catch (e) {
      notify("Couldn't use that photo", errorMessage(e));
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{step === "face" ? "Set up face unlock" : "Create Patient Profile"}</Text>

      {step === "details" ? (
        <>
          <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
            {photo ? <Image source={{ uri: photo }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>+ Add Photo</Text>}
          </TouchableOpacity>

          <TextInput style={styles.input} placeholder="Patient's Name" value={patientName} onChangeText={setPatientName} />
          <TextInput style={styles.input} placeholder="Age" keyboardType="number-pad" value={age} onChangeText={setAge} />
          <TextInput style={styles.input} placeholder="Date of Birth (e.g. 12/05/1950)" value={dob} onChangeText={setDob} />

          <Button title="Continue" onPress={handleCreate} loading={loading} />
        </>
      ) : null}

      {step === "face" && created ? (
        <>
          <Text style={styles.explain}>
            {created.name} will unlock their app with their face, so nobody else can open it. We save only a numeric
            face scan, never the photos. You can remove it at any time.
          </Text>

          <View style={styles.consentRow}>
            <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.maroon }} />
            <Text style={styles.consentText}>
              I have {created.name}'s permission (or I am their authorised caregiver) to save a face scan.
            </Text>
          </View>

          {consent ? (
            <>
              <Text style={styles.progress}>
                Photo {Math.min(shots + 1, REQUIRED_PHOTOS)} of {REQUIRED_PHOTOS}: {PROMPTS[Math.min(shots, REQUIRED_PHOTOS - 1)]}
              </Text>
              <FaceCapture label="Take photo" onCapture={enrollShot} busy={enrolling} />
            </>
          ) : null}

          <TouchableOpacity onPress={() => setStep("codes")}>
            <Text style={styles.skip}>Skip for now (the patient won't be able to unlock their app until this is set up)</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {step === "codes" && created ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Family invite code</Text>
          <Text style={styles.codeText}>{created.inviteCode}</Text>
          <Text style={styles.hint}>Other family members enter this when they sign up or tap "Join a patient".</Text>

          <Text style={[styles.codeLabel, { marginTop: 10 }]}>Patient device code</Text>
          <Text style={styles.codeText}>{created.pairCode}</Text>
          <Text style={styles.hint}>Enter this once on {created.name}'s own phone or tablet (Patient → pairing). You can find both codes later in Settings.</Text>

          <Button title="Continue to Dashboard" onPress={() => router.replace("/family/home")} />
        </View>
      ) : null}
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
  explain: { fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: "center", marginBottom: 16 },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  consentText: { flex: 1, fontSize: 14, color: "#333", lineHeight: 20 },
  progress: { fontSize: 16, fontWeight: "600", color: colors.maroon, textAlign: "center", marginBottom: 10 },
  skip: { fontSize: 12, color: "#999", textAlign: "center", marginTop: 18, lineHeight: 18 },
  codeBox: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  codeLabel: { fontSize: 14, color: "#777", marginBottom: 6 },
  codeText: { fontSize: 30, fontWeight: "700", letterSpacing: 4, color: colors.maroon, marginBottom: 8 },
  hint: { fontSize: 12, color: "#999", marginBottom: 18, textAlign: "center" },
});
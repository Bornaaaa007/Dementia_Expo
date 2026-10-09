import { Button, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { notify } from "@/lib/notify";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

export default function JoinPatient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    if (!code.trim()) return notify("Missing code", "Enter the invite code from the family member who created the profile.");
    setLoading(true);
    try {
      await api("/api/patients/join", { body: { inviteCode: code.trim() } });
      router.replace("/family/home");
    } catch (e) {
      notify("Couldn't join patient", errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Join a Patient</Text>
      <Text style={styles.sub}>Ask the family member who created the profile for the invite code.</Text>
      <TextInput
        style={styles.input}
        placeholder="Invite code"
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
      />
      <Button title="Join" onPress={join} loading={loading} />
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: "700", color: "#333", marginBottom: 10, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 22 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, letterSpacing: 2,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border, textAlign: "center",
  },
  back: { color: "#999", textAlign: "center", marginTop: 22, fontSize: 14 },
});

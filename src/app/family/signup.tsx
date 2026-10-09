import { colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notify";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FamilySignup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) return notify("Missing name", "Enter your full name.");
    if (!EMAIL_RE.test(email.trim())) return notify("Check your email", "Enter a valid email address.");
    if (password.length < 8) return notify("Password too short", "Use at least 8 characters.");

    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      notify("Sign up failed", error.message || error.statusText || `Server problem (status ${error.status ?? "no response"}). Check the backend terminal.`);
      return;
    }

    const code = inviteCode.trim();
    if (!code) {
      setLoading(false);
      router.replace("/family/create-patient"); // creating a new patient
      return;
    }

    // joining an existing patient
    try {
      await api("/api/patients/join", { body: { inviteCode: code } });
      router.replace("/family/home");
    } catch (e) {
      notify("Couldn't join patient", `${errorMessage(e)}\n\nYour account was created. You can enter the code again from the dashboard.`);
      router.replace("/family/home");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Family Sign Up</Text>

        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (at least 8 characters)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Invite Code (if joining an existing patient)"
          autoCapitalize="characters"
          autoCorrect={false}
          value={inviteCode}
          onChangeText={setInviteCode}
        />
        <Text style={styles.hint}>Leave the invite code blank to create a new patient profile instead.</Text>

        <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleSignup} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? "Creating..." : "Create Account"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/family/login")}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: "700", color: "#333", marginBottom: 24, textAlign: "center" },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  hint: { fontSize: 12, color: "#999", marginBottom: 16, marginTop: -6 },
  primaryButton: { backgroundColor: colors.maroon, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  primaryButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  linkText: { color: colors.maroon, textAlign: "center", marginTop: 18, fontSize: 14 },
});

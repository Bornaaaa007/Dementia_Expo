import { colors } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notify";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function FamilyLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      notify("Missing details", "Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
    setLoading(false);

    if (error) {
      notify("Login failed", error.message || error.statusText || `Server problem (status ${error.status ?? "no response"}). Check the backend terminal.`);
      return;
    }
    router.replace("/family/home");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Family Login</Text>

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
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? "Logging in..." : "Log In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/family/forgot-password")}>
          <Text style={styles.linkText}>Forgot your password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/family/signup")}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/")}>
          <Text style={styles.backText}>← Back</Text>
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
  primaryButton: { backgroundColor: colors.maroon, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  linkText: { color: colors.maroon, textAlign: "center", marginTop: 18, fontSize: 14 },
  backText: { color: "#999", textAlign: "center", marginTop: 20, fontSize: 14 },
});

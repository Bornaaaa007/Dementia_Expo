import { Button, colors } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notify";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) return notify("Missing email", "Enter the email you signed up with.");
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (error) return notify("Couldn't send reset code", error.message || "Try again in a moment.");
    notify("Check your email", "If that email has an account, a reset code has been sent.");
    router.push({ pathname: "/family/reset-password", params: { email: email.trim().toLowerCase() } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.sub}>Enter your email and we'll send you a code to choose a new password.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Button title="Send reset code" onPress={submit} loading={loading} />
      {__DEV__ ? (
        <Text style={styles.dev}>Dev mode: no email is sent. The reset token is printed in the backend terminal.</Text>
      ) : null}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back to login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 26, fontWeight: "700", color: "#333", marginBottom: 10, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 22 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  dev: { fontSize: 12, color: colors.warn, textAlign: "center", marginTop: 14 },
  back: { color: "#999", textAlign: "center", marginTop: 22, fontSize: 14 },
});

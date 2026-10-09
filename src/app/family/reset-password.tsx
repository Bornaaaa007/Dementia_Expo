import { Button, colors } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notify";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

export default function ResetPassword() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token.trim()) return notify("Missing code", "Paste the reset code you received.");
    if (password.length < 8) return notify("Password too short", "Use at least 8 characters.");
    if (password !== confirm) return notify("Passwords don't match", "Type the same password twice.");

    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token.trim() });
    setLoading(false);
    if (error) return notify("Couldn't reset password", error.message || "The code may have expired. Request a new one.");

    notify("Password changed", "Log in with your new password.");
    router.replace("/family/login");
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Choose a New Password</Text>
      {email ? <Text style={styles.sub}>Account: {email}</Text> : null}
      <TextInput style={styles.input} placeholder="Reset code" autoCapitalize="none" autoCorrect={false} value={token} onChangeText={setToken} />
      <TextInput style={styles.input} placeholder="New password (at least 8 characters)" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Confirm new password" secureTextEntry value={confirm} onChangeText={setConfirm} />
      <Button title="Change password" onPress={submit} loading={loading} />
      <TouchableOpacity onPress={() => router.replace("/family/login")}>
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
  back: { color: "#999", textAlign: "center", marginTop: 22, fontSize: 14 },
});

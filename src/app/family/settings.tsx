import { Button, Card, Pill, SectionTitle, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { confirmAction, notify } from "@/lib/notify";
import { PatientSummary, Settings } from "@/lib/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STALE_OPTIONS = [6, 12, 24, 48, 72];

export default function FamilySettings() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const { data: session } = authClient.useSession();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api<{ settings: Settings }>("/api/settings");
      setSettings(s.settings);
      if (patientId) setPatient((await api<{ patient: PatientSummary }>(`/api/patients/${patientId}`)).patient);
    } catch (e) {
      notify("Couldn't load settings", errorMessage(e));
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  const update = async (partial: Partial<Settings>) => {
    if (!settings) return;
    const before = settings;
    setSettings({ ...settings, ...partial }); // instant feedback, undone if saving fails
    try {
      const res = await api<{ settings: Settings }>("/api/settings", { method: "PUT", body: partial });
      setSettings(res.settings);
    } catch (e) {
      setSettings(before);
      notify("Couldn't save", errorMessage(e));
    }
  };

  const saveName = async () => {
    if (!name.trim()) return notify("Name can't be empty");
    setBusy("name");
    const { error } = await authClient.updateUser({ name: name.trim() });
    setBusy(null);
    notify(error ? "Couldn't update name" : "Name updated", error?.message);
  };

  const changePassword = async () => {
    if (!currentPassword) return notify("Enter your current password");
    if (newPassword.length < 8) return notify("New password too short", "Use at least 8 characters.");
    setBusy("password");
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setBusy(null);
    if (error) return notify("Couldn't change password", error.message);
    setCurrentPassword("");
    setNewPassword("");
    notify("Password changed", "You've been signed out on your other devices.");
  };

  const regenerate = async () => {
    if (!patient) return;
    const ok = await confirmAction(
      "Generate new codes?",
      `The old invite code stops working and ${patient.name}'s paired device is disconnected. It will need the new device code.`,
      "Generate"
    );
    if (!ok) return;
    setBusy("codes");
    try {
      setPatient((await api<{ patient: PatientSummary }>(`/api/patients/${patient.id}/regenerate-codes`, { body: {} })).patient);
    } catch (e) {
      notify("Couldn't generate codes", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const demo = async (scenario: "normal" | "stale" | "empty") => {
    if (!patient) return;
    setBusy(`demo-${scenario}`);
    try {
      await api(`/api/patients/${patient.id}/demo`, { body: { scenario, tz: new Date().getTimezoneOffset() } });
      notify("Done", scenario === "empty" ? "Sample data cleared." : "Go back to the dashboard to see it.");
    } catch (e) {
      notify("Couldn't update sample data", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const logout = async () => {
    await authClient.signOut();
    router.replace("/");
  };

  if (!settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.maroon} />
      </View>
    );
  }

  const isOwner = patient?.role === "owner";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Caregiver Settings</Text>

        <Card>
          <SectionTitle>Your profile</SectionTitle>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session?.user?.email}</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <Button title="Save name" small variant="secondary" onPress={saveName} loading={busy === "name"} />
        </Card>

        <Card>
          <SectionTitle>Alerts & freshness</SectionTitle>
          <Row label="Missed medication alerts" value={settings.notifyMissedMeds} onChange={(v) => update({ notifyMissedMeds: v })} />
          <Row label="Low mood alerts" value={settings.notifyMoodDrops} onChange={(v) => update({ notifyMoodDrops: v })} />
          <Row label="Inactivity alerts" value={settings.notifyInactivity} onChange={(v) => update({ notifyInactivity: v })} />
          <Text style={[styles.label, { marginTop: 14 }]}>Treat information as out of date after</Text>
          <View style={styles.options}>
            {STALE_OPTIONS.map((h) => (
              <TouchableOpacity key={h} style={[styles.option, settings.staleAfterHours === h && styles.optionActive]} onPress={() => update({ staleAfterHours: h })}>
                <Text style={{ color: settings.staleAfterHours === h ? "#fff" : colors.maroon, fontWeight: "600" }}>{h}h</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {patient ? (
          <Card>
            <SectionTitle right={<Pill label={isOwner ? "Owner" : "Family member"} tone={isOwner ? "good" : "neutral"} />}>{patient.name}</SectionTitle>
            <Text style={styles.value}>{patient.memberCount} family member{patient.memberCount > 1 ? "s" : ""} connected</Text>

            {isOwner ? (
              <>
                <Text style={styles.label}>Family invite code</Text>
                <Text style={styles.code}>{patient.inviteCode}</Text>
                <Text style={styles.label}>Patient device code</Text>
                <Text style={styles.code}>{patient.pairCode}</Text>
                <Text style={styles.value}>{patient.deviceActive ? "Patient's device is connected ✓" : "No patient device connected yet"}</Text>
                <View style={{ marginTop: 10 }}>
                  <Button title="Generate new codes" small variant="secondary" onPress={regenerate} loading={busy === "codes"} />
                </View>
              </>
            ) : (
              <Text style={styles.hint}>Only the profile owner can see the codes and manage sample data.</Text>
            )}
          </Card>
        ) : null}

        {isOwner ? (
          <Card>
            <SectionTitle>Sample data (for demos)</SectionTitle>
            <Text style={styles.hint}>Fills the dashboard with example data so you can show every state. Only sample data is replaced or cleared.</Text>
            <View style={{ gap: 10, marginTop: 10 }}>
              <Button title="Load normal sample data" small variant="secondary" onPress={() => demo("normal")} loading={busy === "demo-normal"} />
              <Button title="Simulate out-of-date data" small variant="secondary" onPress={() => demo("stale")} loading={busy === "demo-stale"} />
              <Button title="Clear sample data (no data state)" small variant="secondary" onPress={() => demo("empty")} loading={busy === "demo-empty"} />
            </View>
          </Card>
        ) : null}

        <Card>
          <SectionTitle>Security</SectionTitle>
          <TextInput style={styles.input} placeholder="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
          <TextInput style={styles.input} placeholder="New password (at least 8 characters)" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <Button title="Change password" small variant="secondary" onPress={changePassword} loading={busy === "password"} />
        </Card>

        <Button title="Log out" variant="danger" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.maroon }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  back: { color: colors.maroon, fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 14 },
  label: { fontSize: 12, color: colors.muted, marginTop: 8, marginBottom: 4 },
  value: { fontSize: 15, color: colors.text, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  code: { fontSize: 24, fontWeight: "700", letterSpacing: 3, color: colors.maroon, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { fontSize: 15, color: colors.text, flex: 1, paddingRight: 10 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.maroon, backgroundColor: "#fff" },
  optionActive: { backgroundColor: colors.maroon },
});

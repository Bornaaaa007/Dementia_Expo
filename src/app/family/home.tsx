import { ActivityCard, AdherenceCard, AlertsCard, MoodCard, OverviewCard, RemindersCard, SupplyCard } from "@/components/dashboard/Sections";
import { PatientSwitcher } from "@/components/dashboard/PatientSwitcher";
import { QuickActionModal, QuickMode, QuickPayload } from "@/components/dashboard/QuickActionModal";
import { Banner, Button, Card, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { DashboardData, PatientSummary, Settings } from "@/lib/types";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FamilyHome() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const [patients, setPatients] = useState<PatientSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<QuickMode | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = patients?.find((p) => p.id === selectedId) ?? null;
  const firstName = (session?.user?.name ?? "").split(" ")[0];

  const loadDashboard = useCallback(async (id: string) => {
    const res = await api<{ dashboard: DashboardData }>(`/api/patients/${id}/dashboard?tz=${new Date().getTimezoneOffset()}`);
    setDash(res.dashboard);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { patients: list } = await api<{ patients: PatientSummary[] }>("/api/patients");
      setPatients(list);

      let id = list.some((p) => p.id === selectedRef.current) ? selectedRef.current : null;
      if (!id && list.length) {
        let preferred: string | null = null;
        try {
          preferred = (await api<{ settings: Settings }>("/api/settings")).settings.lastPatientId;
        } catch {}
        id = list.find((p) => p.id === preferred)?.id ?? list[0].id;
      }
      selectedRef.current = id;
      setSelectedId(id);
      if (id) await loadDashboard(id);
      else setDash(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const selectPatient = async (id: string) => {
    selectedRef.current = id;
    setSelectedId(id);
    setDash(null);
    api("/api/settings", { method: "PUT", body: { lastPatientId: id } }).catch(() => {});
    try {
      await loadDashboard(id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const act = async (fn: () => Promise<unknown>) => {
    if (!selected) return;
    try {
      await fn();
      await loadDashboard(selected.id);
    } catch (e) {
      notify("Something went wrong", errorMessage(e));
    }
  };

  const resolveAlert = (alertId: string) =>
    act(() => api(`/api/patients/${selected!.id}/alerts/${alertId}/resolve`, { body: {} }));

  const markTaken = (reminderId: string) =>
    act(() => api(`/api/patients/${selected!.id}/reminders/${reminderId}`, { method: "PATCH", body: { status: "taken" } }));

  const loadSample = () =>
    act(() => api(`/api/patients/${selected!.id}/demo`, { body: { scenario: "normal", tz: new Date().getTimezoneOffset() } }));

  const submitQuick = async (p: QuickPayload) => {
    if (!selected) return;
    setBusy(true);
    try {
      const base = `/api/patients/${selected.id}`;
      if (p.mode === "reminder") await api(`${base}/reminders`, { body: { title: p.title, kind: p.kind, scheduledAt: p.scheduledAt } });
      else if (p.mode === "mood") await api(`${base}/activities`, { body: { type: "mood", value: p.value, message: p.message } });
      else await api(`${base}/activities`, { body: { type: "note", message: p.message } });
      setModal(null);
      await loadDashboard(selected.id);
    } catch (e) {
      notify("Couldn't save", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const showInvite = () => {
    if (!selected) return;
    if (selected.role === "owner" && selected.inviteCode) {
      notify("Invite family", `Share this code. They enter it when they sign up or tap "Join a patient":\n\n${selected.inviteCode}`);
    } else {
      notify("Invite family", "Ask the family member who created this profile to share the invite code.");
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
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refresh(); }} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Family Dashboard</Text>
            <Text style={styles.sub}>{firstName ? `Hi, ${firstName}` : "Welcome"}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: "/family/settings", params: { patientId: selectedId ?? "" } })}>
            <Text style={styles.gear}>⚙️ Settings</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Banner tone="danger" title="Couldn't load the dashboard" text={error}>
            <View style={{ marginTop: 10 }}>
              <Button title="Try again" small onPress={() => { setLoading(true); refresh(); }} />
            </View>
          </Banner>
        ) : null}

        {patients && patients.length === 0 && !error ? (
          <Card>
            <Text style={styles.cardTitle}>No patient yet</Text>
            <Text style={styles.cardText}>Create a profile for the person you care for, or join one a family member already created.</Text>
            <View style={{ gap: 10, marginTop: 14 }}>
              <Button title="Create patient profile" onPress={() => router.push("/family/create-patient")} />
              <Button title="Join with an invite code" variant="secondary" onPress={() => router.push("/family/join-patient")} />
            </View>
          </Card>
        ) : null}

        {patients && patients.length > 0 ? (
          <PatientSwitcher patients={patients} selectedId={selectedId} onSelect={selectPatient} onAdd={() => router.push("/family/join-patient")} />
        ) : null}

        {selected && !dash && !error ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.maroon} /> : null}

        {selected && dash ? (
          <>
            {dash.dataState === "empty" ? (
              <Banner
                tone="info"
                title={`No data yet for ${selected.name}`}
                text={`Information appears once ${selected.name}'s device is paired and used (pairing code is in Settings), or when you add reminders, moods or notes.`}
              >
                {selected.role === "owner" ? (
                  <View style={{ marginTop: 10 }}>
                    <Button title="Load sample data" small onPress={loadSample} />
                  </View>
                ) : null}
              </Banner>
            ) : null}

            {dash.dataState === "stale" ? (
              <Banner
                tone="warn"
                title="This information may be out of date"
                text={
                  dash.lastPatientActivityAt
                    ? `${selected.name}'s device last reported ${timeAgo(dash.lastPatientActivityAt)}. Showing the last known information (older than ${dash.staleAfterHours} hours counts as out of date).`
                    : `${selected.name}'s device hasn't reported any activity yet. Showing what family members have entered.`
                }
              />
            ) : null}

            <OverviewCard patient={selected} data={dash} />
            <AlertsCard alerts={dash.alerts.unresolved} onResolve={resolveAlert} />

            <Card>
              <Text style={styles.cardTitle}>Quick actions</Text>
              <View style={styles.actions}>
                <Button title="➕ Reminder"    small variant="secondary" onPress={() => setModal("reminder")} />
                <Button title="🙂 Log mood"    small variant="secondary" onPress={() => setModal("mood")} />
                <Button title="📝 Add note"    small variant="secondary" onPress={() => setModal("note")} />
                <Button title="👪 Invite family" small variant="secondary" onPress={showInvite} />
                <Button
                  title="🖼️ Loved ones"
                  small variant="secondary"
                  onPress={() => router.push({ pathname: "/family/memories", params: { patientId: selected.id } })}
                />
                <Button
                  title="✉️ Messages"
                  small variant="secondary"
                  onPress={() => router.push({ pathname: "/family/messages", params: { patientId: selected.id } })}
                />
                {/* Week 7 */}
                <Button
                  title="🎵 Jukebox"
                  small variant="secondary"
                  onPress={() => router.push({ pathname: "/family/jukebox", params: { id: selected.id } })}
                />
                <Button
                  title="📷 Gallery"
                  small variant="secondary"
                  onPress={() => router.push({ pathname: "/family/gallery", params: { id: selected.id } })}
                />
                                {/* Week 8 */}
                <Button
                  title="💊 Medicines"
                  small variant="secondary"
                  onPress={() => router.push({ pathname: "/family/schedules", params: { patientId: selected.id } })}
                />
              </View>
            </Card>

            <RemindersCard reminders={dash.reminders.today} onMarkTaken={markTaken} onAdd={() => setModal("reminder")} />
                       <AdherenceCard adherence={dash.adherence} />
            <SupplyCard
              items={dash.supply ?? []}
              onManage={() => router.push({ pathname: "/family/schedules", params: { patientId: selected.id } })}
            />
            <MoodCard mood={dash.mood} onLog={() => setModal("mood")} />
            <ActivityCard items={dash.recentActivity} />
          </>
        ) : null}
      </ScrollView>

      <QuickActionModal mode={modal} busy={busy} onClose={() => setModal(null)} onSubmit={submitQuick} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content:   { padding: 16, paddingBottom: 40 },
  header:    { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  title:     { fontSize: 24, fontWeight: "800", color: colors.text },
  sub:       { fontSize: 14, color: colors.muted, marginTop: 2 },
  gear:      { fontSize: 14, color: colors.maroon, fontWeight: "600" },
  cardTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 6 },
  cardText:  { fontSize: 14, color: colors.muted, lineHeight: 20 },
  actions:   { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
});
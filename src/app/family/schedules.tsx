import { Button, Card, Pill, SectionTitle, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { confirmAction, notify } from "@/lib/notify";
import { ScheduleItem } from "@/lib/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Kind = "medication" | "routine";
interface FormValues { kind: Kind; title: string; dose: string; times: string; pillsRemaining: string; pillsPerDose: string }

const toForm = (s?: ScheduleItem): FormValues =>
  s
    ? {
        kind: s.kind, title: s.title, dose: s.dose, times: s.times.join(", "),
        pillsRemaining: s.pillsRemaining === null ? "" : String(s.pillsRemaining), pillsPerDose: String(s.pillsPerDose),
      }
    : { kind: "medication", title: "", dose: "", times: "", pillsRemaining: "", pillsPerDose: "1" };

export default function FamilySchedules() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const base = `/api/patients/${patientId}/schedules`;

  const [items, setItems] = useState<ScheduleItem[] | null>(null);
  const [form, setForm] = useState<"new" | ScheduleItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      setItems((await api<{ schedules: ScheduleItem[] }>(base)).schedules);
    } catch (e) {
      notify("Couldn't load", errorMessage(e));
      setItems([]);
    }
  }, [base, patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, failTitle: string) => {
    try {
      await fn();
      await load();
    } catch (e) {
      notify(failTitle, errorMessage(e));
    }
  };

  const save = async (v: FormValues, id?: string) => {
    setBusy(true);
    try {
      const body = {
        kind: v.kind,
        title: v.title,
        dose: v.kind === "medication" ? v.dose : "",
        times: v.times,
        pillsRemaining: v.kind === "medication" && v.pillsRemaining.trim() !== "" ? Number(v.pillsRemaining) : null,
        pillsPerDose: Number(v.pillsPerDose) || 1,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      };
      if (id) await api(`${base}/${id}`, { method: "PUT", body });
      else await api(base, { body });
      setForm(null);
      await load();
    } catch (e) {
      notify("Couldn't save", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: ScheduleItem) => {
    const ok = await confirmAction("Delete this?", `"${s.title}" and its upcoming reminders will be removed. Past records stay.`, "Delete");
    if (ok) run(() => api(`${base}/${s.id}`, { method: "DELETE" }), "Couldn't delete");
  };

  if (!patientId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No patient selected.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Medicines & routines</Text>
        <Text style={styles.muted}>
          Add a medicine once and the patient gets a reminder every day. Add the pill count to be warned 5 days before it runs out.
        </Text>

        {form ? (
          <ScheduleForm
            key={form === "new" ? "new" : form.id}
            initial={form === "new" ? undefined : form}
            busy={busy}
            onSave={(v) => save(v, form === "new" ? undefined : form.id)}
            onCancel={() => setForm(null)}
          />
        ) : (
          <View style={{ marginVertical: 14 }}>
            <Button title="➕ Add medicine or routine" onPress={() => setForm("new")} />
          </View>
        )}

        {items === null ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.maroon} /> : null}
        {items && items.length === 0 && !form ? <Text style={styles.muted}>Nothing added yet.</Text> : null}

        {items?.map((s) => (
          <ScheduleCard
            key={s.id}
            s={s}
            onEdit={() => setForm(s)}
            onToggle={() => run(() => api(`${base}/${s.id}`, { method: "PUT", body: { active: !s.active } }), "Couldn't update")}
            onDelete={() => remove(s)}
            onRefill={(n) => run(() => api(`${base}/${s.id}/refill`, { body: { add: n } }), "Couldn't add pills")}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScheduleCard({
  s, onEdit, onToggle, onDelete, onRefill,
}: { s: ScheduleItem; onEdit: () => void; onToggle: () => void; onDelete: () => void; onRefill: (n: number) => void }) {
  const [add, setAdd] = useState("");
  const sup = s.supply;
  const tone = sup ? (sup.level === "ok" ? "good" : sup.level === "low" ? "warn" : "danger") : "neutral";
  const days = sup ? (sup.daysLeft < 1 ? "less than a day" : `about ${sup.daysLeft} day${sup.daysLeft === 1 ? "" : "s"}`) : "";

  return (
    <Card>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{s.kind === "medication" ? "💊" : "🌿"} {s.title}</Text>
          {s.dose ? <Text style={styles.muted}>{s.dose}</Text> : null}
        </View>
        {!s.active ? <Pill label="Paused" tone="neutral" /> : sup ? <Pill label={sup.level === "ok" ? "Supply OK" : sup.level === "low" ? "Running low" : "Out"} tone={tone} /> : null}
      </View>

      <Text style={styles.times}>{s.times.join("   ·   ")}</Text>
      {sup ? <Text style={styles.muted}>{sup.pillsRemaining} pills left · {days}</Text> : null}

      {s.kind === "medication" ? (
        <View style={styles.refillRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Pills bought"
            keyboardType="number-pad"
            value={add}
            onChangeText={setAdd}
          />
          <Button title="Add pills" small variant="secondary" onPress={() => { onRefill(Number(add)); setAdd(""); }} />
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button title="Edit" small variant="secondary" onPress={onEdit} />
        <Button title={s.active ? "Pause" : "Resume"} small variant="secondary" onPress={onToggle} />
        <Button title="Delete" small variant="secondary" onPress={onDelete} />
      </View>
    </Card>
  );
}

function ScheduleForm({
  initial, busy, onSave, onCancel,
}: { initial?: ScheduleItem; busy: boolean; onSave: (v: FormValues) => void; onCancel: () => void }) {
  const [v, setV] = useState<FormValues>(toForm(initial));
  const set = (patch: Partial<FormValues>) => setV((x) => ({ ...x, ...patch }));
  const med = v.kind === "medication";

  return (
    <Card>
      <SectionTitle>{initial ? "Edit" : "Add medicine or routine"}</SectionTitle>
      <View style={styles.toggleRow}>
        <Choice label="Medicine" active={med} onPress={() => set({ kind: "medication" })} />
        <Choice label="Routine" active={!med} onPress={() => set({ kind: "routine" })} />
      </View>

      <TextInput
        style={styles.input}
        placeholder={med ? "Medicine name, e.g. Metformin" : "Routine, e.g. Afternoon walk"}
        value={v.title}
        onChangeText={(title) => set({ title })}
      />
      {med ? (
        <TextInput style={styles.input} placeholder="Dose (optional), e.g. 500 mg after food" value={v.dose} onChangeText={(dose) => set({ dose })} />
      ) : null}
      <TextInput
        style={styles.input}
        placeholder="Times, 24-hour, e.g. 08:00, 20:00"
        keyboardType="numbers-and-punctuation"
        value={v.times}
        onChangeText={(times) => set({ times })}
      />

      {med ? (
        <>
          <Text style={styles.label}>Pills in the box now (optional, gives a warning before they run out)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={v.pillsRemaining} onChangeText={(pillsRemaining) => set({ pillsRemaining })} />
          <Text style={styles.label}>Pills taken each time</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={v.pillsPerDose} onChangeText={(pillsPerDose) => set({ pillsPerDose })} />
        </>
      ) : null}

      <View style={{ gap: 10, marginTop: 4 }}>
        <Button title="Save" onPress={() => onSave(v)} loading={busy} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={busy} />
      </View>
    </Card>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={{ color: active ? "#fff" : colors.maroon, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  back: { color: colors.maroon, fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 6 },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontSize: 17, fontWeight: "700", color: colors.text },
  times: { fontSize: 15, color: colors.brown, fontWeight: "600", marginVertical: 8 },
  refillRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  input: {
    backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  choice: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.maroon, backgroundColor: "#fff" },
  choiceActive: { backgroundColor: colors.maroon },
});
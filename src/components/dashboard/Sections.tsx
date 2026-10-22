import { Avatar, Button, Card, Pill, SectionTitle, Tone, colors } from "@/components/ui";
import { MOOD_EMOJI, dayLetter, formatTime, timeAgo } from "@/lib/format";
import { ActivityItem, AlertItem, DashboardData, PatientSummary, ReminderItem, SupplyItem } from "@/lib/types";
import { StyleSheet, Text, View } from "react-native";

const statusTone: Record<DashboardData["overview"]["status"], Tone> = {
  good: "good", attention: "warn", critical: "danger", stale: "warn", empty: "info",
};
const statusLabel: Record<DashboardData["overview"]["status"], string> = {
  good: "All good", attention: "Needs attention", critical: "Urgent", stale: "Out of date", empty: "No data",
};

// ---------------- Overview ----------------
export function OverviewCard({ patient, data }: { patient: PatientSummary; data: DashboardData }) {
  const { overview, adherence, mood, reminders } = data;
  return (
    <Card>
      <View style={styles.headRow}>
        <Avatar name={patient.name} uri={patient.photoUrl} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.muted}>
            {[patient.age ? `${patient.age} years` : null, patient.role === "owner" ? "You manage this profile" : "Family member"].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Pill label={statusLabel[overview.status]} tone={statusTone[overview.status]} />
      </View>
      <Text style={styles.headline}>{overview.headline}</Text>

      <View style={styles.tiles}>
        <Tile label="Last active" value={data.lastPatientActivityAt ? timeAgo(data.lastPatientActivityAt) : "Never"} />
        <Tile label="Medication" value={adherence.percent === null ? "—" : `${adherence.percent}%`} />
        <Tile label="Mood" value={mood.latest ? MOOD_EMOJI[mood.latest.value] : "—"} />
      </View>

      {reminders.next ? (
        <Text style={styles.next}>
          Next: {reminders.next.title} at {formatTime(reminders.next.scheduledAt)}
        </Text>
      ) : null}
    </Card>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

// ---------------- Alerts ----------------
const severityTone: Record<AlertItem["severity"], Tone> = { critical: "danger", warning: "warn", info: "info" };

export function AlertsCard({ alerts, onResolve }: { alerts: AlertItem[]; onResolve: (id: string) => void }) {
  return (
    <Card>
      <SectionTitle right={alerts.length ? <Pill label={`${alerts.length} unresolved`} tone={alerts.some((a) => a.severity === "critical") ? "danger" : "warn"} /> : undefined}>
        Alerts
      </SectionTitle>
      {alerts.length === 0 ? (
        <Text style={styles.empty}>No unresolved alerts. ✓</Text>
      ) : (
        alerts.map((a) => (
          <View key={a.id} style={[styles.alertRow, { borderLeftColor: a.severity === "critical" ? colors.danger : a.severity === "warning" ? colors.warn : colors.info }]}>
            <View style={{ flex: 1 }}>
              <Pill label={a.severity.toUpperCase()} tone={severityTone[a.severity]} />
              <Text style={styles.alertText}>{a.message}</Text>
              <Text style={styles.muted}>{timeAgo(a.raisedAt)}</Text>
            </View>
            <Button title="Resolve" small variant="secondary" onPress={() => onResolve(a.id)} />
          </View>
        ))
      )}
    </Card>
  );
}

// ---------------- Today's reminders ----------------
const reminderTone: Record<ReminderItem["status"], Tone> = { taken: "good", missed: "danger", due: "warn", upcoming: "neutral" };
const reminderLabel: Record<ReminderItem["status"], string> = { taken: "Taken ✓", missed: "Missed", due: "Due now", upcoming: "Upcoming" };

export function RemindersCard({
  reminders, onMarkTaken, onAdd,
}: { reminders: ReminderItem[]; onMarkTaken: (id: string) => void; onAdd: () => void }) {
  return (
    <Card>
      <SectionTitle>Today's reminders</SectionTitle>
      {reminders.length === 0 ? (
        <View>
          <Text style={styles.empty}>No reminders for today.</Text>
          <Button title="Add a reminder" small variant="secondary" onPress={onAdd} />
        </View>
      ) : (
        reminders.map((r) => (
          <View key={r.id} style={styles.line}>
            <Text style={styles.time}>{formatTime(r.scheduledAt)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{r.title}</Text>
              <Pill label={reminderLabel[r.status]} tone={reminderTone[r.status]} />
            </View>
            {r.status === "due" || r.status === "missed" ? <Button title="Mark taken" small variant="secondary" onPress={() => onMarkTaken(r.id)} /> : null}
          </View>
        ))
      )}
    </Card>
  );
}

// ---------------- Adherence ----------------
const levelTone: Record<DashboardData["adherence"]["level"], Tone> = { good: "good", fair: "warn", poor: "danger", none: "neutral" };
const levelLabel: Record<DashboardData["adherence"]["level"], string> = { good: "Good", fair: "Fair", poor: "Needs attention", none: "No data" };

export function AdherenceCard({ adherence }: { adherence: DashboardData["adherence"] }) {
  const maxPerDay = Math.max(1, ...adherence.perDay.map((d) => d.taken + d.missed));
  return (
    <Card>
      <SectionTitle right={<Pill label={levelLabel[adherence.level]} tone={levelTone[adherence.level]} />}>Medication adherence</SectionTitle>
      {adherence.percent === null ? (
        <Text style={styles.empty}>Not enough data yet. This fills in once medication reminders are taken or missed.</Text>
      ) : (
        <>
          <Text style={styles.big}>{adherence.percent}%</Text>
          <Text style={styles.muted}>
            {adherence.taken} taken, {adherence.missed} missed in the last {adherence.windowDays} days
          </Text>
          <View style={styles.bars}>
            {adherence.perDay.map((d) => (
              <View key={d.date} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={{ height: `${(d.missed / maxPerDay) * 100}%`, backgroundColor: colors.danger, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  <View style={{ height: `${(d.taken / maxPerDay) * 100}%`, backgroundColor: colors.good }} />
                </View>
                <Text style={styles.barLabel}>{dayLetter(d.date)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.legend}>Green = taken · Red = missed</Text>
        </>
      )}
    </Card>
  );
}

// ---------------- Mood ----------------
const trendText: Record<DashboardData["mood"]["trend"], string> = {
  up: "Improving ↗", down: "Declining ↘", steady: "Steady →", unknown: "Not enough data for a trend",
};

export function MoodCard({ mood, onLog }: { mood: DashboardData["mood"]; onLog: () => void }) {
  return (
    <Card>
      <SectionTitle>Mood summary</SectionTitle>
      {!mood.latest ? (
        <View>
          <Text style={styles.empty}>No mood entries in the last 7 days.</Text>
          <Button title="Log mood" small variant="secondary" onPress={onLog} />
        </View>
      ) : (
        <>
          <View style={styles.moodHead}>
            <Text style={styles.moodEmoji}>{MOOD_EMOJI[mood.latest.value]}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>{mood.latest.label} · {timeAgo(mood.latest.at)}</Text>
              {mood.latest.note ? <Text style={styles.muted}>{mood.latest.note}</Text> : null}
            </View>
          </View>
          <View style={styles.bars}>
            {mood.days.map((d) => (
              <View key={d.date} style={styles.barCol}>
                <View style={styles.barTrack}>
                  {d.value !== null ? <View style={{ height: `${(d.value / 5) * 100}%`, backgroundColor: colors.teal, borderRadius: 4 }} /> : null}
                </View>
                <Text style={styles.barLabel}>{dayLetter(d.date)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.legend}>
            7-day average {mood.average ?? "—"} / 5 · {trendText[mood.trend]}
          </Text>
        </>
      )}
    </Card>
  );
}

// ---------------- Recent activity ------------//

const typeIcon: Record<string, string> = {
  app_open: "📱", meal: "🍽️", walk: "🚶", call: "📞", note: "📝", sos: "🆘", message_read: "✉️", jar: "💌",
  pain: "🩹", pet_checkin: "🐶", medication_taken: "💊", medication_missed: "⚠️", routine_done: "✅",
};

export function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <SectionTitle>Recent activity</SectionTitle>
      {items.length === 0 ? (
        <Text style={styles.empty}>No recent activity.</Text>
      ) : (
        items.map((a) => (
          <View key={a.id} style={styles.line}>
            <Text style={styles.icon}>{a.type === "mood" && a.value ? MOOD_EMOJI[a.value] : typeIcon[a.type] ?? "•"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lineTitle}>
                {a.type === "mood" ? `Mood logged${a.message ? `: ${a.message}` : ""}` : a.message || a.type}
              </Text>
              <Text style={styles.muted}>
                {timeAgo(a.at)}{a.source === "caregiver" ? " · added by family" : ""}
              </Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

// ---------------- Medicine supply ----------------
const supplyTone: Record<SupplyItem["level"], Tone> = { ok: "good", low: "warn", out: "danger" };
const supplyLabel: Record<SupplyItem["level"], string> = { ok: "OK", low: "Running low", out: "Out" };

export function SupplyCard({ items, onManage }: { items: SupplyItem[]; onManage: () => void }) {
  return (
    <Card>
      <SectionTitle>Medicine supply</SectionTitle>
      {items.length === 0 ? (
        <View>
          <Text style={styles.empty}>
            No medicines are being counted yet. Add a medicine with its pill count to get a warning before it runs out.
          </Text>
          <Button title="Add a medicine" small variant="secondary" onPress={onManage} />
        </View>
      ) : (
        <>
          {items.map((m) => (
            <View key={m.id} style={styles.line}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineTitle}>{m.title}</Text>
                <Text style={styles.muted}>
                  {m.pillsRemaining} left · {m.daysLeft < 1 ? "less than a day" : `about ${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"}`}
                </Text>
              </View>
              <Pill label={supplyLabel[m.level]} tone={supplyTone[m.level]} />
            </View>
          ))}
          <View style={{ marginTop: 10 }}>
            <Button title="Manage medicines" small variant="secondary" onPress={onManage} />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  patientName: { fontSize: 20, fontWeight: "700", color: colors.text },
  muted: { fontSize: 12, color: colors.muted, marginTop: 2 },
  headline: { fontSize: 15, color: colors.text, marginTop: 12, marginBottom: 12, fontWeight: "600" },
  tiles: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, padding: 10, alignItems: "center" },
  tileValue: { fontSize: 18, fontWeight: "700", color: colors.brown },
  tileLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  next: { marginTop: 12, fontSize: 13, color: colors.brown },
  empty: { fontSize: 14, color: colors.muted, marginBottom: 10 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 10, borderLeftWidth: 4, paddingLeft: 10, marginBottom: 12 },
  alertText: { fontSize: 14, color: colors.text, marginTop: 6 },
  line: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  time: { width: 64, fontSize: 13, color: colors.muted },
  lineTitle: { fontSize: 14, color: colors.text, fontWeight: "600", marginBottom: 2 },
  icon: { fontSize: 20, width: 28, textAlign: "center" },
  big: { fontSize: 38, fontWeight: "800", color: colors.brown },
  bars: { flexDirection: "row", gap: 8, height: 84, marginTop: 14, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center" },
  barTrack: { width: "100%", height: 64, justifyContent: "flex-end", backgroundColor: colors.bg, borderRadius: 4 },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: 4 },
  legend: { fontSize: 12, color: colors.muted, marginTop: 8 },
  moodHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  moodEmoji: { fontSize: 36 },
});

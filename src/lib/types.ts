export type Role = "owner" | "member";

export interface PatientSummary {
  id: string;
  name: string;
  age: number | null;
  dob: string;
  photoUrl: string | null;
  role: Role;
  memberCount: number;
  inviteCode?: string;
  pairCode?: string;
  deviceActive?: boolean;
}

export type ReminderStatus = "taken" | "missed" | "due" | "upcoming";

export interface ReminderItem {
  id: string;
  title: string;
  kind: "medication" | "routine";
  scheduledAt: string;
  status: ReminderStatus;
  actedAt: string | null;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  value: number | null;
  at: string;
  source: "patient" | "caregiver" | "system";
}

export interface AlertItem {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  raisedAt: string;
}

export interface DashboardData {
  generatedAt: string;
  dataState: "ok" | "stale" | "empty";
  staleAfterHours: number;
  lastPatientActivityAt: string | null;
  overview: {
    status: "good" | "attention" | "critical" | "stale" | "empty";
    headline: string;
    unresolvedAlerts: number;
    criticalAlerts: number;
  };
  recentActivity: ActivityItem[];
  reminders: { today: ReminderItem[]; next: ReminderItem | null };
  adherence: {
    windowDays: number;
    taken: number;
    missed: number;
    percent: number | null;
    level: "good" | "fair" | "poor" | "none";
    perDay: { date: string; taken: number; missed: number }[];
  };
  mood: {
    latest: { value: number; label: string; at: string; note: string } | null;
    average: number | null;
    count: number;
    trend: "up" | "down" | "steady" | "unknown";
    days: { date: string; value: number | null }[];
  };
  alerts: { unresolved: AlertItem[] };
}

export interface Settings {
  staleAfterHours: number;
  notifyMissedMeds: boolean;
  notifyMoodDrops: boolean;
  notifyInactivity: boolean;
  lastPatientId: string | null;
}
// Week 5: loved-one memory card
export interface Memory {
  id: string;
  name: string;
  relationship: string;
  story: string;
  photoUrl: string | null;
  canEdit?: boolean; // only sent to family accounts
  createdAt?: string;
  updatedAt?: string;
}
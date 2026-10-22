// ── existing types (unchanged) ────────────────────────────────────────────────
export type Role = "owner" | "member";

export interface PatientSummary {
  id: string; name: string; age: number | null; dob: string;
  photoUrl: string | null; role: Role; memberCount: number;
  inviteCode?: string; pairCode?: string; deviceActive?: boolean;
}

export type ReminderStatus = "taken" | "missed" | "due" | "upcoming";
export interface ReminderItem {
  id: string; title: string; kind: "medication" | "routine";
  scheduledAt: string; status: ReminderStatus; actedAt: string | null;
}

export interface ActivityItem {
  id: string; type: string; message: string; value: number | null;
  at: string; source: "patient" | "caregiver" | "system";
}

export interface AlertItem {
  id: string; type: string; severity: "info" | "warning" | "critical";
  message: string; raisedAt: string;
}

export interface DashboardData {
  generatedAt: string; dataState: "ok" | "stale" | "empty"; staleAfterHours: number;
  lastPatientActivityAt: string | null;
  overview: { status: "good" | "attention" | "critical" | "stale" | "empty"; headline: string; unresolvedAlerts: number; criticalAlerts: number; };
  recentActivity: ActivityItem[];
  reminders: { today: ReminderItem[]; next: ReminderItem | null };
  adherence: { windowDays: number; taken: number; missed: number; percent: number | null; level: "good" | "fair" | "poor" | "none"; perDay: { date: string; taken: number; missed: number }[]; };
  mood: { latest: { value: number; label: string; at: string; note: string } | null; average: number | null; count: number; trend: "up" | "down" | "steady" | "unknown"; days: { date: string; value: number | null }[]; };
  alerts: { unresolved: AlertItem[] };
  supply: SupplyItem[];
}

export interface Settings {
  staleAfterHours: number; notifyMissedMeds: boolean; notifyMoodDrops: boolean;
  notifyInactivity: boolean; lastPatientId: string | null;
}

export interface Memory {
  id: string; name: string; relationship: string; story: string;
  photoUrl: string | null; canEdit?: boolean; createdAt?: string; updatedAt?: string;
}

export interface FamilyMessage {
  id: string; kind: "message" | "jar"; text: string; senderName: string;
  sentAt: string; read: boolean; readAt: string | null; canDelete: boolean;
}

export interface PatientMessage {
  id: string; text: string; senderName: string; sentAt: string; read: boolean;
}

export interface JarNote {
  id: string; text: string; senderName: string;
}

// ── Week 7: Jukebox ───────────────────────────────────────────────────────────
export interface Song {
  id: string;
  title: string;
  artist: string;
  audioUrl: string | null;   // only populated when fetching a single song to play
  linkedMemory: string | null;
  note: string;              // family's context note, e.g. "Grandma's favourite"
  playCount?: number;
  lastPlayedAt?: string | null;
  addedBy?: string;
  createdAt?: string;
}

export interface SongListItem extends Omit<Song, "audioUrl"> {}

// ── Week 7: Gallery ───────────────────────────────────────────────────────────
export interface GalleryPhoto {
  id: string;
  photoUrl: string;
  caption: string;
  takenAt: string;           // human label like "Summer 2019"
  linkedMemory: string | null;
  linkedSong: string | null;
  addedBy?: string;
  createdAt?: string;
}

// ── Week 7: Daily Joy Button ──────────────────────────────────────────────────
export type JoyItem =
  | { kind: "song";  id: string; title: string; artist: string; note: string; linkedMemory: string | null }
  | { kind: "photo"; id: string; photoUrl: string; caption: string; takenAt: string; linkedMemory: string | null; linkedSong: string | null };

// ── Week 8: schedules, supply, today's list, pet ─────────────────────────────
export interface SupplyItem {
  id: string; title: string; dose: string; pillsRemaining: number; daysLeft: number; level: "ok" | "low" | "out";
}

export interface ScheduleItem {
  id: string; kind: "medication" | "routine"; title: string; dose: string; times: string[]; active: boolean;
  pillsRemaining: number | null; pillsPerDose: number;
  supply: { pillsRemaining: number; perDay: number; daysLeft: number; level: "ok" | "low" | "out" } | null;
}

export interface TodayItem {
  id: string; title: string; kind: "medication" | "routine"; scheduledAt: string;
  status: ReminderStatus; actedAt: string | null; dose: string; canTake: boolean;
}

export interface PetStatus { checkedInToday: boolean; streak: number }
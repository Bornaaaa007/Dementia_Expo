import { ReactNode } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

export const colors = {
  bg: "#FAF7F2",
  maroon: "#51121A",
  brown: "#583722",
  teal: "#BDD7DE",
  card: "#FFFFFF",
  border: "#E0DCD5",
  text: "#333333",
  muted: "#777777",
  good: "#2E7D32",
  warn: "#B26A00",
  danger: "#B3261E",
  info: "#1F6F8B",
};

export type Tone = "good" | "warn" | "danger" | "info" | "neutral";
const toneBg: Record<Tone, string> = { good: "#E3F2E5", warn: "#FFF1D6", danger: "#FBE3E1", info: "#DDEEF4", neutral: "#EFEBE4" };
const toneFg: Record<Tone, string> = { good: colors.good, warn: colors.warn, danger: colors.danger, info: colors.info, neutral: colors.muted };

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.pill, { backgroundColor: toneBg[tone] }]}>
      <Text style={[styles.pillText, { color: toneFg[tone] }]}>{label}</Text>
    </View>
  );
}

export function Button({
  title, onPress, variant = "primary", loading, disabled, small,
}: {
  title: string; onPress: () => void; variant?: "primary" | "secondary" | "danger"; loading?: boolean; disabled?: boolean; small?: boolean;
}) {
  const bg = variant === "primary" ? colors.maroon : variant === "danger" ? colors.danger : "#fff";
  const fg = variant === "secondary" ? colors.maroon : "#fff";
  return (
    <TouchableOpacity
      style={[styles.button, small && styles.buttonSmall, { backgroundColor: bg, opacity: disabled || loading ? 0.6 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.maroon }]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Banner({ tone, title, text, children }: { tone: Tone; title: string; text?: string; children?: ReactNode }) {
  return (
    <View style={[styles.banner, { backgroundColor: toneBg[tone], borderColor: toneFg[tone] }]}>
      <Text style={[styles.bannerTitle, { color: toneFg[tone] }]}>{title}</Text>
      {text ? <Text style={styles.bannerText}>{text}</Text> : null}
      {children}
    </View>
  );
}

export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={round} />;
  return (
    <View style={[round, { backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ fontSize: size * 0.42, fontWeight: "700", color: colors.brown }}>{(name || "?").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  pillText: { fontSize: 12, fontWeight: "700" },
  button: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  buttonText: { fontSize: 16, fontWeight: "600" },
  banner: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  bannerTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  bannerText: { fontSize: 13, color: colors.text, lineHeight: 18 },
});

import { Pill, colors } from "@/components/ui";
import { Memory } from "@/lib/types";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Photo that never leaves a blank hole: no photo, or a photo that fails to load, shows the first letter instead.
export function MemoryPhoto({ name, uri, size, square }: { name: string; uri?: string | null; size: number; square?: boolean }) {
  const [failed, setFailed] = useState(false);
  const shape = { width: size, height: size, borderRadius: square ? 20 : size / 2 };
  if (uri && !failed) {
    return <Image source={{ uri }} style={shape} resizeMode="cover" onError={() => setFailed(true)} accessibilityLabel={`Photo of ${name}`} />;
  }
  return (
    <View style={[shape, styles.fallback]}>
      <Text style={{ fontSize: size * 0.4, fontWeight: "700", color: colors.brown }}>{(name || "?").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// Compact row for the family's list
export function MemoryRow({ memory, onPress }: { memory: Memory; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button">
      <MemoryPhoto name={memory.name} uri={memory.photoUrl} size={68} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{memory.name}</Text>
        <Pill label={memory.relationship} tone="info" />
        {memory.story ? <Text style={styles.rowStory} numberOfLines={2}>{memory.story}</Text> : null}
      </View>
      <Text style={styles.chevron}>{memory.canEdit === false ? "🔒" : "›"}</Text>
    </TouchableOpacity>
  );
}

// Large, high-contrast card for the patient
export function MemoryBigCard({ memory }: { memory: Memory }) {
  return (
    <View style={styles.big}>
      <MemoryPhoto name={memory.name} uri={memory.photoUrl} size={260} square />
      <Text style={styles.bigName}>{memory.name}</Text>
      <View style={styles.bigRelation}>
        <Text style={styles.bigRelationText}>{memory.relationship}</Text>
      </View>
      {memory.story ? <Text style={styles.bigStory}>{memory.story}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.card, borderRadius: 16,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  rowName: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 4 },
  rowStory: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
  chevron: { fontSize: 26, color: colors.muted },
  big: { alignItems: "center", backgroundColor: "#fff", borderRadius: 28, padding: 22, borderWidth: 2, borderColor: colors.border },
  bigName: { fontSize: 38, fontWeight: "800", color: "#222", marginTop: 18, textAlign: "center" },
  bigRelation: { backgroundColor: colors.maroon, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 8, marginTop: 10 },
  bigRelationText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  bigStory: { fontSize: 24, lineHeight: 34, color: "#222", marginTop: 18, textAlign: "center" },
});
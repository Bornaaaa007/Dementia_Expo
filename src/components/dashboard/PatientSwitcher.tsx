import { Avatar, colors } from "@/components/ui";
import { PatientSummary } from "@/lib/types";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export function PatientSwitcher({
  patients, selectedId, onSelect, onAdd,
}: {
  patients: PatientSummary[]; selectedId: string | null; onSelect: (id: string) => void; onAdd: () => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={{ gap: 10 }}>
      {patients.map((p) => {
        const active = p.id === selectedId;
        return (
          <TouchableOpacity key={p.id} style={[styles.chip, active && styles.chipActive]} onPress={() => onSelect(p.id)} accessibilityRole="button">
            <Avatar name={p.name} uri={p.photoUrl} size={30} />
            <Text style={[styles.name, active && { color: "#fff" }]}>{p.name}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={[styles.chip, styles.add]} onPress={onAdd}>
        <Text style={styles.addText}>+ Add / join</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0, marginBottom: 14 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  name: { fontSize: 14, fontWeight: "600", color: colors.text },
  add: { borderStyle: "dashed" },
  addText: { fontSize: 13, color: colors.maroon, fontWeight: "600" },
});

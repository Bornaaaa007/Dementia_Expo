import { MemoryRow } from "@/components/MemoryCard";
import { Banner, Button, Card, colors } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { notify } from "@/lib/notify";
import { Memory } from "@/lib/types";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FamilyMemories() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  const [items, setItems] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) {
      setError("No patient selected. Go back and choose a patient first.");
      return;
    }
    try {
      setError(null);
      const res = await api<{ memories: Memory[] }>(`/api/patients/${patientId}/memories`);
      setItems(res.memories);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [patientId]);

  // reload every time the screen is shown, so a card you just saved appears at once
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = () => router.push({ pathname: "/family/memory-form", params: { patientId } });

  const open = (m: Memory) => {
    if (m.canEdit === false) {
      notify("Added by another family member", "Only the profile owner or the person who added this card can change it.");
      return;
    }
    router.push({ pathname: "/family/memory-form", params: { patientId, memoryId: m.id } });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Loved ones</Text>
        <Text style={styles.sub}>The patient sees these cards on their own device. Add a clear photo, a name and a short story.</Text>

        <View style={{ marginVertical: 14 }}>
          <Button title="+ Add a loved one" onPress={add} disabled={!patientId} />
        </View>

        {error ? (
          <Banner tone="danger" title="Couldn't load the memory cards" text={error}>
            <View style={{ marginTop: 10 }}>
              <Button title="Try again" small onPress={load} />
            </View>
          </Banner>
        ) : null}

        {!items && !error ? <ActivityIndicator style={{ marginTop: 30 }} color={colors.maroon} /> : null}

        {items && items.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No loved ones yet</Text>
            <Text style={styles.emptyText}>
              Start with the people the patient asks about most: a child, a spouse, a close friend. Each card shows their photo, name,
              how they are related and a short story.
            </Text>
          </Card>
        ) : null}

        {items?.map((m) => (
          <MemoryRow key={m.id} memory={m} onPress={() => open(m)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  back: { color: colors.maroon, fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.muted, marginTop: 4, lineHeight: 20 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dementia NestCare</Text>
      <Text style={styles.subtitle}>Who's using the app?</Text>

      <TouchableOpacity
        style={[styles.roleButton, { backgroundColor: "#51121A" }]}
        onPress={() => router.push("/family/login")}
      >
        <Text style={styles.roleButtonText}>I'm a Family Member</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.roleButton, { backgroundColor: "#583722" }]}
        onPress={() => router.push("/patient/login")}
      >
        <Text style={styles.roleButtonText}>I'm the Patient</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#BDD7DE",
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#777",
    marginBottom: 40,
  },
  roleButton: {
    width: "100%",
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  roleButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

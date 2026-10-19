import { api, ApiError } from "@/lib/api";
import { clearDevice, getFaceSession, loadDevice, setFaceSession } from "@/lib/patientDevice";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function getTimeInfo(hour: number) {
  if (hour >= 5 && hour < 11) {
    return { greeting: "Good Morning", icon: "🌅", label: "Morning" };
  } else if (hour >= 11 && hour < 17) {
    return { greeting: "Good Afternoon", icon: "☀️", label: "Daytime" };
  } else if (hour >= 17 && hour < 20) {
    return { greeting: "Good Evening", icon: "🌇", label: "Evening" };
  } else {
    return { greeting: "Good Night", icon: "🌙", label: "Night" };
  }
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function PatientHome() {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [name, setName] = useState("");

  // Only a paired device may open this screen. Opening it also tells the family the patient is active.
    useEffect(() => {
    (async () => {
      const device = await loadDevice();
      const session = getFaceSession();
      if (!device || !session) return router.replace("/patient/login"); // no face check yet
      setName(device.name);
      try {
        await api("/api/patient-device/checkin", {
          method: "POST",
          body: {},
          deviceToken: device.token,
          faceSession: session,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          if (e.code === "NO_DEVICE") await clearDevice(); // pairing was removed
          setFaceSession(null); // face session expired: lock again
          router.replace("/patient/login");
        }
        // offline: stay on the screen, the check-in is simply skipped
      }
    })();
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const { greeting, icon, label } = getTimeInfo(hour);

  const dayName = dayNames[now.getDay()];
  const monthName = monthNames[now.getMonth()];
  const dateNum = now.getDate();
  const year = now.getFullYear();

  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  const displayMinute = now.getMinutes().toString().padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.icon}>{icon}</Text>

      <Text style={styles.greeting}>{name ? `${greeting}, ${name}` : greeting}</Text>
      <Text style={styles.periodLabel}>It's {label.toLowerCase()}</Text>

      <View style={styles.timeBox}>
        <Text style={styles.time}>
          {displayHour}:{displayMinute} <Text style={styles.ampm}>{ampm}</Text>
        </Text>
      </View>

      <View style={styles.dateBox}>
        <Text style={styles.dayName}>{dayName}</Text>
        <Text style={styles.fullDate}>
          {monthName} {dateNum}, {year}
        </Text>
      </View>
            <TouchableOpacity style={styles.memoriesButton} onPress={() => router.push("/patient/memories")} accessibilityRole="button">
        <Text style={styles.memoriesButtonText}>People who love you</Text>
      </TouchableOpacity>
            <TouchableOpacity style={[styles.memoriesButton, { marginTop: 16 }]} onPress={() => router.push("/patient/messages")} accessibilityRole="button">
        <Text style={styles.memoriesButtonText}>Messages from family</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.memoriesButton, { marginTop: 16 }]} onPress={() => router.push("/patient/jar")} accessibilityRole="button">
        <Text style={styles.memoriesButtonText}>Kind notes</Text>
      </TouchableOpacity>

           <TouchableOpacity
        onPress={() => {
          setFaceSession(null);
          router.replace("/patient/login");
        }}
      >
        <Text style={styles.lock}>Lock screen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#BDD7DE",
    padding: 24,
  },
  icon: {
    fontSize: 90,
    marginBottom: 10,
  },
  greeting: {
    fontSize: 34,
    fontWeight: "800",
    color: "#583722",
    marginBottom: 4,
    textAlign: "center",
  },
  periodLabel: {
    fontSize: 18,
    color: "#583722",
    opacity: 0.75,
    marginBottom: 30,
  },
  timeBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 40,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#583722",
  },
  time: {
    fontSize: 64,
    fontWeight: "800",
    color: "#583722",
  },
  ampm: {
    fontSize: 26,
    fontWeight: "700",
  },
  dateBox: {
    alignItems: "center",
  },
  dayName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#583722",
    marginBottom: 2,
  },
  fullDate: {
    fontSize: 20,
    color: "#583722",
    opacity: 0.85,
  },
    memoriesButton: {
    marginTop: 32,
    backgroundColor: "#51121A",
    borderRadius: 20,
    minHeight: 76,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  memoriesButtonText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },
  lock: {
    marginTop: 40,
    fontSize: 14,
    color: "#583722",
    opacity: 0.6,
  },
});

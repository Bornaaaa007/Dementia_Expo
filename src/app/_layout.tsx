import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { authClient } from "@/lib/auth-client";

// Family screens that can be opened without logging in
const PUBLIC_FAMILY = ["login", "signup", "forgot-password", "reset-password"];

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const segments = useSegments() as string[];
  const router = useRouter();

  // Only show the splash on first load, so the navigator is never torn down later
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isPending) setReady(true);
  }, [isPending]);

  const loggedIn = !!session?.user;
  const [group, screen] = segments;

  useEffect(() => {
    if (!ready) return;
    const inFamily = group === "family";
    const isPublic = inFamily && !!screen && PUBLIC_FAMILY.includes(screen);

    if (inFamily && !isPublic && !loggedIn) {
      router.replace("/family/login"); // protected screen without a session (or session expired)
    } else if (loggedIn && (group === undefined || group === "index" || (inFamily && screen === "login"))) {
      router.replace("/family/home"); // already logged in: skip the role chooser and login
    }
  }, [ready, loggedIn, group, screen, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FAF7F2" }}>
        <ActivityIndicator size="large" color="#51121A" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

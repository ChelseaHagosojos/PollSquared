import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { auth } from "../firebase/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null); // Fix type issue
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🚀 Checking Firebase User on Mount:", auth.currentUser);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("🔥 Auth State Changed:", currentUser);
      setUser(currentUser); // No more type error
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="login/index" />}
    </Stack>
  );
}

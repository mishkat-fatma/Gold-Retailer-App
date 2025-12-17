import { Stack, Redirect, usePathname } from "expo-router";
import { getAuth } from "firebase/auth";

export default function Layout() {
  const pathname = usePathname();
  const auth = getAuth();

  if (pathname === "/" && !auth.currentUser) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ClientSessionProvider } from '@/context/ClientSession';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ClientSessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </ClientSessionProvider>
  );
}

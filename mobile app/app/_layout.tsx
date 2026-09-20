import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ClientSessionProvider } from '@/context/ClientSession';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useClientSession } from '@/context/ClientSession';
import { LoginScreen } from '@/components/LoginScreen';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <ClientSessionProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </ClientSessionProvider>
  );
}

function RootNavigator() {
  const { user } = useClientSession();

  if (!user) return <LoginScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

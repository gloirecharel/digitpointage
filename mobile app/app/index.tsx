import { Redirect } from 'expo-router';
import { LoginScreen } from '@/components/LoginScreen';
import { useClientSession } from '@/context/ClientSession';

export default function Index() {
  const { user } = useClientSession();
  return user ? <Redirect href="/(tabs)" /> : <LoginScreen />;
}

import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react-native';
import { AnimatedEntrance } from '@/components/AnimatedEntrance';
import { useClientSession } from '@/context/ClientSession';

export function LoginScreen() {
  const { signIn, loading, error, clearError } = useClientSession();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (!code.trim() || !password) return;
    await signIn(code, password);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={['#2447f5', '#2f5bff', '#1741d8']} style={styles.topPanel}>
          <View style={styles.orbOne} />
          <View style={styles.orbTwo} />
          <AnimatedEntrance delay={30}>
            <View style={styles.logoFrame}>
              <Image source={require('@/assets/images/Original_Logo_Cyan_with_White_Background.png')} style={styles.logo} resizeMode="contain" />
            </View>
          </AnimatedEntrance>
          <AnimatedEntrance delay={120}>
            <Text style={styles.eyebrow}>DIGITPOINTAGE SMART</Text>
            <Text style={styles.heroTitle}>Votre épargne, en toute simplicité.</Text>
            <Text style={styles.heroSubtitle}>Suivez vos versements et votre solde depuis votre espace personnel.</Text>
          </AnimatedEntrance>
        </LinearGradient>

        <View style={styles.formShell}>
          <AnimatedEntrance delay={200}>
            <Text style={styles.formTitle}>Bienvenue dans votre espace</Text>
            <Text style={styles.formSubtitle}>Connectez-vous pour continuer</Text>
          </AnimatedEntrance>

          <View style={styles.form}>
            <AnimatedEntrance delay={260}>
              <View style={styles.field}>
                <Text style={styles.label}>Code client</Text>
                <View style={styles.inputWrap}>
                  <UserRound size={19} color="#2f5bff" />
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={(value) => { setCode(value); if (error) clearError(); }}
                    placeholder="Ex : CLI-2026-0001"
                    placeholderTextColor="#9aa5b1"
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </AnimatedEntrance>

            <AnimatedEntrance delay={320}>
              <View style={styles.field}>
                <Text style={styles.label}>Mot de passe</Text>
                <View style={styles.inputWrap}>
                  <LockKeyhole size={19} color="#2f5bff" />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(value) => { setPassword(value); if (error) clearError(); }}
                    placeholder="Votre mot de passe"
                    placeholderTextColor="#9aa5b1"
                    secureTextEntry={!showPassword}
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowPassword((value) => !value)} accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                    {showPassword ? <EyeOff size={19} color="#718091" /> : <Eye size={19} color="#718091" />}
                  </Pressable>
                </View>
              </View>
            </AnimatedEntrance>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <AnimatedEntrance delay={380}>
              <Pressable
                style={({ pressed }) => [styles.submitButton, loading && styles.submitButtonDisabled, pressed && styles.submitPressed]}
                onPress={submit}
                disabled={loading}
              >
                <Text style={styles.submitText}>{loading ? 'Connexion en cours…' : 'Se connecter'}</Text>
                <ArrowRight size={20} color="#ffffff" />
              </Pressable>
            </AnimatedEntrance>

            <View style={styles.secureNote}>
              <ShieldCheck size={15} color="#2f5bff" />
              <Text style={styles.secureText}>Connexion sécurisée et confidentielle</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7ff' },
  container: { flex: 1 },
  topPanel: { minHeight: 345, paddingHorizontal: 28, paddingTop: 34, paddingBottom: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbOne: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.08)', top: -100, right: -70 },
  orbTwo: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(10,26,130,0.13)', bottom: -85, left: -55 },
  logoFrame: { width: 120, height: 120, borderRadius: 34, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 12, marginBottom: 20, shadowColor: '#061b98', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  logo: { width: 96, height: 96 },
  eyebrow: { color: '#dbe3ff', fontSize: 11, fontWeight: '800', letterSpacing: 2, textAlign: 'center', marginBottom: 10 },
  heroTitle: { color: '#fff', fontSize: 25, lineHeight: 31, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  heroSubtitle: { color: '#dbe3ff', fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 310 },
  formShell: { flex: 1, backgroundColor: '#f5f7ff', marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 27 },
  formTitle: { color: '#17233f', fontSize: 21, fontWeight: '800', marginBottom: 5 },
  formSubtitle: { color: '#718091', fontSize: 14, marginBottom: 22 },
  form: { gap: 17 },
  field: { gap: 8 },
  label: { color: '#34415d', fontSize: 13, fontWeight: '700', marginLeft: 3 },
  inputWrap: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe2f3', borderRadius: 16, paddingHorizontal: 16, shadowColor: '#5265a8', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  input: { flex: 1, color: '#17233f', fontSize: 16, paddingVertical: 14 },
  errorText: { color: '#bd3b32', fontSize: 14, backgroundColor: '#fdecea', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, overflow: 'hidden' },
  submitButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#2f5bff', borderRadius: 16, shadowColor: '#2f5bff', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  submitButtonDisabled: { opacity: 0.65 },
  submitPressed: { transform: [{ scale: 0.98 }] },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secureNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  secureText: { color: '#7f8ca3', fontSize: 12 },
});

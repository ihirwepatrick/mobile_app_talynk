import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  light: {
    background: '#fff',
    card: '#f9f9f9',
    border: '#e5e7eb',
    text: '#222',
    textSecondary: '#666',
    input: '#f9f9f9',
    inputBorder: '#ddd',
    primary: '#007AFF',
    errorBg: '#fef2f2',
    errorBorder: '#fecaca',
    successBg: '#f0fdf4',
    successBorder: '#bbf7d0',
    warningBg: '#fefce8',
    warningBorder: '#fde68a',
    placeholder: '#888',
    buttonDisabled: '#ccc',
  },
  dark: {
    background: '#18181b',
    card: '#232326',
    border: '#27272a',
    text: '#f3f4f6',
    textSecondary: '#a1a1aa',
    input: '#232326',
    inputBorder: '#27272a',
    primary: '#60a5fa',
    errorBg: '#7f1d1d',
    errorBorder: '#b91c1c',
    successBg: '#14532d',
    successBorder: '#22c55e',
    warningBg: '#78350f',
    warningBorder: '#f59e42',
    placeholder: '#71717a',
    buttonDisabled: '#444',
  },
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const { login, loading } = useAuth();
  const colorScheme = useColorScheme() || 'light';
  const C = COLORS[colorScheme];
  

  const handleLogin = async () => {
    setError(null);
    setSuccess(null);
    setWarning(null);
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    const success = await login(username, password);
    if (success) {
      setSuccess('Login successful!');
      router.replace('/(tabs)');
    } else {
      setError('Invalid username/email or password');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>Sign in to Talynk</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>Welcome back! Please login to your account.</Text>
        </View>

        {/* Alerts */}
        {error && (
          <View style={[styles.alert, { backgroundColor: C.errorBg, borderColor: C.errorBorder }]}> 
            <Ionicons name="alert-circle" size={20} color={colorScheme === 'dark' ? '#fecaca' : '#dc2626'} style={{ marginRight: 8 }} />
            <Text style={[styles.alertText, { color: C.text }]}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={[styles.alert, { backgroundColor: C.successBg, borderColor: C.successBorder }]}> 
            <Ionicons name="checkmark-circle" size={20} color={colorScheme === 'dark' ? '#22c55e' : '#16a34a'} style={{ marginRight: 8 }} />
            <Text style={[styles.alertText, { color: C.text }]}>{success}</Text>
          </View>
        )}
        {warning && (
          <View style={[styles.alert, { backgroundColor: C.warningBg, borderColor: C.warningBorder }]}> 
            <Ionicons name="warning" size={20} color={colorScheme === 'dark' ? '#fde68a' : '#f59e42'} style={{ marginRight: 8 }} />
            <Text style={[styles.alertText, { color: C.text }]}>{warning}</Text>
          </View>
        )}

        <View style={[styles.form, { backgroundColor: C.card, borderColor: C.border }]}> 
          <Text style={[styles.label, { color: C.text }]}>Username or Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.input, borderColor: C.inputBorder, color: C.text }]}
            placeholder="Enter your username or email"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            placeholderTextColor={C.placeholder}
            editable={!loading}
          />

          <View style={{ marginTop: 16 }}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: C.text }]}>Password</Text>
              {/* TODO: Implement forgot password screen and route */}
              {/* <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                <Text style={[styles.forgotText, { color: C.primary }]}>Forgot password?</Text>
              </TouchableOpacity> */}
            </View>
            <View style={[styles.passwordInputContainer, { backgroundColor: C.input, borderColor: C.inputBorder }]}> 
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: 'transparent', borderColor: 'transparent', color: C.text }]}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                placeholderTextColor={C.placeholder}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={10}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={C.placeholder}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setRememberMe((v) => !v)}
              activeOpacity={0.7}
            >
              {rememberMe ? (
                <Ionicons name="checkbox" size={20} color={C.primary} />
              ) : (
                <Ionicons name="square-outline" size={20} color={C.placeholder} />
              )}
            </TouchableOpacity>
            <Text style={[styles.rememberText, { color: C.text }]}>Remember me</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: loading ? C.buttonDisabled : C.primary }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={[styles.linkText, { color: C.textSecondary }]}>
              Don't have an account? <Text style={{ color: C.primary, fontWeight: 'bold' }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  backButton: {
    padding: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertText: {
    fontSize: 15,
    flex: 1,
  },
  form: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 12,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  eyeButton: {
    padding: 10,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  checkbox: {
    marginRight: 8,
  },
  rememberText: {
    fontSize: 15,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 4,
  },
  linkText: {
    fontSize: 15,
  },
}); 
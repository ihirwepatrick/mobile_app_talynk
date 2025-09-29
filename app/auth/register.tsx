import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const THEME = {
  background: '#000000',
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
};

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const { register, loading, error, clearError } = useAuth();
  const C = THEME;

  const handleRegister = async () => {
    clearError();
    setSuccess(null);
    setWarning(null);
    
    // Validate required fields
    if (!name.trim()) {
      // For validation errors, we'll show them in the UI but not store in auth context
      setWarning('Please enter your full name');
      return;
    }
    if (!username.trim()) {
      setWarning('Please enter a username');
      return;
    }
    if (!phone1.trim()) {
      setWarning('Please enter your primary phone number');
      return;
    }
    if (!password) {
      setWarning('Please enter a password');
      return;
    }
    if (!confirmPassword) {
      setWarning('Please confirm your password');
      return;
    }
    if (!agreed) {
      setWarning('You must agree to the Terms and Conditions');
      return;
    }
    
    // Validate username format (letters, numbers, underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setWarning('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    // Validate email format if provided
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setWarning('Please enter a valid email address');
      return;
    }
    
    // Validate phone format (basic international format)
    const phoneRegex = /^\+?[\d\s\-\(\)]{8,20}$/;
    if (!phoneRegex.test(phone1)) {
      setWarning('Please enter a valid primary phone number');
      return;
    }
    
    // Validate secondary phone if provided
    if (phone2.trim() && !phoneRegex.test(phone2)) {
      setWarning('Please enter a valid secondary phone number');
      return;
    }
    
    // Validate password strength
    if (password.length < 8) {
      setWarning('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setWarning('Passwords do not match');
      return;
    }
    
    // Prepare registration data
    const registrationData = {
      name: name.trim(),
      username: username.trim(),
      email: email.trim() || `${username.trim()}@talynk.com`, // Use generated email if not provided
      password: password,
      phone1: phone1.trim(),
      phone2: phone2.trim() || undefined, // Only send if provided
    };
    
          // Attempt registration
      try {
        const success = await register(registrationData);
    if (success) {
          setShowSuccessOverlay(true);
    } else {
          // The error message will be handled by the auth context
          // We don't need to set a generic error here
        }
      } catch (err: any) {
        setWarning(err.message || 'Registration failed. Please try again.');
    }
  };

  const openTerms = () => {
    // You can replace this with your actual terms URL
    Linking.openURL('https://talynk.com/terms');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" backgroundColor="#000000" />
      <ScrollView style={{ backgroundColor: C.background }} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>Sign up to join Talynk.</Text>
        </View>

        {/* Alerts */}
        {error && (
          <View style={[styles.alert, { backgroundColor: C.errorBg, borderColor: C.errorBorder }]}> 
            <Ionicons name="alert-circle" size={20} color={'#fecaca'} style={{ marginRight: 8 }} />
            <Text style={[styles.alertText, { color: C.text }]}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={[styles.alert, { backgroundColor: C.successBg, borderColor: C.successBorder }]}> 
            <Ionicons name="checkmark-circle" size={20} color={'#22c55e'} style={{ marginRight: 8 }} />
            <Text style={[styles.alertText, { color: C.text }]}>{success}</Text>
          </View>
        )}
        {warning && (
          <View style={[styles.alert, { backgroundColor: C.warningBg, borderColor: C.warningBorder }]}> 
            <Ionicons name="warning" size={20} color={'#fde68a'} style={{ marginRight: 8 }} />
            <Text style={[styles.alertText, { color: C.text }]}>{warning}</Text>
          </View>
        )}

        <View style={[styles.form, { backgroundColor: C.card, borderColor: C.border }]}> 
          <Text style={[styles.label, { color: C.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.input, borderColor: C.inputBorder, color: C.text }]}
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholderTextColor={C.placeholder}
            editable={!loading}
          />

          <Text style={[styles.label, { color: C.text }]}>Username</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.input, borderColor: C.inputBorder, color: C.text }]}
            placeholder="johndoe"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            placeholderTextColor={C.placeholder}
            editable={!loading}
          />
          <Text style={[styles.helperText, { color: C.textSecondary }]}>
            Username can only contain letters, numbers, and underscores
          </Text>

          <Text style={[styles.label, { color: C.text }]}>Email (Optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.input, borderColor: C.inputBorder, color: C.text }]}
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholderTextColor={C.placeholder}
            editable={!loading}
          />
          <Text style={[styles.helperText, { color: C.textSecondary }]}>
            If not provided, we'll use your username to create an account
          </Text>

          <View style={styles.phoneContainer}>
            <View style={styles.phoneRow}>
              <Text style={[styles.label, { color: C.text }]}>Primary Phone <Text style={{ color: '#ef4444' }}>*</Text></Text>
              <Text style={[styles.label, { color: C.text }]}>Secondary Phone (Optional)</Text>
            </View>
            <View style={styles.phoneInputs}>
              <TextInput
                style={[styles.phoneInput, { backgroundColor: C.input, borderColor: C.inputBorder, color: C.text }]}
                placeholder="+250 7XX XXX XXX"
                value={phone1}
                onChangeText={setPhone1}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                placeholderTextColor={C.placeholder}
                editable={!loading}
              />
              <TextInput
                style={[styles.phoneInput, { backgroundColor: C.input, borderColor: C.inputBorder, color: C.text }]}
                placeholder="+250 7XX XXX XXX"
                value={phone2}
                onChangeText={setPhone2}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                placeholderTextColor={C.placeholder}
                editable={!loading}
              />
            </View>
            <Text style={[styles.helperText, { color: C.textSecondary }]}>
              Enter valid phone numbers (e.g., +250 791234567)
            </Text>
          </View>

          <Text style={[styles.label, { color: C.text }]}>Password</Text>
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
          <Text style={[styles.helperText, { color: C.textSecondary }]}>
            Password must be at least 8 characters long
          </Text>

          <Text style={[styles.label, { color: C.text }]}>Confirm Password</Text>
          <View style={[styles.passwordInputContainer, { backgroundColor: C.input, borderColor: C.inputBorder }]}> 
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: 'transparent', borderColor: 'transparent', color: C.text }]}
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              placeholderTextColor={C.placeholder}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword((v) => !v)}
              hitSlop={10}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={22}
                color={C.placeholder}
              />
            </Pressable>
          </View>

          <View style={styles.termsContainer}>
            <Pressable
              onPress={() => setAgreed((v) => !v)}
              style={[
                styles.checkbox,
                {
                  borderColor: agreed ? C.primary : C.inputBorder,
                  backgroundColor: agreed ? C.primary : 'transparent',
                }
              ]}
              hitSlop={10}
            >
              {agreed && <Ionicons name="checkmark" size={16} color="#fff" />}
            </Pressable>
            <Text style={[styles.termsText, { color: C.text }]}>
              I agree to the{' '}
              <Text style={[styles.termsLink, { color: C.primary }]} onPress={openTerms}>
                Terms and Conditions
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: loading ? C.buttonDisabled : C.primary }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.linkText, { color: C.textSecondary }]}>
              Already have an account? <Text style={{ color: C.primary, fontWeight: 'bold' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <View style={[styles.overlayContainer, { backgroundColor: 'rgba(0,0,0,0.96)' }]}> 
          <View style={[styles.successOverlay, { backgroundColor: C.card }]}> 
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
            </View>
            <Text style={[styles.successTitle, { color: '#22c55e' }]}>Registration Successful!</Text>
            <Text style={[styles.successMessage, { color: C.textSecondary }]}>Your account has been created successfully. You can now sign in to start using Talynk.</Text>
            <TouchableOpacity
              style={styles.goToLoginButton}
              onPress={() => {
                setShowSuccessOverlay(false);
                router.push('/auth/login');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.goToLoginButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  phoneContainer: {
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  phoneInputs: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  termsText: {
    fontSize: 14,
    flex: 1,
  },
  termsLink: {
    textDecorationLine: 'underline',
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
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successOverlay: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  goToLoginButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  goToLoginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 
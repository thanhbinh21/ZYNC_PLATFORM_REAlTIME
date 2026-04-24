import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { GlassPanel } from '../../src/ui/GlassPanel';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/useAuthStore';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const { email, username, password, displayName, flow } = useLocalSearchParams();
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
      return;
    }

    try {
      setIsLoading(true);
      
      // Attempt to get device push token for notifications
      let deviceToken = undefined;
      try {
        const isExpoGo = Constants.appOwnership === 'expo';
        if (!isExpoGo) {
          const Notifications = require('expo-notifications');
          const { status } = await Notifications.getPermissionsAsync();
          if (status === 'granted') {
            deviceToken = (await Notifications.getExpoPushTokenAsync()).data;
          }
        } else {
          console.log("Running in Expo Go, skipping push token generation");
        }
      } catch (e) {
        console.log("Could not get device token", e);
      }

      if (flow === 'login') {
        const res = await api.post('/auth/login-password/verify-otp', {
          email,
          password: password,
          otp,
          deviceToken,
          platform: Platform.OS
        });
        
        if (res.data.success) {
          await login(res.data.accessToken, res.data.user);
          if (!res.data.user.onboardingCompleted) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)');
          }
        }
      } else if (flow === 'register') {
        const res = await api.post('/auth/verify-otp', {
          email,
          username,
          password: password,
          displayName,
          otp,
          deviceToken,
          platform: Platform.OS
        });
        
        if (res.data.success) {
          await login(res.data.accessToken, res.data.user);
          if (!res.data.user.onboardingCompleted) {
            router.replace('/(auth)/onboarding');
          } else {
            router.replace('/(tabs)');
          }
        }
      } else if (flow === 'forgot') {
        // Implementation for forgot password
        router.replace({
          pathname: '/(auth)/forgot-password',
          params: { step: 'reset', email, otp }
        });
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Mã OTP không hợp lệ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.formContainer}>
        <GlassPanel style={styles.formCard}>
        <Text style={styles.title}>Xác thực OTP</Text>
        <Text style={styles.subtitle}>Mã gồm 6 chữ số đã được gửi tới {email}</Text>

        <Input
          placeholder="Nhập mã OTP..."
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={6}
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
        />

        <Button 
          title="Xác thực" 
          onPress={handleVerify} 
          isLoading={isLoading}
          style={{ marginTop: 16 }} 
        />

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={styles.linkTextBold}>Quay lại</Text>
        </TouchableOpacity>
        </GlassPanel>
      </View>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  formContainer: { flex: 1, justifyContent: 'center', padding: 24, paddingBottom: 60 },
  formCard: { padding: 22, borderRadius: 26 },
  title: { ...typography.h2, color: '#93ffdb', marginBottom: 8, textAlign: 'center' },
  subtitle: { ...typography.body, color: '#c8e5db', marginBottom: 32, textAlign: 'center' },
  linkTextBold: { color: '#9effda', fontFamily: 'BeVietnamPro_600SemiBold' },
});

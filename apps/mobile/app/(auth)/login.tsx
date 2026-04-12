import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }

    try {
      setIsLoading(true);
      // Trigger request OTP for password login flow
      await api.post('/auth/login-password/request-otp', { email, password });
      
      // Navigate to verify OTP screen passing state
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { identifier: email, password, flow: 'login' },
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng nhập thất bại');
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
        <Text style={styles.title}>Đăng nhập vào Zync</Text>
        <Text style={styles.subtitle}>Kết nối và trò chuyện thời gian thực</Text>

        <Input
          label="Email hoặc Số điện thoại"
          placeholder="Nhập email của bạn..."
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Mật khẩu"
          placeholder="Nhập mật khẩu..."
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        <Button 
          title="Đăng nhập" 
          onPress={handleLogin} 
          isLoading={isLoading}
          style={{ marginTop: 16 }} 
        />

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.linkText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ marginTop: 16 }}>
            <Text style={styles.linkText}>
              Chưa có tài khoản? <Text style={styles.linkTextBold}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: 32,
    textAlign: 'center',
  },
  linksContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  linkTextBold: {
    color: colors.primary,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
});

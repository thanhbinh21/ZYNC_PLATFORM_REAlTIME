import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { GlassPanel } from '../../src/ui/GlassPanel';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { step, email: paramEmail, otp: paramOtp } = useLocalSearchParams();
  
  const isResetStep = step === 'reset';

  const [email, setEmail] = useState((paramEmail as string) || '');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập tài khoản');
      return;
    }
    try {
      setIsLoading(true);
      await api.post('/auth/forgot-password/request-otp', { email });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email, flow: 'forgot' },
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword) {
       Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
       return;
    }
    try {
      setIsLoading(true);
      await api.post('/auth/forgot-password/reset', {
        email,
        otp: paramOtp,
        newPassword
      });
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi');
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra');
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
        <Text style={styles.title}>Quên mật khẩu</Text>

        {!isResetStep ? (
          <>
            <Input
              label="Email"
              placeholder="Nhập email khôi phục..."
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <Button title="Gửi mã OTP" onPress={handleRequestOtp} isLoading={isLoading} />
          </>
        ) : (
          <>
             <Input
              label="Mật khẩu mới"
              placeholder="Nhập mật khẩu mới..."
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
            />
            <Button title="Cập nhật mật khẩu" onPress={handleReset} isLoading={isLoading} />
          </>
        )}

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={styles.linkTextBold}>Trở về trang Login</Text>
        </TouchableOpacity>
        </GlassPanel>
      </View>
    </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  formContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  formCard: { padding: 22, borderRadius: 26 },
  title: { ...typography.h2, color: '#93ffdb', marginBottom: 32, textAlign: 'center' },
  linkTextBold: { color: '#9effda', fontFamily: 'BeVietnamPro_600SemiBold' },
});

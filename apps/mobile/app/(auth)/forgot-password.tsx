import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { step, identifier: paramId, otp: paramOtp } = useLocalSearchParams();
  
  const isResetStep = step === 'reset';

  const [identifier, setIdentifier] = useState((paramId as string) || '');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!identifier) {
      Alert.alert('Lỗi', 'Vui lòng nhập tài khoản');
      return;
    }
    try {
      setIsLoading(true);
      await api.post('/auth/forgot-password/request-otp', { identifier });
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { identifier, flow: 'forgot' },
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
        identifier,
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Quên mật khẩu</Text>

        {!isResetStep ? (
          <>
            <Input
              label="Email hoặc Số điện thoại"
              placeholder="Nhập thông tin khôi phục..."
              value={identifier}
              onChangeText={setIdentifier}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  formContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { ...typography.h2, color: colors.primary, marginBottom: 32, textAlign: 'center' },
  linkTextBold: { color: colors.primary, fontFamily: 'BeVietnamPro_600SemiBold' },
});

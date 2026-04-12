import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!identifier || !password || !displayName) {
      Alert.alert('Lỗi', 'Vui lòng điền đủ thông tin');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/auth/register', { identifier });
      
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { identifier, password, displayName, flow: 'register' },
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng ký thất bại');
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
        <Text style={styles.title}>Tạo tài khoản mới</Text>

        <Input
          label="Tên hiển thị"
          placeholder="Nhập tên của bạn..."
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Input
          label="Email hoặc Số điện thoại"
          placeholder="Nhập email/số điện thoại..."
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Mật khẩu"
          placeholder="Nhập mật khẩu của bạn..."
          value={password}
          onChangeText={setPassword}
          isPassword
        />

        <Button 
          title="Bắt đầu xác thực" 
          onPress={handleRegister} 
          isLoading={isLoading}
          style={{ marginTop: 16 }} 
        />

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>
              Đã có tài khoản? <Text style={styles.linkTextBold}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  formContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { ...typography.h2, color: colors.primary, marginBottom: 32, textAlign: 'center' },
  linksContainer: { marginTop: 24, alignItems: 'center' },
  linkText: { ...typography.caption, color: colors.textMuted },
  linkTextBold: { color: colors.primary, fontFamily: 'BeVietnamPro_600SemiBold' },
});

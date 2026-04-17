import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { GlassPanel } from '../../src/ui/GlassPanel';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !username || !password || !displayName) {
      Alert.alert('Lỗi', 'Vui lòng điền đủ thông tin');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/auth/register', { email, username });
      
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { email, username, password, displayName, flow: 'register' },
      });
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng ký thất bại');
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
        <Text style={styles.title}>Tạo tài khoản mới</Text>

        <Input
          label="Tên hiển thị"
          placeholder="Nhập tên của bạn..."
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Input
          label="Email"
          placeholder="Nhập email..."
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="@Username"
          placeholder="Ví dụ: zync.user"
          value={username}
          onChangeText={setUsername}
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
  linksContainer: { marginTop: 24, alignItems: 'center' },
  linkText: { ...typography.caption, color: '#c8e5db' },
  linkTextBold: { color: '#9effda', fontFamily: 'BeVietnamPro_600SemiBold' },
});

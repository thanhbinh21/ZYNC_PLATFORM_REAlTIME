import React, { useState } from 'react';
import { View, StyleSheet, Text, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { GlassPanel } from '../../src/ui/GlassPanel';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/useAuthStore';

const SKILL_TAGS = [
  'javascript','typescript','react','nodejs','python',
  'java','go','react-native','flutter',
  'aws','docker','kubernetes','sql','nosql'
];

export default function OnboardingScreen() {
  const router = useRouter();
  const updateUser = useAuthStore(state => state.updateUser);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [devRole, setDevRole] = useState('developer');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState('');

  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handleFinish = async () => {
    try {
      setIsLoading(true);
      const res = await api.patch('/users/me', {
        devRole,
        bio,
        skills,
        githubUrl: githubUrl || undefined,
        onboardingCompleted: true
      });
      
      if (updateUser && res.data.user) {
        updateUser(res.data.user);
      }
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin');
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <GlassPanel style={styles.formCard}>
          <Text style={styles.title}>Chào mừng bạn! 🚀</Text>
          <Text style={styles.subtitle}>Bước {step}/2 - Hoàn thiện hồ sơ</Text>

          {step === 1 && (
            <View>
              <Text style={styles.label}>Vai trò của bạn</Text>
              <Input
                placeholder="Ví dụ: Frontend Developer, Sinh viên IT..."
                value={devRole}
                onChangeText={setDevRole}
              />

              <Text style={styles.label}>Giới thiệu bản thân</Text>
              <Input
                placeholder="Vài dòng về bạn..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
              />
              
              <Button 
                title="Tiếp tục" 
                onPress={() => setStep(2)} 
                style={{ marginTop: 24 }} 
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.label}>Kỹ năng (Skills)</Text>
              <View style={styles.skillsContainer}>
                {SKILL_TAGS.map(skill => {
                  const isSelected = skills.includes(skill);
                  return (
                    <TouchableOpacity 
                      key={skill} 
                      style={[styles.skillChip, isSelected && styles.skillChipActive]}
                      onPress={() => toggleSkill(skill)}
                    >
                      <Text style={[styles.skillText, isSelected && styles.skillTextActive]}>
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>GitHub URL (Không bắt buộc)</Text>
              <Input
                placeholder="https://github.com/..."
                value={githubUrl}
                onChangeText={setGithubUrl}
                autoCapitalize="none"
              />

              <View style={styles.buttonRow}>
                <Button 
                  title="Quay lại" 
                  onPress={() => setStep(1)} 
                  variant="outline"
                  style={{ flex: 1, marginRight: 8 }} 
                />
                <Button 
                  title="Hoàn thành" 
                  onPress={handleFinish} 
                  isLoading={isLoading}
                  style={{ flex: 1, marginLeft: 8 }} 
                />
              </View>
            </View>
          )}
        </GlassPanel>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 60 },
  formCard: { padding: 22, borderRadius: 26 },
  title: { ...typography.h2, color: '#93ffdb', marginBottom: 8, textAlign: 'center' },
  subtitle: { ...typography.body, color: '#c8e5db', marginBottom: 24, textAlign: 'center' },
  label: { ...typography.caption, color: '#fff', marginBottom: 8, marginLeft: 4, fontFamily: 'BeVietnamPro_600SemiBold' },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#c8e5db', backgroundColor: 'transparent' },
  skillChipActive: { backgroundColor: '#9effda', borderColor: '#9effda' },
  skillText: { color: '#c8e5db', fontSize: 13, fontFamily: 'BeVietnamPro_500Medium' },
  skillTextActive: { color: '#000', fontFamily: 'BeVietnamPro_600SemiBold' },
  buttonRow: { flexDirection: 'row', marginTop: 32 }
});

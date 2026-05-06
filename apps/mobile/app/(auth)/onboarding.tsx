import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '../../src/ui/Input';
import { Button } from '../../src/ui/Button';
import { GlassPanel } from '../../src/ui/GlassPanel';
import { AuthHeader } from '../../src/components/AuthHeader';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Sparkles, Code, User } from 'lucide-react-native';

const SKILL_TAGS = [
  'javascript', 'typescript', 'react', 'nodejs', 'python',
  'java', 'go', 'react-native', 'flutter',
  'aws', 'docker', 'kubernetes', 'sql', 'nosql'
];

const DEV_ROLES = [
  { id: 'developer', label: 'Lập trình viên' },
  { id: 'student', label: 'Sinh viên IT' },
  { id: 'designer', label: 'Designer' },
  { id: 'pm', label: 'Quản lý dự án' },
  { id: 'other', label: 'Khác' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const updateUser = useAuthStore(state => state.updateUser);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [devRole, setDevRole] = useState('developer');
  const [customRole, setCustomRole] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [errors, setErrors] = useState<{ bio?: string }>({});

  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) 
      ? prev.filter(s => s !== skill) 
      : [...prev, skill]
    );
  };

  const validateBio = (bioValue: string): boolean => {
    if (bioValue && bioValue.length > 500) {
      setErrors(prev => ({ ...prev, bio: 'Giới thiệu không được vượt quá 500 ký tự' }));
      return false;
    }
    setErrors(prev => ({ ...prev, bio: undefined }));
    return true;
  };

  const handleFinish = async () => {
    if (!validateBio(bio)) {
      return;
    }

    try {
      setIsLoading(true);
      const finalRole = devRole === 'other' ? customRole : devRole;
      const res = await api.patch('/users/me', {
        devRole: finalRole,
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
      const message = error.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin';
      Alert.alert('Lỗi', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <AuthHeader 
              title="Hoàn thiện hồ sơ" 
              subtitle={`Bước ${step}/2`}
            />

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeIcon}>
                <Sparkles size={28} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={styles.welcomeTitle}>Chào mừng bạn đến với Zync!</Text>
              <Text style={styles.welcomeSubtitle}>
                Hãy hoàn thiện hồ sơ để kết nối với cộng đồng
              </Text>
            </View>

            {/* Form */}
            <GlassPanel style={styles.formCard}>
              {step === 1 && (
                <View>
                  {/* Role Selection */}
                  <Text style={styles.label}>Vai trò của bạn</Text>
                  <View style={styles.roleContainer}>
                    {DEV_ROLES.map((role) => (
                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.roleChip,
                          devRole === role.id && styles.roleChipActive
                        ]}
                        onPress={() => setDevRole(role.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.roleText,
                          devRole === role.id && styles.roleTextActive
                        ]}>
                          {role.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {devRole === 'other' && (
                    <Input
                      placeholder="Nhập vai trò của bạn..."
                      value={customRole}
                      onChangeText={setCustomRole}
                      style={styles.customRoleInput}
                    />
                  )}

                  {/* Bio */}
                  <Text style={styles.label}>Giới thiệu bản thân (Không bắt buộc)</Text>
                  <Input
                    placeholder="Vài dòng về bạn, công việc, sở thích..."
                    value={bio}
                    onChangeText={(text) => {
                      setBio(text);
                      if (errors.bio) validateBio(text);
                    }}
                    onBlur={() => validateBio(bio)}
                    error={errors.bio}
                    multiline
                    numberOfLines={3}
                    style={styles.bioInput}
                  />
                  
                  <Button 
                    title="Tiếp tục"
                    onPress={() => setStep(2)} 
                    style={styles.nextButton} 
                  />
                </View>
              )}

              {step === 2 && (
                <View>
                  {/* Skills */}
                  <Text style={styles.label}>Kỹ năng của bạn</Text>
                  <View style={styles.skillsContainer}>
                    {SKILL_TAGS.map((skill) => {
                      const isSelected = skills.includes(skill);
                      return (
                        <TouchableOpacity 
                          key={skill} 
                          style={[
                            styles.skillChip, 
                            isSelected && styles.skillChipActive
                          ]}
                          onPress={() => toggleSkill(skill)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.skillText, 
                            isSelected && styles.skillTextActive
                          ]}>
                            {skill}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.skillHint}>
                    Đã chọn: {skills.length} kỹ năng
                  </Text>

                  {/* GitHub URL */}
                  <Text style={[styles.label, { marginTop: 16 }]}>
                    GitHub URL (Không bắt buộc)
                  </Text>
                  <Input
                    placeholder="https://github.com/username"
                    value={githubUrl}
                    onChangeText={setGithubUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />

                  {/* Action Buttons */}
                  <View style={styles.buttonRow}>
                    <Button 
                      title="Quay lại"
                      onPress={() => setStep(1)} 
                      variant="outline"
                      style={styles.backButton} 
                    />
                    <Button 
                      title="Hoàn thành"
                      onPress={handleFinish} 
                      isLoading={isLoading}
                      style={styles.finishButton} 
                    />
                  </View>
                </View>
              )}
            </GlassPanel>

            {/* Skip Option */}
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Bỏ qua bây giờ</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 8,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.glassGlow,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  welcomeTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSubtle,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  formCard: {
    padding: 24,
    marginBottom: 24,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: 12,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassPanel,
  },
  roleChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roleText: {
    ...typography.caption,
    color: colors.textSubtle,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  roleTextActive: {
    color: colors.text,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  customRoleInput: {
    marginBottom: 16,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  nextButton: {
    marginTop: 24,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassPanel,
  },
  skillChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  skillText: {
    ...typography.caption,
    color: colors.textSubtle,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  skillTextActive: {
    color: colors.text,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  skillHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  backButton: {
    flex: 1,
  },
  finishButton: {
    flex: 1,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

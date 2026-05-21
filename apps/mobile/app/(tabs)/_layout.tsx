import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MessageCircle, UserRound, Users, Bell } from 'lucide-react-native';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';
import { getAppTheme } from '../../src/theme/get-app-theme';

export default function TabLayout() {
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);

  return (
    <Tabs
      initialRouteName="chat"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: {
          fontFamily: 'BeVietnamPro_500Medium',
          fontSize: 11,
          marginBottom: 5,
        },
        tabBarStyle: {
          backgroundColor: theme.bgCard,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 70,
          paddingTop: 8,
          paddingBottom: 4,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView intensity={88} tint="light" style={StyleSheet.absoluteFill} />
        ),
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Bạn bè',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Thông báo',
          tabBarIcon: ({ color }) => <Bell size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => <UserRound size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}


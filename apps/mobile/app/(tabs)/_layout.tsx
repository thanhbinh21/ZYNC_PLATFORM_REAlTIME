import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../src/theme/colors';
import { NotificationsProvider } from '../../src/context/notifications-context';

export default function TabLayout() {
  return (
    <NotificationsProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9effda',
        tabBarInactiveTintColor: '#8ca69f',
        tabBarLabelStyle: {
          fontFamily: 'BeVietnamPro_500Medium',
          fontSize: 11,
          marginBottom: 5,
        },
        tabBarStyle: {
          backgroundColor: colors.glassPanelStrong,
          borderTopWidth: 1,
          borderTopColor: colors.glassBorder,
          height: 70,
          paddingTop: 8,
          paddingBottom: 4,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: colors.glassShadow,
          shadowOpacity: 0.52,
          shadowRadius: 20,
          shadowOffset: {
            width: 0,
            height: 10,
          },
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView intensity={88} tint="dark" style={StyleSheet.absoluteFill} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Tin nhắn',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Danh bạ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
    </NotificationsProvider>
  );
}

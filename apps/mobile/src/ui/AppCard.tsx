import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { lightTheme } from '../theme/colors';

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
}

export function AppCard({ children, style, onPress, activeOpacity = 0.7 }: AppCardProps) {
  if (onPress) {
    return (
      <TouchableOpacity 
        style={[styles.card, style]} 
        onPress={onPress} 
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

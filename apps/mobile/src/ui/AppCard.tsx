import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { lightTheme } from '../theme/colors';
import { radius } from '../theme/spacing';
import { AnimatedPressable } from './AnimatedPressable';

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeScale?: number;
}

export function AppCard({ children, style, onPress, activeScale = 0.98 }: AppCardProps) {
  if (onPress) {
    return (
      <AnimatedPressable 
        style={[styles.card, style]} 
        onPress={onPress} 
        activeScale={activeScale}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightTheme.surfaceCard,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: lightTheme.border,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
});

import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { lightTheme } from '../theme/colors';

interface AppIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  size?: number;
}

export function AppIconButton({ 
  icon, 
  onPress, 
  style, 
  backgroundColor = '#FFFFFF',
  size = 44 
}: AppIconButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { 
          backgroundColor,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

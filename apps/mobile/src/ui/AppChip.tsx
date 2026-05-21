import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, View } from 'react-native';
import { lightTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface AppChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function AppChip({ label, active, onPress, style, icon }: AppChipProps) {
  const containerStyle = [
    styles.chip,
    active && styles.chipActive,
    style
  ];

  const content = (
    <>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={containerStyle} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  chipActive: {
    backgroundColor: lightTheme.accentLight,
    borderColor: lightTheme.accent,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: '#64748B',
  },
  labelActive: {
    fontFamily: fonts.semiBold,
    color: '#FFFFFF',
  },
  iconWrap: {
    marginRight: 6,
  },
});

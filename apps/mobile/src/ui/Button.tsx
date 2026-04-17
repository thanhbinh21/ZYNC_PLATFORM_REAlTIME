import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/fonts';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  isLoading = false,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'ghost':
        return styles.ghostContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return styles.outlineText;
      case 'secondary':
        return styles.secondaryText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.container,
        getContainerStyle(),
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#111827' : colors.primary}
        />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  primaryContainer: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: '#9effda',
    shadowColor: colors.glassGlow,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 5,
  },
  secondaryContainer: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  outlineContainer: {
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  text: {
    ...typography.body,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  primaryText: {
    color: '#111827', // dark text on primary
  },
  secondaryText: {
    color: colors.text,
  },
  outlineText: {
    color: '#a8ffe1',
  },
  disabled: {
    opacity: 0.5,
  },
});

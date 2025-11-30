import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

const themeOptions: { label: string; value: ThemeMode; description: string }[] = [
  { label: 'Light', value: 'light', description: 'Always use light theme' },
  { label: 'Dark', value: 'dark', description: 'Always use dark theme' },
  { label: 'System', value: 'system', description: 'Follow system preference' },
];

export const ThemeToggle: React.FC = () => {
  const { theme, themeMode, setThemeMode, systemTheme } = useTheme();

  const getSystemThemeLabel = () => {
    return systemTheme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Theme</Text>
      {themeOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.option,
            {
              backgroundColor: themeMode === option.value ? theme.primary + '20' : 'transparent',
              borderColor: theme.border,
            },
          ]}
          onPress={() => setThemeMode(option.value)}
        >
          <View style={styles.optionContent}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>
              {option.label}
              {option.value === 'system' && ` (${getSystemThemeLabel()})`}
            </Text>
            <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
              {option.description}
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              {
                borderColor: themeMode === option.value ? theme.primary : theme.border,
              },
            ]}
          >
            {themeMode === option.value && (
              <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

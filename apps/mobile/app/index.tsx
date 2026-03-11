import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zync</Text>
      <Text style={styles.subtitle}>Real-time messaging platform</Text>
      <Text style={styles.note}>Phase 2 – Authentication coming soon</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
  },
});

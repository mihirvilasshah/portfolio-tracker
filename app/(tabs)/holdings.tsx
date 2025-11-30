import { View, Text, StyleSheet } from 'react-native';

export default function HoldingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Holdings</Text>
      <Text style={styles.subtitle}>No holdings yet. Connect an account to get started.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});


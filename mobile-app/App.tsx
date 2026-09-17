/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, Text, View } from 'react-native';
import appConfig from './src/generated/appConfig';

function App() {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={appConfig.primaryColor} barStyle="light-content" />
      <View style={[styles.hero, { backgroundColor: appConfig.primaryColor }]}>
        <Text style={styles.productName}>{appConfig.appName}</Text>
        <Text style={styles.title}>App Builder POC</Text>
      </View>
      <View style={styles.content}>
        <Detail label="Tenant" value={appConfig.tenantId} />
        <Detail label="Environment" value={appConfig.environment} />
        <Detail label="Build" value={appConfig.buildId} />
      </View>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  hero: { paddingTop: 72, paddingHorizontal: 24, paddingBottom: 36 },
  productName: { color: '#FFFFFF', fontSize: 30, fontWeight: '700' },
  title: { color: '#FFFFFF', fontSize: 16, marginTop: 8, opacity: 0.9 },
  content: { padding: 24 },
  detail: { borderBottomColor: '#E2E8F0', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16 },
  label: { color: '#64748B', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  value: { color: '#0F172A', fontSize: 17, marginTop: 5 },
});

export default App;

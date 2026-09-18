/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, StyleSheet, Text, View } from 'react-native';
import appConfig from './src/generated/appConfig';

function App() {
  const theme: any = appConfig.theme || {};
  const button: any = appConfig.buttonStyle || {};
  const card: any = appConfig.cardStyle || {};
  const features: any = appConfig.features || {};
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor || '#F8FAFC' }]}>
      <StatusBar backgroundColor={theme.primaryColor || appConfig.primaryColor} barStyle="light-content" />
      {features.showHeader !== false && <View style={[styles.hero, { backgroundColor: appConfig.header?.backgroundColor || theme.primaryColor || appConfig.primaryColor }]}>
        <Text style={styles.productName}>{appConfig.appName}</Text>
        <Text style={styles.title}>App Builder POC</Text>
      </View>}
      <View style={styles.content}>
        {features.showDemoCard !== false && <View style={[styles.demoCard, { backgroundColor: card.backgroundColor || theme.surfaceColor || '#fff', borderColor: card.borderColor || theme.primaryColor || appConfig.primaryColor, borderRadius: card.borderRadius || 16, padding: card.padding || 16 }]}><Text style={{ color: theme.textPrimaryColor }}>Configurable demo card</Text></View>}
        <Detail label="Tenant" value={appConfig.tenantId} />
        <Detail label="Environment" value={appConfig.environment} />
        {features.showBuildInfo !== false && <Detail label="Build" value={appConfig.buildId} />}
        {features.showPrimaryButton !== false && <View style={[styles.cta, { backgroundColor: button.variant === 'outlined' ? 'transparent' : button.backgroundColor || theme.primaryColor, borderColor: button.borderColor || theme.primaryColor, borderWidth: button.borderWidth || 0, borderRadius: button.borderRadius || 12, height: button.height || 52 }]}><Text style={{ color: button.textColor || '#fff' }}>SHOP NOW</Text></View>}
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
  demoCard: { borderWidth: 1, marginBottom: 16 },
  cta: { alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  detail: { borderBottomColor: '#E2E8F0', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16 },
  label: { color: '#64748B', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  value: { color: '#0F172A', fontSize: 17, marginTop: 5 },
});

export default App;

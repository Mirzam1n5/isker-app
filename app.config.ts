import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ISKER',
  slug: 'isker-app',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  splash: { backgroundColor: '#111111' },
  ios: { supportsTablet: true, bundleIdentifier: 'com.isker.app' },
  android: { adaptiveIcon: { backgroundColor: '#111111' }, package: 'com.isker.app' },
  web: { bundler: 'metro' },
  plugins: ['expo-router'],
  scheme: 'isker',
});

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.darkGray },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '500',
            fontSize: 16,
            color: COLORS.white,
          },
          headerTintColor: COLORS.white,
          contentStyle: { backgroundColor: COLORS.black },
        }}
      />
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import type { IoniconName } from './src/components/ProductCard';

import HomeScreen from './src/screens/HomeScreen';
import RoutineScreen from './src/screens/RoutineScreen';
import IngredientsScreen from './src/screens/IngredientsScreen';
import ShelfScreen from './src/screens/ShelfScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ProfileEditScreen from './src/screens/ProfileEditScreen';
import AboutScreen from './src/screens/AboutScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MySubmissionsScreen from './src/screens/MySubmissionsScreen';
import OnboardingWelcome from './src/screens/onboarding/OnboardingWelcome';
import OnboardingSkinType from './src/screens/onboarding/OnboardingSkinType';
import OnboardingConcerns from './src/screens/onboarding/OnboardingConcerns';
import OnboardingPreferences from './src/screens/onboarding/OnboardingPreferences';

import { getProfile } from './src/utils/profileStorage';
import { OnboardingContext } from './src/context/OnboardingContext';
import { AppStackParamList, OnboardingStackParamList } from './src/types/navigation';
import { typography, ThemeProvider, useTheme, ColorTokens } from './src/theme';
import { ToastProvider } from './src/context/ToastContext';

// ── Stack navigators ──────────────────────────────────────────────────────────
const OnboardingStack  = createNativeStackNavigator<OnboardingStackParamList>();
const HomeStack        = createNativeStackNavigator<AppStackParamList>();
const RoutineStack     = createNativeStackNavigator<AppStackParamList>();
const IngredientsStack = createNativeStackNavigator<AppStackParamList>();
const SettingsStack    = createNativeStackNavigator<AppStackParamList>();

function getStackOptions(colors: ColorTokens) {
  return {
    headerStyle: { backgroundColor: colors.paper },
    headerTintColor: colors.sage,
    headerTitleStyle: { color: colors.ink, fontWeight: '700' as const, fontSize: 17 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.paper },
  };
}

function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  return (
    <OnboardingContext.Provider value={onComplete}>
      <OnboardingStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <OnboardingStack.Screen name="Welcome"  component={OnboardingWelcome} />
        <OnboardingStack.Screen name="SkinType" component={OnboardingSkinType} />
        <OnboardingStack.Screen name="Concerns" component={OnboardingConcerns} />
        <OnboardingStack.Screen name="Preferences" component={OnboardingPreferences} />
      </OnboardingStack.Navigator>
    </OnboardingContext.Provider>
  );
}

function HomeNavigator() {
  const { colors } = useTheme();
  return (
    <HomeStack.Navigator screenOptions={getStackOptions(colors)}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </HomeStack.Navigator>
  );
}

function RoutineNavigator() {
  const { colors } = useTheme();
  return (
    <RoutineStack.Navigator screenOptions={getStackOptions(colors)}>
      <RoutineStack.Screen name="Home" component={RoutineScreen} options={{ headerShown: false }} />
      <RoutineStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <RoutineStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
    </RoutineStack.Navigator>
  );
}

function IngredientsNavigator() {
  const { colors } = useTheme();
  return (
    <IngredientsStack.Navigator screenOptions={getStackOptions(colors)}>
      <IngredientsStack.Screen name="Home" component={IngredientsScreen} options={{ headerShown: false }} />
      <IngredientsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </IngredientsStack.Navigator>
  );
}

function SettingsNavigator() {
  const { colors } = useTheme();
  return (
    <SettingsStack.Navigator screenOptions={getStackOptions(colors)}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <SettingsStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <SettingsStack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <SettingsStack.Screen name="MySubmissions" component={MySubmissionsScreen} options={{ title: 'My Submissions' }} />
      <SettingsStack.Screen name="Shelf" component={ShelfScreen} options={{ title: 'My Shelf' }} />
      <SettingsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </SettingsStack.Navigator>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

const TAB_META: Record<string, IoniconName> = {
  Home:        'home',
  Routine:     'clipboard',
  Ingredients: 'flask',
  Settings:    'settings',
};

function MainTabs() {
  const { colors } = useTheme();
  const tabStyles = getTabStyles(colors);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => (
          <View style={{ alignItems: 'center' }}>
            <Ionicons
              name={focused ? TAB_META[route.name] : (`${TAB_META[route.name]}-outline` as IoniconName)}
              size={22}
              color={color}
            />
            {focused && (
              <View style={tabStyles.activeDot} />
            )}
          </View>
        ),
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: tabStyles.tabBar,
        tabBarLabelStyle: tabStyles.tabLabel,
      })}
    >
      <Tab.Screen name="Home"        component={HomeNavigator} />
      <Tab.Screen name="Routine"     component={RoutineNavigator} />
      <Tab.Screen name="Ingredients" component={IngredientsNavigator} options={{ tabBarLabel: 'Products' }} />
      <Tab.Screen name="Settings"    component={SettingsNavigator} />
    </Tab.Navigator>
  );
}

function getTabStyles(colors: ColorTokens) {
  return StyleSheet.create({
    tabBar: {
      backgroundColor: colors.surface, borderTopColor: colors.line,
      borderTopWidth: 1, height: 68, paddingBottom: 10, paddingTop: 6,
    },
    tabLabel: { fontSize: 12, fontWeight: '600' },
    activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.sage, marginTop: 2 },
  });
}

// ── Root app with onboarding gate ─────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

function AppInner() {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    getProfile().then((p) => setIsOnboarded(p.onboarded));
  }, []);

  if (isOnboarded === null) {
    return (
      <View style={[appStyles.splash, { backgroundColor: colors.paper }]}>
        <StatusBar style="dark" />
        <Ionicons name="sparkles" size={44} color={colors.sage} />
        <Text style={[appStyles.splashName, { color: colors.ink }]}>SkinMatch</Text>
      </View>
    );
  }

  return (
    <ToastProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        {isOnboarded ? (
          <MainTabs />
        ) : (
          <OnboardingNavigator onComplete={() => setIsOnboarded(true)} />
        )}
      </NavigationContainer>
    </ToastProvider>
  );
}

const appStyles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  splashName: { ...typography.screenTitle },
});

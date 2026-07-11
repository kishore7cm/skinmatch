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
import { colors, typography } from './src/theme';
import { ToastProvider } from './src/context/ToastContext';

// ── Stack navigators ──────────────────────────────────────────────────────────
const OnboardingStack  = createNativeStackNavigator<OnboardingStackParamList>();
const HomeStack        = createNativeStackNavigator<AppStackParamList>();
const RoutineStack     = createNativeStackNavigator<AppStackParamList>();
const IngredientsStack = createNativeStackNavigator<AppStackParamList>();
const ShelfStack       = createNativeStackNavigator<AppStackParamList>();

const STACK_OPTIONS = {
  headerStyle: { backgroundColor: colors.paper },
  headerTintColor: colors.sage,
  headerTitleStyle: { color: colors.ink, fontWeight: '700' as const, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.paper },
};

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
  return (
    <HomeStack.Navigator screenOptions={STACK_OPTIONS}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <HomeStack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <HomeStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <HomeStack.Screen name="MySubmissions" component={MySubmissionsScreen} options={{ title: 'My Submissions' }} />
    </HomeStack.Navigator>
  );
}

function RoutineNavigator() {
  return (
    <RoutineStack.Navigator screenOptions={STACK_OPTIONS}>
      <RoutineStack.Screen name="Home" component={RoutineScreen} options={{ headerShown: false }} />
      <RoutineStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <RoutineStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <RoutineStack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <RoutineStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <RoutineStack.Screen name="MySubmissions" component={MySubmissionsScreen} options={{ title: 'My Submissions' }} />
    </RoutineStack.Navigator>
  );
}

function IngredientsNavigator() {
  return (
    <IngredientsStack.Navigator screenOptions={STACK_OPTIONS}>
      <IngredientsStack.Screen name="Home" component={IngredientsScreen} options={{ headerShown: false }} />
      <IngredientsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <IngredientsStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <IngredientsStack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <IngredientsStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <IngredientsStack.Screen name="MySubmissions" component={MySubmissionsScreen} options={{ title: 'My Submissions' }} />
    </IngredientsStack.Navigator>
  );
}

function ShelfNavigator() {
  return (
    <ShelfStack.Navigator screenOptions={STACK_OPTIONS}>
      <ShelfStack.Screen name="Home" component={ShelfScreen} options={{ headerShown: false }} />
      <ShelfStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ShelfStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <ShelfStack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <ShelfStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <ShelfStack.Screen name="MySubmissions" component={MySubmissionsScreen} options={{ title: 'My Submissions' }} />
    </ShelfStack.Navigator>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

const TAB_META: Record<string, IoniconName> = {
  Home:        'home',
  Routine:     'clipboard',
  Ingredients: 'flask',
  'My Shelf':  'bookmark',
};

function MainTabs() {
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
      <Tab.Screen name="My Shelf"    component={ShelfNavigator} />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface, borderTopColor: colors.line,
    borderTopWidth: 1, height: 68, paddingBottom: 10, paddingTop: 6,
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.sage, marginTop: 2 },
});

// ── Root app with onboarding gate ─────────────────────────────────────────────
export default function App() {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    getProfile().then((p) => setIsOnboarded(p.onboarded));
  }, []);

  if (isOnboarded === null) {
    return (
      <View style={appStyles.splash}>
        <StatusBar style="dark" />
        <Ionicons name="sparkles" size={44} color={colors.sage} />
        <Text style={appStyles.splashName}>SkinMatch</Text>
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
    flex: 1, backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  splashName: { ...typography.screenTitle, color: colors.ink },
});

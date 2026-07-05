import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import RoutineScreen from './src/screens/RoutineScreen';
import IngredientsScreen from './src/screens/IngredientsScreen';
import DupesScreen from './src/screens/DupesScreen';
import ShelfScreen from './src/screens/ShelfScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ProfileEditScreen from './src/screens/ProfileEditScreen';
import OnboardingWelcome from './src/screens/onboarding/OnboardingWelcome';
import OnboardingSkinType from './src/screens/onboarding/OnboardingSkinType';
import OnboardingConcerns from './src/screens/onboarding/OnboardingConcerns';

import { getProfile } from './src/utils/profileStorage';
import { OnboardingContext } from './src/context/OnboardingContext';
import { AppStackParamList, OnboardingStackParamList } from './src/types/navigation';

// ── Stack navigators ──────────────────────────────────────────────────────────
const OnboardingStack  = createNativeStackNavigator<OnboardingStackParamList>();
const RoutineStack     = createNativeStackNavigator<AppStackParamList>();
const IngredientsStack = createNativeStackNavigator<AppStackParamList>();
const DupesStack       = createNativeStackNavigator<AppStackParamList>();
const ShelfStack       = createNativeStackNavigator<AppStackParamList>();

const STACK_OPTIONS = {
  headerStyle: { backgroundColor: '#FAFAF8' },
  headerTintColor: '#C8A2C8',
  headerTitleStyle: { color: '#1A1A2E', fontWeight: '700' as const, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: '#FAFAF8' },
};

function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  return (
    <OnboardingContext.Provider value={onComplete}>
      <OnboardingStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <OnboardingStack.Screen name="Welcome"  component={OnboardingWelcome} />
        <OnboardingStack.Screen name="SkinType" component={OnboardingSkinType} />
        <OnboardingStack.Screen name="Concerns" component={OnboardingConcerns} />
      </OnboardingStack.Navigator>
    </OnboardingContext.Provider>
  );
}

function RoutineNavigator() {
  return (
    <RoutineStack.Navigator screenOptions={STACK_OPTIONS}>
      <RoutineStack.Screen name="Home" component={RoutineScreen} options={{ headerShown: false }} />
      <RoutineStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <RoutineStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
    </RoutineStack.Navigator>
  );
}

function IngredientsNavigator() {
  return (
    <IngredientsStack.Navigator screenOptions={STACK_OPTIONS}>
      <IngredientsStack.Screen name="Home" component={IngredientsScreen} options={{ headerShown: false }} />
      <IngredientsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <IngredientsStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
    </IngredientsStack.Navigator>
  );
}

function DupesNavigator() {
  return (
    <DupesStack.Navigator screenOptions={STACK_OPTIONS}>
      <DupesStack.Screen name="Home" component={DupesScreen} options={{ headerShown: false }} />
      <DupesStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <DupesStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
    </DupesStack.Navigator>
  );
}

function ShelfNavigator() {
  return (
    <ShelfStack.Navigator screenOptions={STACK_OPTIONS}>
      <ShelfStack.Screen name="Home" component={ShelfScreen} options={{ headerShown: false }} />
      <ShelfStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ShelfStack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
    </ShelfStack.Navigator>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

const TAB_META: Record<string, string> = {
  Routine:     '📋',
  Ingredients: '🧪',
  Dupes:       '🔄',
  'My Shelf':  '🔖',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 21 }}>{TAB_META[route.name]}</Text>
            {focused && (
              <View style={tabStyles.activeDot} />
            )}
          </View>
        ),
        tabBarActiveTintColor: '#C8A2C8',
        tabBarInactiveTintColor: '#BBB',
        tabBarStyle: tabStyles.tabBar,
        tabBarLabelStyle: tabStyles.tabLabel,
      })}
    >
      <Tab.Screen name="Routine"     component={RoutineNavigator} />
      <Tab.Screen name="Ingredients" component={IngredientsNavigator} />
      <Tab.Screen name="Dupes"       component={DupesNavigator} />
      <Tab.Screen name="My Shelf"    component={ShelfNavigator} />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFF', borderTopColor: '#F0F0F0',
    borderTopWidth: 1, height: 64, paddingBottom: 10, paddingTop: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C8A2C8', marginTop: 2 },
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
        <Text style={appStyles.splashEmoji}>✨</Text>
        <Text style={appStyles.splashName}>SkinMatch</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        {isOnboarded ? (
          <MainTabs />
        ) : (
          <OnboardingNavigator onComplete={() => setIsOnboarded(true)} />
        )}
      </NavigationContainer>
    </>
  );
}

const appStyles = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#FAFAF8',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  splashEmoji: { fontSize: 56 },
  splashName: { fontSize: 28, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
});

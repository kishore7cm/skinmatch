import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type OnboardingStackParamList = {
  Welcome: undefined;
  SkinType: undefined;
  Concerns: undefined;
  Preferences: undefined;
};

export type AppStackParamList = {
  Home: { productId?: string } | undefined;
  ProductDetail: { productId: string };
  ProfileEdit: undefined;
  About: undefined;
  Settings: undefined;
  MySubmissions: undefined;
  Shelf: undefined;
};

export type ProductDetailScreenProps = NativeStackScreenProps<AppStackParamList, 'ProductDetail'>;
export type ProfileEditScreenProps   = NativeStackScreenProps<AppStackParamList, 'ProfileEdit'>;
export type SettingsScreenProps      = NativeStackScreenProps<AppStackParamList, 'Settings'>;

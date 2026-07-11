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
};

export type ProductDetailScreenProps = NativeStackScreenProps<AppStackParamList, 'ProductDetail'>;
export type ProfileEditScreenProps   = NativeStackScreenProps<AppStackParamList, 'ProfileEdit'>;

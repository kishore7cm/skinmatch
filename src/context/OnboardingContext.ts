import { createContext, useContext } from 'react';

export const OnboardingContext = createContext<() => void>(() => {});
export const useOnboardingComplete = () => useContext(OnboardingContext);

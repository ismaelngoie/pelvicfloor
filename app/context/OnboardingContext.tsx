"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

type UserData = {
  name: string;
  age: number;
  weight: number;
  height: number;
  goal: string;
};

type OnboardingContextType = {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  updateFields: (fields: Partial<UserData>) => void;
  step: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
};

const defaultData: UserData = {
  name: "",
  age: 30,
  weight: 140,
  height: 65,
  goal: "Build Core Strength",
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [userData, setUserData] = useState<UserData>(defaultData);
  const [step, setStep] = useState(1);

  const updateFields = (fields: Partial<UserData>) => {
    setUserData(prev => ({ ...prev, ...fields }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <OnboardingContext.Provider value={{ userData, setUserData, updateFields, step, setStep, nextStep, prevStep }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error("useOnboarding must be used within an OnboardingProvider");
  return context;
};

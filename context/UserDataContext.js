"use client";
import React, { createContext, useContext, useState } from 'react';

const UserDataContext = createContext();

export const UserDataProvider = ({ children }) => {
  const [userDetails, setUserDetails] = useState({
    name: '',
    age: 0,
    weight: 0,
    height: 0,
    selectedTarget: null, // This is your 'selectedTargets'
    healthConditions: [],
    activityLevel: null,
  });

  const saveUserData = (key, value) => {
    setUserDetails(prev => ({ ...prev, [key]: value }));
    // In a real app, you might sync to local storage here
  };

  return (
    <UserDataContext.Provider value={{ userDetails, saveUserData }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => useContext(UserDataContext);

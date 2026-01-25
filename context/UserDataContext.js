"use client";
import React, { createContext, useContext, useState } from 'react';

const UserDataContext = createContext();

export const UserDataProvider = ({ children }) => {
  // This mirrors your Swift UserDataManager
  const [userDetails, setUserDetails] = useState({
    name: '',
    age: 0,
    weight: 0,
    height: 0,
    selectedTarget: null, // The goal they select
    healthConditions: [],
    activityLevel: null,
  });

  const saveUserData = (key, value) => {
    setUserDetails(prev => ({ ...prev, [key]: value }));
    console.log(`Saved ${key}:`, value); // For debugging
  };

  return (
    <UserDataContext.Provider value={{ userDetails, saveUserData }}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => useContext(UserDataContext);

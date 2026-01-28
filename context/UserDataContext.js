"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const UserDataContext = createContext();

export function UserDataProvider({ children }) {
  // 1. LAZY INITIALIZATION (The Fix)
  // Instead of starting with default values, we check localStorage immediately.
  const [userDetails, setUserDetails] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pelvic_user_data');
        if (saved) {
          return JSON.parse(saved); // Found data! Use it.
        }
      } catch (e) {
        console.error("Error parsing saved data:", e);
      }
    }
    
    // Default state if nothing is saved
    return {
      name: "",
      joinDate: new Date().toISOString(),
      isPremium: false,
      streak: 0,
      lastWorkoutDate: null,
      selectedTarget: null, // e.g. { title: "Stop Leaks" }
      completedWorkouts: []
    };
  });

  // 2. AUTO-SAVE
  // Every time 'userDetails' changes, save it to storage automatically.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pelvic_user_data', JSON.stringify(userDetails));
    }
  }, [userDetails]);

  // 3. Helper to update specific fields
  const saveUserData = (key, value) => {
    setUserDetails((prev) => {
      // If saving an object (like selectedTarget), merge it carefully
      // If saving a primitive (like string/boolean), just overwrite
      return {
        ...prev,
        [key]: value
      };
    });
  };

  // 4. Helper to reset data (for testing or logout)
  const clearUserData = () => {
    const defaults = {
      name: "",
      joinDate: new Date().toISOString(),
      isPremium: false,
      streak: 0,
      lastWorkoutDate: null,
      selectedTarget: null,
      completedWorkouts: []
    };
    setUserDetails(defaults);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pelvic_user_data');
    }
  };

  return (
    <UserDataContext.Provider value={{ userDetails, saveUserData, clearUserData }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  return useContext(UserDataContext);
}

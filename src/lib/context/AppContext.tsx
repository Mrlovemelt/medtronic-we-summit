"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the structure for category colors
export interface CategoryColors {
  [category: string]: {
    [answer: string]: string;
  };
}

// Define the global visualization settings
export interface VisualizationSettings {
  // Color settings
  categoryColors: CategoryColors;
  
  // Theme settings
  isDarkMode: boolean;
  
  // Data settings
  useTestData: boolean;
  
  // Animation settings
  autoPlaySpeed: number; // milliseconds between transitions
  isAutoPlayEnabled: boolean;
}

// Default settings
const defaultSettings: VisualizationSettings = {
  categoryColors: {
    years_at_medtronic: {
      '0-5': '#FF6B6B',
      '6-10': '#4ECDC4',
      '11-15': '#45B7D1',
      '16-20': '#96CEB4',
      '20+': '#FFEAA7'
    },
    peak_performance: {
      'Early Morning': '#FF6B6B',
      'Mid Morning': '#4ECDC4',
      'Afternoon': '#45B7D1',
      'Evening': '#96CEB4',
      'Late Night': '#FFEAA7'
    },
    learning_style: {
      'Visual': '#FF6B6B',
      'Auditory': '#4ECDC4',
      'Kinesthetic': '#45B7D1',
      'Reading/Writing': '#96CEB4'
    },
    motivation: {
      'Achievement': '#FF6B6B',
      'Recognition': '#4ECDC4',
      'Growth': '#45B7D1',
      'Purpose': '#96CEB4',
      'Balance': '#FFEAA7'
    },
    shaped_by: {
      'Mentor': '#FF6B6B',
      'Experience': '#4ECDC4',
      'Education': '#45B7D1',
      'Challenge': '#96CEB4',
      'Opportunity': '#FFEAA7'
    }
  },
  isDarkMode: false,
  useTestData: true,
  autoPlaySpeed: 5000, // 5 seconds
  isAutoPlayEnabled: true
};

// Context interface
interface AppContextType {
  settings: VisualizationSettings;
  updateCategoryColor: (category: string, answer: string, color: string) => void;
  toggleDarkMode: () => void;
  toggleTestData: () => void;
  updateAutoPlaySpeed: (speed: number) => void;
  toggleAutoPlay: () => void;
  resetToDefaults: () => void;
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<VisualizationSettings>(defaultSettings);

  const updateCategoryColor = (category: string, answer: string, color: string) => {
    setSettings(prev => ({
      ...prev,
      categoryColors: {
        ...prev.categoryColors,
        [category]: {
          ...prev.categoryColors[category],
          [answer]: color
        }
      }
    }));
  };

  const toggleDarkMode = () => {
    setSettings(prev => ({
      ...prev,
      isDarkMode: !prev.isDarkMode
    }));
  };

  const toggleTestData = () => {
    setSettings(prev => ({
      ...prev,
      useTestData: !prev.useTestData
    }));
  };

  const updateAutoPlaySpeed = (speed: number) => {
    setSettings(prev => ({
      ...prev,
      autoPlaySpeed: speed
    }));
  };

  const toggleAutoPlay = () => {
    setSettings(prev => ({
      ...prev,
      isAutoPlayEnabled: !prev.isAutoPlayEnabled
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const value: AppContextType = {
    settings,
    updateCategoryColor,
    toggleDarkMode,
    toggleTestData,
    updateAutoPlaySpeed,
    toggleAutoPlay,
    resetToDefaults
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 
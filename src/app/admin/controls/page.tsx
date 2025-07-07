'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/lib/context/AppContext';

// Color picker component
const ColorPicker: React.FC<{
  color: string;
  onChange: (color: string) => void;
  label: string;
}> = ({ color, onChange, label }) => {
  const [hexValue, setHexValue] = useState(color);
  
  const handleColorChange = (newColor: string) => {
    onChange(newColor);
    setHexValue(newColor);
  };
  
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexValue(value);
    
    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value);
    }
  };
  
  const handleHexBlur = () => {
    // Reset to current color if invalid
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
      setHexValue(color);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded border-2 border-gray-300 overflow-hidden">
        <input
          type="color"
          value={color}
          onChange={(e) => handleColorChange(e.target.value)}
          className="w-full h-full cursor-pointer"
          title={label}
        />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <input
          type="text"
          value={hexValue}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          placeholder="#000000"
          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-20"
          maxLength={7}
        />
      </div>
    </div>
  );
};

// Toggle switch component
const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}> = ({ enabled, onChange, label, description }) => (
  <div className="flex items-center justify-between">
    <div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      )}
    </div>
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// Slider component
const Slider: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  unit?: string;
}> = ({ value, onChange, min, max, step, label, unit }) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
    />
  </div>
);

export default function GlobalControlsPage() {
  const { settings, updateCategoryColor, toggleDarkMode, toggleTestData, updateAutoPlaySpeed, toggleAutoPlay, resetToDefaults } = useAppContext();

  // Category labels for display
  const categoryLabels: { [key: string]: string } = {
    years_at_medtronic: 'Years at Medtronic',
    peak_performance: 'Peak Performance',
    learning_style: 'Learning Style',
    motivation: 'Motivation',
    shaped_by: 'Shaped By'
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <img
                src="/branding/art-logo-all/art-logo-k/art-logo-en-rgb-k.svg"
                alt="Medtronic"
                className="h-8 w-auto"
              />
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  WE Summit
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Global Visualization Controls
                </p>
              </div>
            </div>
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Global Settings */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Global Settings
              </h2>
              
              <div className="space-y-6">
                {/* Dark Mode Toggle */}
                <ToggleSwitch
                  enabled={settings.isDarkMode}
                  onChange={toggleDarkMode}
                  label="Dark Mode"
                  description="Switch between light and dark themes for all visualizations"
                />

                {/* Test Data Toggle */}
                <ToggleSwitch
                  enabled={settings.useTestData}
                  onChange={toggleTestData}
                  label="Use Test Data"
                  description="Toggle between test data and live data sources"
                />

                {/* Auto Play Toggle */}
                <ToggleSwitch
                  enabled={settings.isAutoPlayEnabled}
                  onChange={toggleAutoPlay}
                  label="Auto Play Animations"
                  description="Enable automatic transitions between visualization states"
                />

                {/* Animation Speed */}
                <Slider
                  value={settings.autoPlaySpeed}
                  onChange={updateAutoPlaySpeed}
                  min={1000}
                  max={10000}
                  step={500}
                  label="Animation Speed"
                  unit="ms"
                />
              </div>
            </div>
          </div>

          {/* Color Configuration */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Color Configuration
              </h2>
              
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {Object.entries(settings.categoryColors).map(([category, answers]) => (
                  <div key={category} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                    <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                      {categoryLabels[category] || category.replace(/_/g, ' ')}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(answers).map(([answer, color]) => (
                        <ColorPicker
                          key={answer}
                          color={color}
                          onChange={(newColor) => updateCategoryColor(category, answer, newColor)}
                          label={answer}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Settings Preview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {settings.isDarkMode ? 'Dark' : 'Light'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Source</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {settings.useTestData ? 'Test Data' : 'Live Data'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Play</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {settings.isAutoPlayEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Speed</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {settings.autoPlaySpeed}ms
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
} 
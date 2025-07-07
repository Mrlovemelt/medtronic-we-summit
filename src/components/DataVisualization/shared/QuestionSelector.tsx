import React from 'react';

interface FieldOption {
  value: string;
  label: string;
}

interface QuestionSelectorProps {
  availableFields: FieldOption[];
  currentSource: string;
  currentTarget: string;
  onChange: (source: string, target: string) => void;
}

const selectStyle = {
  minWidth: 320,
  fontSize: '1.5rem',
  lineHeight: 1.1,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  background: 'none',
  color: '#170F5F',
  border: 0,
  borderBottom: '4px solid #170F5F',
  fontWeight: 700,
  paddingRight: 48,
  paddingLeft: 0,
  paddingTop: 8,
  paddingBottom: 8,
  outline: 'none',
  transition: 'border-color 0.2s',
} as React.CSSProperties;

export function QuestionSelector({
  availableFields,
  currentSource,
  currentTarget,
  onChange,
}: QuestionSelectorProps) {
  return (
    <div 
      className="w-full flex flex-row justify-between items-end gap-8" 
      style={{ 
        maxWidth: '1600px', 
        margin: '0 auto', 
        padding: '0 48px',
        position: 'relative',
        zIndex: 1000, // Ensure dropdowns are above visualization
        marginBottom: '32px' // Add explicit bottom margin
      }}
    >
      {/* Source Dropdown */}
      <div className="flex-1 flex flex-col items-start" style={{ marginLeft: 48 }}>
        <label className="w-full">
          <div className="relative w-fit">
            <select
              style={selectStyle}
              className="custom-select"
              value={currentSource}
              onChange={e => onChange(e.target.value, currentTarget)}
            >
              {availableFields.map(field => (
                <option key={field.value} value={field.value} disabled={field.value === currentTarget}>
                  {field.label}
                </option>
              ))}
            </select>
            {/* Custom Chevron Icon */}
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 10l5 5 5-5" stroke="#170F5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        </label>
      </div>
      {/* Target Dropdown */}
      <div className="flex-1 flex flex-col items-end" style={{ marginRight: 48 }}>
        <label className="w-full flex justify-end">
          <div className="relative w-fit">
            <select
              style={selectStyle}
              className="custom-select"
              value={currentTarget}
              onChange={e => onChange(currentSource, e.target.value)}
            >
              {availableFields.map(field => (
                <option key={field.value} value={field.value} disabled={field.value === currentSource}>
                  {field.label}
                </option>
              ))}
            </select>
            {/* Custom Chevron Icon */}
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 10l5 5 5-5" stroke="#170F5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        </label>
      </div>
      <style>{`
        .custom-select::-ms-expand { display: none; }
        .custom-select::-webkit-appearance { appearance: none; }
        .custom-select:focus { border-bottom-color: #1010EB; }
      `}</style>
    </div>
  );
} 
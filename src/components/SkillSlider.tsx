import React from 'react';

interface SkillSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color?: string;
}

export const SkillSlider: React.FC<SkillSliderProps> = ({ label, value, onChange, color = '#FF6B35' }) => {
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <label className="text-xs font-medium">{label}</label>
        <span 
          className="text-xs font-bold"
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="99"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
};

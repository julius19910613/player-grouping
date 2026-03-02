import React from 'react';

interface SkillSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color?: string;
}

export const SkillSlider: React.FC<SkillSliderProps> = ({ label, value, onChange, color = '#FF6B35' }) => {
  return (
    <div className="skill-slider" style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <label style={{ fontSize: '12px', fontWeight: 500 }}>{label}</label>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color }}>{value}</span>
      </div>
      <input
        type="range"
        min="1"
        max="99"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{
          width: '100%',
          accentColor: color
        }}
      />
    </div>
  );
};

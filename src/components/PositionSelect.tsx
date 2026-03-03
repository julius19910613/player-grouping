import React from 'react';
import { BasketballPosition, POSITION_DETAILS } from '../types/basketball';

interface PositionSelectProps {
  value: BasketballPosition;
  onChange: (position: BasketballPosition) => void;
}

export const PositionSelect: React.FC<PositionSelectProps> = ({ value, onChange }) => {
  return (
    <div className="position-select">
      <label htmlFor="position">位置:</label>
      <select
        id="position"
        value={value}
        onChange={(e) => onChange(e.target.value as BasketballPosition)}
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          fontSize: '14px'
        }}
      >
        {(Object.keys(POSITION_DETAILS) as BasketballPosition[]).map((position) => {
          const details = POSITION_DETAILS[position];
          return (
            <option key={position} value={position}>
              {details.icon} {details.name} ({details.englishName})
            </option>
          );
        })}
      </select>
    </div>
  );
};

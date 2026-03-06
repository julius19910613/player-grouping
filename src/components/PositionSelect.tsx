import React from 'react';
import { BasketballPosition, POSITION_DETAILS } from '../types/basketball';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface PositionSelectProps {
  value: BasketballPosition;
  onChange: (position: BasketballPosition) => void;
}

export const PositionSelect: React.FC<PositionSelectProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label>位置</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as BasketballPosition)}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择位置" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(POSITION_DETAILS) as BasketballPosition[]).map((position) => {
            const details = POSITION_DETAILS[position];
            return (
              <SelectItem key={position} value={position}>
                {details.icon} {details.name} ({details.englishName})
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

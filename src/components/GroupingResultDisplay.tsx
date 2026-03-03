import React from 'react';
import type { BasketballTeam } from '../utils/basketballGroupingAlgorithm';
import { PlayerCard } from './PlayerCard';
import type { BasketballPosition, BasketballSkills } from '../types/basketball';

// 通用球员类型
interface PlayerBase {
  id: string;
  name: string;
  position: BasketballPosition;
  skills: BasketballSkills;
}

interface GroupingResultDisplayProps {
  teams: BasketballTeam[];
  onEditPlayer?: (player: PlayerBase) => void;
  onDeletePlayer?: (id: string) => void;
}

export const GroupingResultDisplay: React.FC<GroupingResultDisplayProps> = ({
  teams,
  onEditPlayer,
  onDeletePlayer,
}) => {
  if (teams.length === 0) {
    return (
      <div style={{
        padding: 'var(--spacing-xl)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
      }}>
        <p>暂无分组结果</p>
        <p style={{ fontSize: 'var(--font-size-sm)' }}>请先添加球员并进行分组</p>
      </div>
    );
  }

  return (
    <div className="grouping-result-display" style={{
      display: 'grid',
      gap: 'var(--spacing-lg)',
    }}>
      {teams.map((team, index) => (
        <div 
          key={team.id}
          className="team-section"
          style={{
            backgroundColor: 'var(--color-background)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
          }}
        >
          {/* 团队头部 */}
          <div style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            backgroundColor: `var(--color-${['pg', 'sg', 'sf', 'pf', 'c'][index % 5]})`,
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                {team.name}
              </h3>
              <span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>
                {team.players.length} 名球员
              </span>
            </div>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>
                {team.totalSkill}
              </span>
            </div>
          </div>

          {/* 球员列表 */}
          <div style={{
            padding: 'var(--spacing-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--spacing-md)',
          }}>
            {team.players.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                onEdit={onEditPlayer}
                onDelete={onDeletePlayer}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

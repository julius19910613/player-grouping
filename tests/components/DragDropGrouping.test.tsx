import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DragDropGrouping } from '../../src/components/DragDropGrouping';
import type { Team, Player } from '../../src/types';
import { BasketballPosition } from '../../src/types';

// 创建测试用的球员数据
function createMockPlayer(id: string, name: string, overall: number): Player {
  return {
    id,
    name,
    position: BasketballPosition.PG,
    skills: {
      scoring: overall,
      rebound: overall,
      assist: overall,
      defense: overall,
      overall
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// 创建测试用的队伍数据
function createMockTeams(): Team[] {
  return [
    {
      id: 'team-1',
      name: 'Team 1',
      players: [createMockPlayer('p1', 'Player 1', 80), createMockPlayer('p2', 'Player 2', 75)],
      totalSkill: 155
    },
    {
      id: 'team-2',
      name: 'Team 2',
      players: [createMockPlayer('p3', 'Player 3', 70), createMockPlayer('p4', 'Player 4', 85)],
      totalSkill: 155
    }
  ];
}

describe('DragDropGrouping', () => {
  const mockTeams = createMockTeams();
  const mockOnPlayerMove = vi.fn();
  const mockOnUndo = vi.fn();

  beforeEach(() => {
    mockOnPlayerMove.mockClear();
    mockOnUndo.mockClear();
  });

  it('应该渲染所有队伍', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();
  });

  it('应该显示每个队伍的球员', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
    expect(screen.getByText('Player 3')).toBeInTheDocument();
    expect(screen.getByText('Player 4')).toBeInTheDocument();
  });

  it('应该显示平衡度', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText(/平衡度: 95.0%/)).toBeInTheDocument();
  });

  it('应该显示每个队伍的总战力', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    // 两个队伍都是 155 战力
    const badges = screen.getAllByText(/战力: 155/);
    expect(badges).toHaveLength(2);
  });

  it('拖拽应该触发 onPlayerMove', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    // 找到 Player 1 的可拖拽元素
    const player1Element = screen.getByText('Player 1').closest('[draggable="true"]');
    expect(player1Element).not.toBeNull();

    // 找到 Team 2 的卡片
    const team2Card = screen.getByText('Team 2').closest('.grid > div');
    expect(team2Card).not.toBeNull();

    // 模拟拖拽事件
    fireEvent.dragStart(player1Element!);
    fireEvent.dragOver(team2Card!, { dataTransfer: { dropEffect: 'move' } });
    fireEvent.drop(team2Card!);

    expect(mockOnPlayerMove).toHaveBeenCalledWith('p1', 'team-2');
  });

  it('撤销按钮应该触发 onUndo', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove}
        onUndo={mockOnUndo}
        canUndo={true}
      />
    );

    const undoButton = screen.getByText('撤销');
    fireEvent.click(undoButton);

    expect(mockOnUndo).toHaveBeenCalledTimes(1);
  });

  it('撤销按钮在 canUndo 为 false 时应该禁用', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove}
        onUndo={mockOnUndo}
        canUndo={false}
      />
    );

    const undoButton = screen.getByText('撤销');
    expect(undoButton).toBeDisabled();
  });

  it('没有 onUndo 时不应该显示撤销按钮', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.queryByText('撤销')).not.toBeInTheDocument();
  });

  it('应该显示球员的详细信息', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText(/PG · 总评 80/)).toBeInTheDocument();
    expect(screen.getByText(/PG · 总评 75/)).toBeInTheDocument();
  });

  it('空队伍应该显示提示', () => {
    const emptyTeam: Team = {
      id: 'team-empty',
      name: 'Empty Team',
      players: [],
      totalSkill: 0
    };

    render(
      <DragDropGrouping 
        teams={[emptyTeam]} 
        balance={100} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText('拖拽球员到此处')).toBeInTheDocument();
  });

  it('拖拽时应该显示提示信息', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    const player1Element = screen.getByText('Player 1').closest('[draggable="true"]');
    fireEvent.dragStart(player1Element!);

    expect(screen.getByText(/正在拖拽: Player 1/)).toBeInTheDocument();
  });

  it('高平衡度应该显示绿色', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    const balanceBadge = screen.getByText(/平衡度: 95.0%/);
    // Badge 应该有 default variant（绿色在默认主题中）
    expect(balanceBadge).toBeInTheDocument();
  });

  it('中平衡度应该显示黄色', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={75} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText(/平衡度: 75.0%/)).toBeInTheDocument();
  });

  it('低平衡度应该显示红色', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={50} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText(/平衡度: 50.0%/)).toBeInTheDocument();
  });

  it('应用自定义 className', () => {
    const { container } = render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('不应该移动球员到同一个队伍', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    // 找到 Player 1 的可拖拽元素（在 Team 1）
    const player1Element = screen.getByText('Player 1').closest('[draggable="true"]');
    
    // 找到 Team 1 的卡片（Player 1 已经在 Team 1）
    const team1Card = screen.getByText('Team 1').closest('.grid > div');
    
    // 尝试拖拽到同一个队伍
    fireEvent.dragStart(player1Element!);
    fireEvent.dragOver(team1Card!, { dataTransfer: { dropEffect: 'move' } });
    fireEvent.drop(team1Card!);

    // 不应该触发 onPlayerMove
    expect(mockOnPlayerMove).not.toHaveBeenCalled();
  });

  it('应该显示平衡度说明', () => {
    render(
      <DragDropGrouping 
        teams={mockTeams} 
        balance={95} 
        onPlayerMove={mockOnPlayerMove} 
      />
    );

    expect(screen.getByText(/平衡度基于各队伍总战力差异计算/)).toBeInTheDocument();
  });
});

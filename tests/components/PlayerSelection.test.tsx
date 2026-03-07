import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerSelection } from '../../src/components/PlayerSelection';
import type { Player } from '../../src/types';
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

describe('PlayerSelection', () => {
  const mockPlayers: Player[] = [
    createMockPlayer('p1', 'Player 1', 80),
    createMockPlayer('p2', 'Player 2', 75),
    createMockPlayer('p3', 'Player 3', 85),
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('应该渲染所有球员', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
    expect(screen.getByText('Player 3')).toBeInTheDocument();
  });

  it('点击 Checkbox 应该触发 onSelect', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    const checkbox = screen.getByLabelText(/player 1/i);
    fireEvent.click(checkbox);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(['p1']);
  });

  it('全选按钮应该选中所有球员', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    const selectAllButton = screen.getByText('全选');
    fireEvent.click(selectAllButton);

    expect(mockOnSelect).toHaveBeenCalledWith(['p1', 'p2', 'p3']);
  });

  it('取消全选应该清空选择', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={['p1', 'p2', 'p3']} 
        onSelect={mockOnSelect} 
      />
    );

    const deselectAllButton = screen.getByText('取消全选');
    fireEvent.click(deselectAllButton);

    expect(mockOnSelect).toHaveBeenCalledWith([]);
  });

  it('应该显示已选数量', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={['p1', 'p2']} 
        onSelect={mockOnSelect} 
      />
    );

    expect(screen.getByText(/已选 2 \/ 3 人/)).toBeInTheDocument();
  });

  it('应该支持搜索过滤', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索球员...');
    fireEvent.change(searchInput, { target: { value: 'Player 1' } });

    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.queryByText('Player 2')).not.toBeInTheDocument();
    expect(screen.queryByText('Player 3')).not.toBeInTheDocument();
  });

  it('应该支持 maxSelect 限制', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={['p1', 'p2']} 
        onSelect={mockOnSelect}
        maxSelect={2}
      />
    );

    // 第三个球员的 checkbox 应该被禁用
    const player3Checkbox = screen.getByLabelText(/player 3/i);
    expect(player3Checkbox).toBeDisabled();
  });

  it('maxSelect 限制下不应该允许选择更多', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={['p1', 'p2']} 
        onSelect={mockOnSelect}
        maxSelect={2}
      />
    );

    // 尝试点击第三个
    const player3Checkbox = screen.getByLabelText(/player 3/i);
    fireEvent.click(player3Checkbox);

    // 不应该触发 onSelect（因为被禁用）
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('应该显示最大选择数提示', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={['p1', 'p2']} 
        onSelect={mockOnSelect}
        maxSelect={2}
      />
    );

    expect(screen.getByText(/已达到最大选择数量/)).toBeInTheDocument();
    expect(screen.getByText(/最多 2 人/)).toBeInTheDocument();
  });

  it('搜索无结果时应该显示提示', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    const searchInput = screen.getByPlaceholderText('搜索球员...');
    fireEvent.change(searchInput, { target: { value: '不存在' } });

    expect(screen.getByText('没有找到匹配的球员')).toBeInTheDocument();
  });

  it('应该显示球员总评分', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    expect(screen.getByText(/总评: 80/)).toBeInTheDocument();
    expect(screen.getByText(/总评: 75/)).toBeInTheDocument();
    expect(screen.getByText(/总评: 85/)).toBeInTheDocument();
  });

  it('应该显示球员位置', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    // 所有球员都是 PG
    const positions = screen.getAllByText(/位置: PG/);
    expect(positions).toHaveLength(3);
  });

  it('选中状态应该有视觉区分', () => {
    const { container } = render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={['p1']} 
        onSelect={mockOnSelect} 
      />
    );

    const checkbox = screen.getByLabelText(/player 1/i);
    expect(checkbox).toBeChecked();
  });

  it('应该支持选择当前搜索结果', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect} 
      />
    );

    // 搜索 Player 1
    const searchInput = screen.getByPlaceholderText('搜索球员...');
    fireEvent.change(searchInput, { target: { value: 'Player 1' } });

    // 点击选择当前搜索结果
    const selectFilteredButton = screen.getByText('选择当前搜索结果');
    fireEvent.click(selectFilteredButton);

    expect(mockOnSelect).toHaveBeenCalledWith(['p1']);
  });

  it('应用自定义 className', () => {
    const { container } = render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={[]} 
        onSelect={mockOnSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('应该正确处理已选中的球员点击（取消选择）', () => {
    render(
      <PlayerSelection 
        players={mockPlayers} 
        selectedIds={['p1', 'p2']} 
        onSelect={mockOnSelect} 
      />
    );

    const player1Checkbox = screen.getByLabelText(/player 1/i);
    fireEvent.click(player1Checkbox);

    expect(mockOnSelect).toHaveBeenCalledWith(['p2']);
  });
});

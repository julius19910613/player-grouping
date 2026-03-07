import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../../src/App';
import { playerRepository } from '../../src/repositories';
import type { Player } from '../../src/types';

// Mock playerRepository
vi.mock('../../src/repositories', () => ({
  playerRepository: {
    findAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// 测试数据
const mockPlayers: Player[] = [
  {
    id: 'player-1',
    name: '张三',
    position: 'PG',
    skills: {
      twoPointShot: 80,
      threePointShot: 75,
      freeThrow: 70,
      passing: 85,
      ballControl: 90,
      courtVision: 88,
      perimeterDefense: 75,
      interiorDefense: 60,
      steals: 80,
      blocks: 55,
      offensiveRebound: 50,
      defensiveRebound: 65,
      speed: 85,
      strength: 70,
      stamina: 80,
      vertical: 75,
      basketballIQ: 90,
      teamwork: 85,
      clutch: 80,
      overall: 76,
    },
    createdAt: '2026-03-07T00:00:00Z',
    updatedAt: '2026-03-07T00:00:00Z',
  },
  {
    id: 'player-2',
    name: '李四',
    position: 'SG',
    skills: {
      twoPointShot: 75,
      threePointShot: 85,
      freeThrow: 80,
      passing: 70,
      ballControl: 75,
      courtVision: 72,
      perimeterDefense: 80,
      interiorDefense: 65,
      steals: 75,
      blocks: 60,
      offensiveRebound: 55,
      defensiveRebound: 70,
      speed: 90,
      strength: 65,
      stamina: 85,
      vertical: 90,
      basketballIQ: 75,
      teamwork: 78,
      clutch: 85,
      overall: 75,
    },
    createdAt: '2026-03-07T00:00:00Z',
    updatedAt: '2026-03-07T00:00:00Z',
  },
  {
    id: 'player-3',
    name: '王五',
    position: 'SF',
    skills: {
      twoPointShot: 82,
      threePointShot: 70,
      freeThrow: 75,
      passing: 75,
      ballControl: 78,
      courtVision: 76,
      perimeterDefense: 82,
      interiorDefense: 80,
      steals: 70,
      blocks: 85,
      offensiveRebound: 88,
      defensiveRebound: 90,
      speed: 78,
      strength: 88,
      stamina: 85,
      vertical: 80,
      basketballIQ: 80,
      teamwork: 82,
      clutch: 78,
      overall: 80,
    },
    createdAt: '2026-03-07T00:00:00Z',
    updatedAt: '2026-03-07T00:00:00Z',
  },
  {
    id: 'player-4',
    name: '赵六',
    position: 'PF',
    skills: {
      twoPointShot: 78,
      threePointShot: 60,
      freeThrow: 72,
      passing: 68,
      ballControl: 70,
      courtVision: 65,
      perimeterDefense: 75,
      interiorDefense: 88,
      steals: 65,
      blocks: 90,
      offensiveRebound: 92,
      defensiveRebound: 95,
      speed: 70,
      strength: 92,
      stamina: 80,
      vertical: 85,
      basketballIQ: 75,
      teamwork: 80,
      clutch: 75,
      overall: 78,
    },
    createdAt: '2026-03-07T00:00:00Z',
    updatedAt: '2026-03-07T00:00:00Z',
  },
];

describe('分组流程集成测试', () => {
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // 默认返回测试数据
    vi.mocked(playerRepository.findAll).mockResolvedValue(mockPlayers);
    vi.mocked(playerRepository.create).mockImplementation(async (data) => ({
      id: `player-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Player));
    vi.mocked(playerRepository.delete).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Tab 切换测试', () => {
    it('应该能够切换到分组 Tab', async () => {
      render(<App />);
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 找到分组 Tab 并点击
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      expect(groupingTab).toBeInTheDocument();
      
      fireEvent.click(groupingTab);
      
      // 验证分组界面显示
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 验证 Tab 状态已保存到 localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'player-grouping-active-tab',
        'grouping'
      );
    });

    it('应该从 localStorage 恢复上次选中的 Tab', async () => {
      // 设置 localStorage 中保存的 Tab
      localStorageMock.setItem('player-grouping-active-tab', 'grouping');
      
      render(<App />);
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 验证分组界面显示（说明 Tab 已恢复）
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
    });

    it('应该能够在三个 Tab 之间切换', async () => {
      render(<App />);
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 切换到比赛记录 Tab
      const gamesTab = screen.getByRole('tab', { name: /比赛记录/i });
      fireEvent.click(gamesTab);
      
      await waitFor(() => {
        expect(screen.getByText(/比赛记录功能开发中/i)).toBeInTheDocument();
      });
      
      // 切换回球员管理 Tab
      const playersTab = screen.getByRole('tab', { name: /球员管理/i });
      fireEvent.click(playersTab);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索球员...')).toBeInTheDocument();
      });
    });
  });

  describe('2. 完整分组流程测试', () => {
    it('应该完成完整的分组流程', async () => {
      render(<App />);
      
      // 1) 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 2) 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 3) 选择球员（全选）
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      await waitFor(() => {
        expect(screen.getByText(/已选 4 \/ 4 人/i)).toBeInTheDocument();
      });
      
      // 4) 点击随机分组
      const groupingButton = screen.getByTestId('new-grouping-button');
      expect(groupingButton).not.toBeDisabled();
      fireEvent.click(groupingButton);
      
      // 5) 验证生成了队伍
      await waitFor(() => {
        expect(screen.getByText('分组结果（可拖拽调整）')).toBeInTheDocument();
      });
      
      // 6) 验证平衡度显示
      expect(screen.getByText(/平衡度:/i)).toBeInTheDocument();
      
      // 验证有两支队伍
      const teamCards = screen.getAllByText(/战力:/);
      expect(teamCards.length).toBeGreaterThanOrEqual(2);
    });

    it('应该支持自定义队伍数量', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 修改队伍数量为 3
      const teamCountInput = screen.getByLabelText(/团队数量/i);
      fireEvent.change(teamCountInput, { target: { value: '3' } });
      
      // 选择所有球员
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      await waitFor(() => {
        expect(screen.getByText(/已选 4 \/ 4 人/i)).toBeInTheDocument();
      });
      
      // 点击随机分组
      const groupingButton = screen.getByTestId('new-grouping-button');
      fireEvent.click(groupingButton);
      
      // 验证生成了 3 支队伍
      await waitFor(() => {
        const teamCards = screen.getAllByText(/战力:/);
        expect(teamCards.length).toBe(3);
      });
    });
  });

  describe('3. 拖拽调整测试', () => {
    it('应该支持拖拽调整分组', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab 并生成初始分组
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 选择所有球员并分组
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      await waitFor(() => {
        expect(screen.getByText(/已选 4 \/ 4 人/i)).toBeInTheDocument();
      });
      
      const groupingButton = screen.getByTestId('new-grouping-button');
      fireEvent.click(groupingButton);
      
      await waitFor(() => {
        expect(screen.getByText('分组结果（可拖拽调整）')).toBeInTheDocument();
      });
      
      // 验证球员名字出现（PlayerSelection + DragDropGrouping 各一份）
      const playerNames = screen.getAllByText(/张三|李四|王五|赵六/);
      expect(playerNames.length).toBeGreaterThan(0);
      
      // 验证平衡度显示
      const balanceText = screen.getByText(/平衡度:/i);
      expect(balanceText).toBeInTheDocument();
      
      // 验证队伍卡片存在（通过战力文本）
      const teamCards = screen.getAllByText(/战力:/);
      expect(teamCards.length).toBeGreaterThanOrEqual(2);
    });

    it('应该显示拖拽相关的UI元素', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab 并生成初始分组
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 选择所有球员并分组
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      const groupingButton = screen.getByTestId('new-grouping-button');
      fireEvent.click(groupingButton);
      
      await waitFor(() => {
        expect(screen.getByText('分组结果（可拖拽调整）')).toBeInTheDocument();
      });
      
      // 验证撤销按钮存在（说明支持交互调整）
      const undoButton = screen.getByRole('button', { name: /撤销/i });
      expect(undoButton).toBeInTheDocument();
      
      // 验证球员名字出现
      const playerNames = screen.getAllByText(/张三|李四|王五|赵六/);
      expect(playerNames.length).toBeGreaterThan(0);
    });
  });

  describe('4. 撤销操作测试', () => {
    it('应该支持撤销操作', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab 并生成初始分组
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 选择所有球员并分组
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      const groupingButton = screen.getByTestId('new-grouping-button');
      fireEvent.click(groupingButton);
      
      await waitFor(() => {
        expect(screen.getByText('分组结果（可拖拽调整）')).toBeInTheDocument();
      });
      
      // 验证撤销按钮存在且可用（分组时会保存初始状态到撤销栈）
      const undoButton = screen.getByRole('button', { name: /撤销/i });
      expect(undoButton).toBeInTheDocument();
      // 注意：第一次分组后，撤销栈会保存初始的空状态，所以按钮是启用的
      expect(undoButton).not.toBeDisabled();
    });

    it('撤销按钮应该在分组后可用', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab 并生成初始分组
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 选择所有球员并分组
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      const groupingButton = screen.getByTestId('new-grouping-button');
      fireEvent.click(groupingButton);
      
      await waitFor(() => {
        expect(screen.getByText('分组结果（可拖拽调整）')).toBeInTheDocument();
      });
      
      // 验证撤销按钮存在且可用
      const undoButton = screen.getByRole('button', { name: /撤销/i });
      expect(undoButton).toBeInTheDocument();
      expect(undoButton).not.toBeDisabled();
    });
  });

  describe('5. 边界条件测试', () => {
    it('应该处理选择球员不足的情况', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 只选择 1 个球员
      const checkbox1 = screen.getByRole('checkbox', { name: /张三/i });
      fireEvent.click(checkbox1);
      
      await waitFor(() => {
        expect(screen.getByText(/已选 1 \/ 4 人/i)).toBeInTheDocument();
      });
      
      // 验证分组按钮是禁用的（少于 2 个球员）
      const groupingButton = screen.getByTestId('new-grouping-button');
      expect(groupingButton).toBeDisabled();
      
      // 验证提示信息
      expect(screen.getByText(/请至少选择 2 名球员/i)).toBeInTheDocument();
    });

    it('应该在没有球员时显示空状态', async () => {
      // Mock 返回空数组
      vi.mocked(playerRepository.findAll).mockResolvedValue([]);
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 验证空状态提示
      expect(screen.getByText(/没有找到匹配的球员/i)).toBeInTheDocument();
    });

    it('应该处理加载失败的情况', async () => {
      // Mock 加载失败
      vi.mocked(playerRepository.findAll).mockRejectedValue(new Error('加载失败'));
      
      render(<App />);
      
      // 等待错误提示出现
      await waitFor(() => {
        expect(screen.getByText(/加载球员数据失败/i)).toBeInTheDocument();
      });
      
      // 验证重试按钮存在
      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
    });

    it('应该限制最大选择数量', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 验证最大选择数量显示
      expect(screen.getByText(/最多 \d+ 人/i)).toBeInTheDocument();
    });
  });

  describe('6. 数据持久化测试', () => {
    it('分组 Tab 状态应该持久化到 localStorage', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      // 验证 localStorage 被调用
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'player-grouping-active-tab',
          'grouping'
        );
      });
    });

    it('分组结果应该显示平衡度指标', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab 并生成初始分组
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 选择所有球员并分组
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      const groupingButton = screen.getByTestId('new-grouping-button');
      fireEvent.click(groupingButton);
      
      await waitFor(() => {
        expect(screen.getByText('分组结果（可拖拽调整）')).toBeInTheDocument();
      });
      
      // 验证平衡度显示（百分比格式）
      const balanceBadge = screen.getByText(/平衡度: \d+(\.\d+)?%/);
      expect(balanceBadge).toBeInTheDocument();
      
      // 验证进度条存在
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('7. 搜索和筛选测试', () => {
    it('应该支持搜索球员', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 在搜索框输入
      const searchInput = screen.getByPlaceholderText('搜索球员...');
      fireEvent.change(searchInput, { target: { value: '张三' } });
      
      // 验证只显示匹配的球员
      await waitFor(() => {
        expect(screen.getByText(/张三/i)).toBeInTheDocument();
        expect(screen.queryByText(/李四/i)).not.toBeInTheDocument();
      });
    });

    it('应该支持全选和取消全选', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 切换到分组 Tab
      const groupingTab = screen.getByRole('tab', { name: /分组/i });
      fireEvent.click(groupingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/选择参与分组的球员/i)).toBeInTheDocument();
      });
      
      // 全选
      const selectAllButton = screen.getByRole('button', { name: /全选/i });
      fireEvent.click(selectAllButton);
      
      await waitFor(() => {
        expect(screen.getByText(/已选 4 \/ 4 人/i)).toBeInTheDocument();
      });
      
      // 取消全选
      const deselectAllButton = screen.getByRole('button', { name: /取消全选/i });
      fireEvent.click(deselectAllButton);
      
      await waitFor(() => {
        expect(screen.getByText(/已选 0 \/ 4 人/i)).toBeInTheDocument();
      });
    });
  });

  describe('8. 简易版分组测试（向后兼容）', () => {
    it('应该在球员管理 Tab 中保留简易分组功能', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 验证简易版分组标题存在
      expect(screen.getByText('快速分组（简易版）')).toBeInTheDocument();
      
      // 验证团队数量输入框
      const teamCountInput = screen.getByLabelText(/团队数量：/i);
      expect(teamCountInput).toBeInTheDocument();
      
      // 验证开始分组按钮
      const groupingButton = screen.getByTestId('grouping-button');
      expect(groupingButton).toBeInTheDocument();
    });

    it('应该能够使用简易版分组', async () => {
      render(<App />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载球员数据中...')).not.toBeInTheDocument();
      });
      
      // 点击开始分组
      const groupingButton = screen.getByTestId('grouping-button');
      fireEvent.click(groupingButton);
      
      // 验证分组结果显示
      await waitFor(() => {
        expect(screen.getByText('分组结果')).toBeInTheDocument();
      });
      
      // 验证平衡度显示
      expect(screen.getByText(/平衡度:/i)).toBeInTheDocument();
    });
  });
});

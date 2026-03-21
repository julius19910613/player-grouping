import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabNavigation, type Tab } from '@/components/TabNavigation';

describe('TabNavigation', () => {
  const mockTabs: Tab[] = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
    { id: 'tab3', label: 'Tab 3', icon: '📊' },
  ];

  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    mockOnTabChange.mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该渲染所有 Tab', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab1" 
        onTabChange={mockOnTabChange} 
      />
    );

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 3')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('应该高亮当前激活的 Tab', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab2" 
        onTabChange={mockOnTabChange} 
      />
    );

    const tab2Button = screen.getByRole('tab', { name: /tab 2/i });
    expect(tab2Button).toHaveAttribute('aria-selected', 'true');

    const tab1Button = screen.getByRole('tab', { name: /tab 1/i });
    expect(tab1Button).toHaveAttribute('aria-selected', 'false');
  });

  it('点击 Tab 应该触发 onTabChange', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab1" 
        onTabChange={mockOnTabChange} 
      />
    );

    const tab2Button = screen.getByRole('tab', { name: /tab 2/i });
    fireEvent.click(tab2Button);

    expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    expect(mockOnTabChange).toHaveBeenCalledWith('tab2');
  });

  it('应该支持 localStorage 持久化', () => {
    // 先设置 localStorage
    localStorage.setItem('test-persist-key', 'tab3');

    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab1" 
        onTabChange={mockOnTabChange}
        persistKey="test-persist-key"
      />
    );

    // useEffect 应该触发，调用 onTabChange
    expect(mockOnTabChange).toHaveBeenCalledWith('tab3');
  });

  it('点击后应该保存到 localStorage', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab1" 
        onTabChange={mockOnTabChange}
        persistKey="test-persist-key"
      />
    );

    const tab2Button = screen.getByRole('tab', { name: /tab 2/i });
    fireEvent.click(tab2Button);

    expect(localStorage.getItem('test-persist-key')).toBe('tab2');
  });

  it('应该处理只有一个 Tab 的情况', () => {
    const singleTab: Tab[] = [{ id: 'only', label: 'Only Tab' }];

    render(
      <TabNavigation 
        tabs={singleTab} 
        activeTab="only" 
        onTabChange={mockOnTabChange} 
      />
    );

    expect(screen.getByText('Only Tab')).toBeInTheDocument();
    expect(screen.getByRole('tab')).toHaveAttribute('aria-selected', 'true');
  });

  it('应该处理空 tabs 数组', () => {
    const { container } = render(
      <TabNavigation 
        tabs={[]} 
        activeTab="" 
        onTabChange={mockOnTabChange} 
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('应该忽略无效的 localStorage 值', () => {
    localStorage.setItem('test-persist-key', 'invalid-tab-id');

    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab1" 
        onTabChange={mockOnTabChange}
        persistKey="test-persist-key"
      />
    );

    // 不应该调用 onTabChange，因为 invalid-tab-id 不在 tabs 中
    expect(mockOnTabChange).not.toHaveBeenCalled();
  });

  it('应该应用自定义 className', () => {
    const { container } = render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab1" 
        onTabChange={mockOnTabChange}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('应该显示 Tab 图标', () => {
    render(
      <TabNavigation 
        tabs={mockTabs} 
        activeTab="tab3" 
        onTabChange={mockOnTabChange} 
      />
    );

    expect(screen.getByText('📊')).toBeInTheDocument();
  });
});

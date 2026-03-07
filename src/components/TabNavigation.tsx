import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

export interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  persistKey?: string; // 用于 localStorage 持久化
  className?: string;
}

export function TabNavigation({ 
  tabs, 
  activeTab, 
  onTabChange, 
  persistKey,
  className 
}: TabNavigationProps) {
  // 从 localStorage 加载持久化的 tab
  useEffect(() => {
    if (persistKey) {
      const savedTab = localStorage.getItem(persistKey);
      if (savedTab && tabs.some(tab => tab.id === savedTab)) {
        onTabChange(savedTab);
      }
    }
  }, [persistKey]);

  // 保存 tab 到 localStorage
  const handleTabChange = (tabId: string) => {
    if (persistKey) {
      localStorage.setItem(persistKey, tabId);
    }
    onTabChange(tabId);
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Button
            key={tab.id}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "whitespace-nowrap transition-all",
              isActive && "shadow-md"
            )}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

export default TabNavigation;

/**
 * 迁移使用示例
 * @module examples/migration-example
 * 
 * 展示如何在应用中集成数据迁移功能
 */

import React, { useState, useEffect } from 'react';
import { quickMigrate, quickRollback, getMigrationStatus } from '@/migration';
import type { MigrationResult } from '@/migration';

/**
 * 示例 1：简单迁移按钮
 */
export function SimpleMigrationButton() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<{
    players: MigrationResult | null;
    groupingHistory: MigrationResult | null;
  } | null>(null);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const migrationResult = await quickMigrate();
      setResult(migrationResult);
      
      if (migrationResult.players.success && migrationResult.groupingHistory.success) {
        alert('迁移成功！');
      } else {
        alert('部分数据迁移失败，请查看详情');
      }
    } catch (error) {
      alert(`迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div>
      <button onClick={handleMigrate} disabled={isMigrating}>
        {isMigrating ? '迁移中...' : '开始迁移'}
      </button>
      
      {result && (
        <div style={{ marginTop: '16px' }}>
          <h3>球员迁移结果</h3>
          <p>成功: {result.players.migrated}</p>
          <p>失败: {result.players.failed}</p>
          
          <h3>分组历史迁移结果</h3>
          <p>成功: {result.groupingHistory.migrated}</p>
          <p>失败: {result.groupingHistory.failed}</p>
        </div>
      )}
    </div>
  );
}

/**
 * 示例 2：带进度显示的迁移
 */
export function MigrationWithProgress() {
  const [status, setStatus] = useState(getMigrationStatus());
  const [isMigrating, setIsMigrating] = useState(false);

  // 定期更新状态
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getMigrationStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      await quickMigrate();
      setStatus(getMigrationStatus());
    } catch (error) {
      console.error('迁移失败:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div>
      <h2>数据迁移</h2>
      
      {/* 显示当前进度 */}
      {status.players && (
        <div>
          <h3>球员数据</h3>
          <p>状态: {status.players.status}</p>
          <p>进度: {status.players.migrated} / {status.players.total}</p>
          <div style={{ 
            width: '100%', 
            height: '20px', 
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(status.players.migrated / status.players.total) * 100}%`,
              height: '100%',
              backgroundColor: '#4caf50',
            }} />
          </div>
        </div>
      )}
      
      {status.groupingHistory && (
        <div>
          <h3>分组历史</h3>
          <p>状态: {status.groupingHistory.status}</p>
          <p>进度: {status.groupingHistory.migrated} / {status.groupingHistory.total}</p>
        </div>
      )}
      
      <button 
        onClick={handleMigrate} 
        disabled={isMigrating || status.hasRunningMigration}
        style={{ marginTop: '16px' }}
      >
        {isMigrating ? '迁移中...' : '开始迁移'}
      </button>
    </div>
  );
}

/**
 * 示例 3：应用启动时自动迁移
 */
export function useAutoMigration() {
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    async function autoMigrate() {
      try {
        // 检查是否需要迁移
        const status = getMigrationStatus();
        
        // 如果没有运行中的迁移，且未完成，则自动迁移
        if (!status.hasRunningMigration && 
            (!status.players || status.players.status !== 'completed')) {
          console.log('开始自动迁移...');
          
          const result = await quickMigrate();
          
          if (result.players.success && result.groupingHistory.success) {
            console.log('自动迁移成功');
            setMigrationComplete(true);
          } else {
            console.error('自动迁移失败');
            setMigrationError('迁移失败，请手动处理');
          }
        } else {
          // 已经迁移完成
          setMigrationComplete(true);
        }
      } catch (error) {
        console.error('自动迁移失败:', error);
        setMigrationError(error instanceof Error ? error.message : '未知错误');
      }
    }
    
    autoMigrate();
  }, []);

  return { migrationComplete, migrationError };
}

/**
 * 示例 4：在 App.tsx 中集成
 */
export function App() {
  const { migrationComplete, migrationError } = useAutoMigration();

  if (migrationError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2>迁移失败</h2>
        <p>{migrationError}</p>
        <button onClick={() => window.location.reload()}>
          重试
        </button>
      </div>
    );
  }

  if (!migrationComplete) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <h2>数据迁移中...</h2>
        <p>请稍候，正在将数据迁移到云端</p>
      </div>
    );
  }

  return (
    <div>
      <h1>应用内容</h1>
      {/* 正常应用内容 */}
    </div>
  );
}

/**
 * 示例 5：手动回滚
 */
export function ManualRollback() {
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleRollbackPlayers = async () => {
    if (!confirm('确定要回滚球员数据吗？这将删除云端数据并恢复本地备份。')) {
      return;
    }

    setIsRollingBack(true);
    try {
      const result = await quickRollback('players');
      
      if (result.success) {
        alert(`回滚成功！从 Supabase 删除 ${result.deletedFromSupabase} 条记录`);
      } else {
        alert(`回滚失败: ${result.error}`);
      }
    } catch (error) {
      alert(`回滚失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div>
      <h2>数据回滚</h2>
      <button 
        onClick={handleRollbackPlayers}
        disabled={isRollingBack}
        style={{ 
          padding: '12px 24px',
          backgroundColor: '#ff9800',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {isRollingBack ? '回滚中...' : '回滚球员数据'}
      </button>
    </div>
  );
}

/**
 * 示例 6：集成到设置页面
 */
export function SettingsPage() {
  const [showMigration, setShowMigration] = useState(false);
  const status = getMigrationStatus();

  return (
    <div style={{ padding: '24px' }}>
      <h1>设置</h1>
      
      {/* 数据迁移部分 */}
      <div style={{ marginTop: '24px' }}>
        <h2>数据管理</h2>
        
        {/* 显示当前状态 */}
        {status.players && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px',
            marginBottom: '12px',
          }}>
            <strong>球员数据状态:</strong> {status.players.status}
            {status.players.status === 'completed' && (
              <span style={{ color: '#4caf50', marginLeft: '8px' }}>✅</span>
            )}
          </div>
        )}
        
        {/* 迁移按钮 */}
        <button
          onClick={() => setShowMigration(!showMigration)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showMigration ? '隐藏迁移工具' : '显示迁移工具'}
        </button>
        
        {/* 迁移向导 */}
        {showMigration && (
          <div style={{ marginTop: '16px' }}>
            <MigrationWizard />
          </div>
        )}
      </div>
    </div>
  );
}

// 导入迁移向导组件
import { MigrationWizard } from '@/components/MigrationWizard';

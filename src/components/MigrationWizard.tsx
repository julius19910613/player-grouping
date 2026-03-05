/**
 * 数据迁移向导组件
 * @module components/MigrationWizard
 * 
 * 职责：
 * - 显示迁移进度
 * - 显示成功/失败数量
 * - 提供回滚选项
 * - 错误详情展示
 */

import  { useState, useEffect } from 'react';
import { migrationManager, type MigrationResult } from '../migration/migrate-to-supabase';
import { rollbackManager, type RollbackResult } from '../migration/rollback';
import { migrationProgress, type MigrationProgress } from '../migration/migration-progress';
import { databaseService } from '../services/database';
import { PlayerRepository } from '../repositories/player.repository';
import { GroupingRepository } from '../repositories/grouping.repository';

/**
 * 迁移向导状态
 */
type WizardState = 
  | 'idle'           // 初始状态
  | 'preparing'      // 准备中
  | 'migrating'      // 迁移中
  | 'completed'      // 完成
  | 'failed'         // 失败
  | 'rolling_back'   // 回滚中
  | 'rolled_back';   // 已回滚

/**
 * 迁移向导组件
 */
export function MigrationWizard() {
  const [state, setState] = useState<WizardState>('idle');
  const [playersResult, setPlayersResult] = useState<MigrationResult | null>(null);
  const [groupingResult, setGroupingResult] = useState<MigrationResult | null>(null);
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 数据统计
  const [sqliteStats, setSqliteStats] = useState({
    players: 0,
    groupingHistory: 0,
  });
  
  // 进度跟踪
  const [playersProgress, setPlayersProgress] = useState<MigrationProgress | null>(null);
  const [groupingProgress, setGroupingProgress] = useState<MigrationProgress | null>(null);
  
  /**
   * 加载 SQLite 数据统计
   */
  useEffect(() => {
    async function loadStats() {
      try {
        if (!databaseService.isInitialized()) {
          await databaseService.init();
        }
        
        const playerRepo = new PlayerRepository();
        const groupingRepo = new GroupingRepository();
        
        const players = await playerRepo.count();
        const groupingHistory = await groupingRepo.count();
        
        setSqliteStats({ players, groupingHistory });
        
        // 加载已有进度
        const summary = migrationProgress.getSummary();
        setPlayersProgress(summary.players);
        setGroupingProgress(summary.groupingHistory);
        
      } catch (err) {
        console.error('加载数据统计失败:', err);
      }
    }
    
    loadStats();
  }, []);
  
  /**
   * 开始迁移
   */
  const handleStartMigration = async () => {
    try {
      setState('preparing');
      setError(null);
      
      console.log('开始迁移...');
      
      // 执行迁移
      const result = await migrationManager.migrateAll();
      
      setPlayersResult(result.players);
      setGroupingResult(result.groupingHistory);
      
      // 更新进度
      setPlayersProgress(migrationProgress.getProgress('players'));
      setGroupingProgress(migrationProgress.getProgress('grouping_history'));
      
      // 判断是否成功
      if (result.players.success && result.groupingHistory.success) {
        setState('completed');
      } else {
        setState('failed');
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('迁移失败:', errorMsg);
      setError(errorMsg);
      setState('failed');
    }
  };
  
  /**
   * 执行回滚
   */
  const handleRollback = async () => {
    try {
      setState('rolling_back');
      setError(null);
      
      console.log('开始回滚...');
      
      // 回滚球员数据
      const playersRollback = await rollbackManager.rollback('players');
      
      // 回滚分组历史
      const groupingRollback = await rollbackManager.rollback('grouping_history');
      
      setRollbackResult({
        ...playersRollback,
        deletedFromSupabase: playersRollback.deletedFromSupabase + groupingRollback.deletedFromSupabase,
        restoredFromBackup: playersRollback.restoredFromBackup,
      });
      
      setState('rolled_back');
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('回滚失败:', errorMsg);
      setError(errorMsg);
      setState('failed');
    }
  };
  
  /**
   * 重置向导
   */
  const handleReset = () => {
    setState('idle');
    setPlayersResult(null);
    setGroupingResult(null);
    setRollbackResult(null);
    setError(null);
  };
  
  /**
   * 渲染进度条
   */
  const renderProgressBar = (progress: MigrationProgress | null) => {
    if (!progress) return null;
    
    const percentage = progress.total > 0 
      ? Math.round((progress.migrated / progress.total) * 100) 
      : 0;
    
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>{progress.type === 'players' ? '球员数据' : '分组历史'}</span>
          <span>{progress.migrated} / {progress.total} ({percentage}%)</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '20px', 
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: progress.status === 'completed' ? '#4caf50' : '#2196f3',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  };
  
  /**
   * 渲染结果详情
   */
  const renderResultDetails = (result: MigrationResult | null, title: string) => {
    if (!result) return null;
    
    return (
      <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h4>{title}</h4>
        <div>总数: {result.total}</div>
        <div style={{ color: '#4caf50' }}>成功: {result.migrated}</div>
        {result.failed > 0 && (
          <div style={{ color: '#f44336' }}>失败: {result.failed}</div>
        )}
        <div>耗时: {(result.duration / 1000).toFixed(2)}s</div>
        
        {result.errors.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <strong>错误详情:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {result.errors.slice(0, 5).map((err, idx) => (
                <li key={idx} style={{ fontSize: '12px', color: '#666' }}>
                  ID: {err.id} - {err.error}
                </li>
              ))}
              {result.errors.length > 5 && (
                <li style={{ fontSize: '12px', color: '#999' }}>
                  ...还有 {result.errors.length - 5} 个错误
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>数据迁移向导</h2>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        将 SQLite 数据迁移到 Supabase 云端存储
      </p>
      
      {/* SQLite 数据统计 */}
      <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
        <h3>SQLite 数据统计</h3>
        <div>球员数量: {sqliteStats.players}</div>
        <div>分组历史: {sqliteStats.groupingHistory}</div>
      </div>
      
      {/* 状态显示 */}
      {state === 'idle' && (
        <div>
          <p>准备将 {sqliteStats.players} 个球员和 {sqliteStats.groupingHistory} 条分组历史迁移到 Supabase。</p>
          <button
            onClick={handleStartMigration}
            disabled={sqliteStats.players === 0 && sqliteStats.groupingHistory === 0}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: sqliteStats.players === 0 && sqliteStats.groupingHistory === 0 ? 'not-allowed' : 'pointer',
              opacity: sqliteStats.players === 0 && sqliteStats.groupingHistory === 0 ? 0.5 : 1,
            }}
          >
            开始迁移
          </button>
        </div>
      )}
      
      {state === 'preparing' && (
        <div style={{ padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
          <p>⏳ 准备迁移...</p>
        </div>
      )}
      
      {state === 'migrating' && (
        <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
          <p>🔄 迁移进行中...</p>
          {renderProgressBar(playersProgress)}
          {renderProgressBar(groupingProgress)}
        </div>
      )}
      
      {state === 'completed' && (
        <div>
          <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px', marginBottom: '16px' }}>
            <h3 style={{ color: '#4caf50', marginTop: 0 }}>✅ 迁移完成</h3>
            {renderResultDetails(playersResult, '球员数据')}
            {renderResultDetails(groupingResult, '分组历史')}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#757575',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
      
      {state === 'failed' && (
        <div>
          <div style={{ padding: '16px', backgroundColor: '#ffebee', borderRadius: '8px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f44336', marginTop: 0 }}>❌ 迁移失败</h3>
            {error && <p style={{ color: '#f44336' }}>错误: {error}</p>}
            {renderResultDetails(playersResult, '球员数据')}
            {renderResultDetails(groupingResult, '分组历史')}
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleStartMigration}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
            <button
              onClick={handleRollback}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              回滚
            </button>
          </div>
        </div>
      )}
      
      {state === 'rolling_back' && (
        <div style={{ padding: '16px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
          <p>🔄 正在回滚...</p>
        </div>
      )}
      
      {state === 'rolled_back' && rollbackResult && (
        <div>
          <div style={{ padding: '16px', backgroundColor: '#e8f5e9', borderRadius: '8px', marginBottom: '16px' }}>
            <h3 style={{ color: '#4caf50', marginTop: 0 }}>✅ 回滚完成</h3>
            <div>从 Supabase 删除: {rollbackResult.deletedFromSupabase} 条记录</div>
            <div>从备份恢复: {rollbackResult.restoredFromBackup} 条记录</div>
          </div>
          
          <button
            onClick={handleReset}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#757575',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      )}
      
      {/* 说明 */}
      <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px', fontSize: '14px', color: '#666' }}>
        <p style={{ margin: '4px 0' }}>📌 <strong>说明:</strong></p>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          <li>迁移前会自动创建 SQLite 备份</li>
          <li>迁移过程中保留 SQLite 数据</li>
          <li>如迁移失败，可使用回滚功能恢复</li>
          <li>需要网络连接才能迁移到 Supabase</li>
        </ul>
      </div>
    </div>
  );
}

export default MigrationWizard;

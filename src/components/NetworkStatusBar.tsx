/**
 * 离线支持示例组件
 * @module components/OfflineSupportExample
 * 
 * 演示如何在应用中集成离线支持功能
 */

import  { useState, useEffect } from 'react';
import { useNetworkStatus } from '../lib/network-status';
import { useAppInit } from '../lib/app-init';
import { createPlayerRepository } from '../repositories';
import type { Player } from '../types/player';
import { BasketballPosition } from '../types/basketball';

/**
 * 网络状态栏组件
 */
export function NetworkStatusBar() {
  const { isOnline } = useNetworkStatus();
  const { getStatus } = useAppInit();

  const [status, setStatus] = useState(getStatus());

  useEffect(() => {
    // 监听初始化状态变化
    const interval = setInterval(() => {
      setStatus(getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [getStatus]);

  return (
    <div className="network-status-bar">
      <div className="status-item">
        <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢' : '🔴'}
        </span>
        <span>{isOnline ? '在线' : '离线'}</span>
      </div>

      {status.pendingSync.players > 0 && (
        <div className="status-item">
          <span>⏳</span>
          <span>待同步球员: {status.pendingSync.players}</span>
        </div>
      )}

      {status.pendingSync.groupings > 0 && (
        <div className="status-item">
          <span>⏳</span>
          <span>待同步分组: {status.pendingSync.groupings}</span>
        </div>
      )}
    </div>
  );
}

/**
 * 离线支持演示组件
 */
export function OfflineSupportExample() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { isOnline, manualSync } = useNetworkStatus();
  const { initialize, getStatus } = useAppInit();

  const playerRepo = createPlayerRepository();

  // 初始化应用
  useEffect(() => {
    async function init() {
      await initialize();
      await loadPlayers();
    }
    init();
  }, []);

  // 加载球员列表
  const loadPlayers = async () => {
    try {
      const allPlayers = await playerRepo.findAll();
      setPlayers(allPlayers);
    } catch (error) {
      console.error('加载球员失败:', error);
    }
  };

  // 添加球员
  const handleAddPlayer = async () => {
    try {
      const newPlayer = await playerRepo.create({
        name: `测试球员 ${Date.now()}`,
        position: BasketballPosition.PG,
      } as any);

      setPlayers([...players, newPlayer]);

      if (!isOnline) {
        alert('✅ 球员已保存到本地，网络恢复后将自动同步');
      } else {
        alert('✅ 球员已保存');
      }
    } catch (error) {
      console.error('添加球员失败:', error);
      alert('❌ 添加失败');
    }
  };

  // 手动同步
  const handleManualSync = async () => {
    if (!isOnline) {
      alert('⚠️ 当前离线，无法同步');
      return;
    }

    setIsSyncing(true);
    try {
      await manualSync();
      alert('✅ 同步成功');
      await loadPlayers(); // 重新加载数据
    } catch (error) {
      console.error('同步失败:', error);
      alert('❌ 同步失败');
    } finally {
      setIsSyncing(false);
    }
  };

  // 删除球员
  const handleDeletePlayer = async (id: string) => {
    if (!confirm('确定要删除这名球员吗？')) {
      return;
    }

    try {
      await playerRepo.delete(id);
      setPlayers(players.filter(p => p.id !== id));

      if (!isOnline) {
        alert('✅ 已标记为删除，网络恢复后将自动同步');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('❌ 删除失败');
    }
  };

  return (
    <div className="offline-support-example">
      <NetworkStatusBar />

      <h2>离线支持演示</h2>

      <div className="controls">
        <button onClick={handleAddPlayer} className="btn btn-primary">
          添加球员（测试离线功能）
        </button>

        <button 
          onClick={handleManualSync} 
          className="btn"
          disabled={!isOnline || isSyncing}
        >
          {isSyncing ? '同步中...' : '手动同步'}
        </button>
      </div>

      <div className="info-panel">
        <h3>当前状态</h3>
        <ul>
          <li>网络状态: {isOnline ? '🟢 在线' : '🔴 离线'}</li>
          <li>Repository 类型: {getStatus().repositoryType}</li>
          <li>待同步球员: {getStatus().pendingSync.players}</li>
          <li>待同步分组: {getStatus().pendingSync.groupings}</li>
        </ul>
      </div>

      <div className="players-list">
        <h3>球员列表 ({players.length})</h3>
        {players.length === 0 ? (
          <p>暂无球员</p>
        ) : (
          <ul>
            {players.map(player => (
              <li key={player.id}>
                <span>{player.name}</span>
                <button 
                  onClick={() => handleDeletePlayer(player.id)}
                  className="btn-delete"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tips">
        <h3>测试步骤</h3>
        <ol>
          <li>在开发者工具中切换到 Network 标签</li>
          <li>选择 "Offline" 模拟离线状态</li>
          <li>点击"添加球员"按钮</li>
          <li>观察提示："已保存到本地，网络恢复后将自动同步"</li>
          <li>取消 "Offline" 恢复网络</li>
          <li>观察控制台日志："✅ 网络已恢复" 和 "🔄 开始同步..."</li>
          <li>验证数据已同步到 Supabase</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * 样式（CSS）
 */
export const styles = `
.network-status-bar {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  font-size: 20px;
}

.offline-support-example {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.info-panel {
  background: #f9f9f9;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.players-list ul {
  list-style: none;
  padding: 0;
}

.players-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.btn-delete {
  background: #dc3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.tips {
  background: #e7f3ff;
  padding: 16px;
  border-radius: 8px;
  margin-top: 20px;
}

.tips ol {
  margin: 0;
  padding-left: 20px;
}

.tips li {
  margin-bottom: 8px;
}
`;

export default OfflineSupportExample;

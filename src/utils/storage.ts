import { Player } from '../types/player';

const STORAGE_KEY = 'player-grouping-data';

/**
 * 本地存储工具类
 */
export class Storage {
  /**
   * 保存球员列表到本地存储
   */
  static savePlayers(players: Player[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    } catch (error) {
      console.error('Failed to save players:', error);
    }
  }

  /**
   * 从本地存储加载球员列表
   */
  static loadPlayers(): Player[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const players = JSON.parse(data);
      // 转换日期字符串为 Date 对象
      return players.map((player: any) => ({
        ...player,
        createdAt: new Date(player.createdAt),
        updatedAt: new Date(player.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to load players:', error);
      return [];
    }
  }

  /**
   * 清空本地存储
   */
  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * 导出球员数据为 JSON 文件
   */
  static exportPlayers(players: Player[]): void {
    const data = JSON.stringify(players, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `players-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 从 JSON 文件导入球员数据
   */
  static async importPlayers(file: File): Promise<Player[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const players = data.map((player: any) => ({
            ...player,
            createdAt: new Date(player.createdAt),
            updatedAt: new Date(player.updatedAt),
          }));
          resolve(players);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

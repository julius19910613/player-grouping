/**
 * 球员数据导入组件
 * 提供一键导入功能
 */

import { useState } from 'react';
import { playerRepository } from '../repositories';
import playersData from '../data/players.json';

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export function PlayerImporter() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    const res: ImportResult = {
      total: playersData.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const player of playersData) {
      try {
        await playerRepository.create({
          name: player.name,
          position: player.position as any,
          skills: player.skills as any,
        });
        res.success++;
        console.log(`✅ 导入成功: ${player.name}`);
      } catch (error) {
        res.failed++;
        res.errors.push(`${player.name}: ${error}`);
        console.error(`❌ 导入失败: ${player.name}`, error);
      }
    }

    setResult(res);
    setImporting(false);
  };

  return (
    <div className="player-importer">
      <h2>球员数据导入</h2>
      
      <div className="import-info">
        <p>待导入球员: <strong>{playersData.length}</strong> 人</p>
        <ul>
          <li>PG (控卫): 3人</li>
          <li>SG (得分后卫): 3人</li>
          <li>SF (小前锋): 6人</li>
          <li>PF (大前锋): 2人</li>
          <li>C (中锋): 5人</li>
        </ul>
      </div>

      <button 
        onClick={handleImport} 
        disabled={importing}
        className="import-button"
      >
        {importing ? '导入中...' : '开始导入'}
      </button>

      {result && (
        <div className={`import-result ${result.failed > 0 ? 'has-errors' : ''}`}>
          <h3>导入结果</h3>
          <p>✅ 成功: {result.success}</p>
          <p>❌ 失败: {result.failed}</p>
          
          {result.errors.length > 0 && (
            <div className="errors">
              <h4>错误详情:</h4>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerImporter;

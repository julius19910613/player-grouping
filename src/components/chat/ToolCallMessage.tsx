/**
 * Tool Call Message Component
 * 
 * 显示工具调用状态和结果
 */

import React from 'react';

export interface ToolCallMessageProps {
  toolName: string;
  args: Record<string, any>;
  status: 'calling' | 'success' | 'error';
  result?: any;
  error?: string;
}

export const ToolCallMessage: React.FC<ToolCallMessageProps> = ({
  toolName,
  args,
  status,
  result,
  error,
}) => {
  const getToolLabel = (name: string): string => {
    const labels: Record<string, string> = {
      'get_player_stats': '📊 获取球员数据',
      'search_web': '🔍 联网搜索',
      'calculate_grouping': '🎯 计算分组',
    };
    return labels[name] || name;
  };

  const getStatusIcon = (): string => {
    switch (status) {
      case 'calling':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔧';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'calling':
        return '调用中...';
      case 'success':
        return '完成';
      case 'error':
        return '失败';
      default:
        return '';
    }
  };

  return (
    <div className="tool-call-message bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="font-medium">{getToolLabel(toolName)}</span>
        <span className={`px-2 py-0.5 rounded text-xs ${
          status === 'calling' ? 'bg-blue-100 text-blue-700' :
          status === 'success' ? 'bg-green-100 text-green-700' :
          'bg-red-100 text-red-700'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {/* Parameters */}
      {status === 'calling' && Object.keys(args).length > 0 && (
        <div className="text-gray-600 text-xs mb-2">
          <span className="font-medium">参数: </span>
          {Object.entries(args).map(([key, value]) => (
            <span key={key} className="mr-2">
              {key}={typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
            </span>
          ))}
        </div>
      )}

      {/* Result */}
      {status === 'success' && result && (
        <div className="bg-green-50 rounded p-2 text-xs overflow-auto max-h-32">
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div className="bg-red-50 rounded p-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * 聊天输入组件
 * 支持防抖、自动补全、快捷键
 */

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useDebounce } from '../hooks/useDebounce';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean; // 是否正在生成回复
  placeholder?: string;
  maxLength?: number;
  enableAutocomplete?: boolean;
  quickCommands?: string[];
}

// 预设的快捷命令
const DEFAULT_QUICK_COMMANDS = [
  '查看所有球员',
  '随机分组',
  '最佳阵容',
  '能力分析',
  '搜索球员',
  '查看统计',
];

export function ChatInput({
  onSend,
  disabled,
  isLoading = false,
  placeholder = '输入消息... (Shift+Enter 换行)',
  maxLength = 1000,
  enableAutocomplete = true,
  quickCommands = DEFAULT_QUICK_COMMANDS
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 防抖输入值
  const debouncedInput = useDebounce(input, 300);

  // 自动补全：过滤匹配的命令
  useEffect(() => {
    if (enableAutocomplete && input.startsWith('/') && input.length > 1) {
      const searchTerm = input.slice(1).toLowerCase();
      const filtered = quickCommands.filter(cmd => 
        cmd.toLowerCase().includes(searchTerm)
      );
      setFilteredCommands(filtered);
      setShowAutocomplete(filtered.length > 0);
      setAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
      setFilteredCommands([]);
    }
  }, [debouncedInput, enableAutocomplete, quickCommands, input]);

  const handleSend = useCallback(() => {
    if (input.trim() && !disabled && input.length <= maxLength) {
      onSend(input.trim());
      setInput('');
      setShowAutocomplete(false);
    }
  }, [input, disabled, maxLength, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 自动补全导航
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        selectAutocomplete(autocompleteIndex);
        return;
      }
      
      if (e.key === 'Escape') {
        setShowAutocomplete(false);
        return;
      }
    }

    // 正常发送
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectAutocomplete = (index: number) => {
    const selectedCommand = filteredCommands[index];
    if (selectedCommand) {
      setInput(selectedCommand);
      setShowAutocomplete(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="border-t p-4 relative" role="form" aria-label="聊天输入">
      {/* 自动补全列表 */}
      {showAutocomplete && (
        <div 
          className="absolute bottom-full left-4 right-4 bg-background border rounded-lg shadow-lg mb-2 max-h-48 overflow-y-auto z-50"
          role="listbox"
          aria-label="自动补全建议"
        >
          {filteredCommands.map((cmd, index) => (
            <button
              key={cmd}
              type="button"
              onClick={() => selectAutocomplete(index)}
              className={`w-full px-4 py-2 text-left hover:bg-muted ${
                index === autocompleteIndex ? 'bg-muted' : ''
              }`}
              role="option"
              aria-selected={index === autocompleteIndex}
            >
              <span className="text-primary font-medium">/{cmd}</span>
            </button>
          ))}
        </div>
      )}

      {/* 输入框和按钮 */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none min-h-[60px]"
          rows={2}
          maxLength={maxLength}
          aria-label="消息输入框"
          aria-describedby="char-counter"
          aria-autocomplete="list"
          aria-controls={showAutocomplete ? 'autocomplete-list' : undefined}
          data-testid="chat-input"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled || input.length > maxLength}
          className="self-end"
          aria-label={isLoading ? "正在生成回复" : "发送消息"}
          data-testid="send-button"
        >
          {isLoading ? '生成中...' : '发送'}
        </Button>
      </div>
      
      {/* 字符计数 */}
      <div 
        id="char-counter"
        className={`text-xs mt-2 ${
          input.length > maxLength ? 'text-destructive' : 'text-muted-foreground'
        }`}
        aria-live="polite"
      >
        {input.length} / {maxLength}
        {input.length > maxLength && ' (超出限制)'}
      </div>

      {/* 快捷命令提示 */}
      {!showAutocomplete && input === '' && (
        <div className="text-xs text-muted-foreground mt-1" aria-label="提示">
          {isLoading ? '🔄 正在生成回复...' : '💡 输入 / 查看快捷命令'}
        </div>
      )}
    </div>
  );
}

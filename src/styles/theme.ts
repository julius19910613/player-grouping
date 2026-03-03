// 主题配置

export const theme = {
  colors: {
    primary: {
      main: '#FF6B35',
      dark: '#E55A2B',
      light: '#FF8C5A',
      bg: '#FFF4EF',
    },
    position: {
      PG: '#3B82F6',
      SG: '#EF4444',
      SF: '#F59E0B',
      PF: '#10B981',
      C: '#8B5CF6',
      UTILITY: '#6B7280',
    },
    neutral: {
      text: '#1F2937',
      textSecondary: '#6B7280',
      textLight: '#9CA3AF',
      background: '#FFFFFF',
      backgroundSecondary: '#F9FAFB',
      border: '#E5E7EB',
      borderLight: '#F3F4F6',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.2)',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },
  zIndex: {
    dropdown: 100,
    modal: 1000,
    tooltip: 1100,
    toast: 1200,
  },
} as const;

// 位置颜色获取函数
export function getPositionColor(position: string): string {
  return theme.colors.position[position as keyof typeof theme.colors.position] || theme.colors.position.UTILITY;
}

// 导出类型
export type Theme = typeof theme;

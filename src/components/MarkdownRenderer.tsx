/**
 * 优化的 Markdown 渲染组件
 * 支持代码高亮、GFM（GitHub Flavored Markdown）
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = memo<MarkdownRendererProps>(
  ({ content, className = '' }) => {
    const markdownComponents = useMemo(
      () => ({
        // 代码块优化
        code({ node, inline, className: codeClassName, children, ...props }: any) {
          const match = /language-(\w+)/.exec(codeClassName || '');
          return !inline && match ? (
            <code className={codeClassName} {...props}>
              {children}
            </code>
          ) : (
            <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          );
        },
        // 链接优化（新标签页打开）
        a({ href, children }: any) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          );
        },
        // 段落优化
        p({ children }: any) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        // 列表优化
        ul({ children }: any) {
          return <ul className="list-disc pl-4 mb-2">{children}</ul>;
        },
        ol({ children }: any) {
          return <ol className="list-decimal pl-4 mb-2">{children}</ol>;
        },
        // 标题优化
        h1({ children }: any) {
          return <h1 className="text-2xl font-bold mb-2">{children}</h1>;
        },
        h2({ children }: any) {
          return <h2 className="text-xl font-bold mb-2">{children}</h2>;
        },
        h3({ children }: any) {
          return <h3 className="text-lg font-bold mb-2">{children}</h3>;
        },
      }),
      []
    );

    return (
      <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  // 自定义比较函数
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.className === nextProps.className;
  }
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

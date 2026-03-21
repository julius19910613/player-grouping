import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  describe('basic rendering', () => {
    it('should render plain text', () => {
      render(<MarkdownRenderer content="Hello, world!" />);
      
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('should render inline code', () => {
      render(<MarkdownRenderer content="This is `inline code`" />);
      
      expect(screen.getByText('inline code')).toBeInTheDocument();
    });

    it('should render code blocks with syntax highlighting', () => {
      const { container } = render(
        <MarkdownRenderer
          content={'```javascript\nconst x = 1;\n```'}
        />
      );
      // Syntax highlighting splits text into spans; check code block contains the text
      const codeBlock = container.querySelector('pre code');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock?.textContent).toContain('const x = 1;');
    });
  });

  describe('markdown features', () => {
    it('should render bold text', () => {
      render(<MarkdownRenderer content="This is **bold** text" />);
      
      const strongElement = screen.getByText('bold');
      expect(strongElement.tagName).toBe('STRONG');
    });

    it('should render italic text', () => {
      render(<MarkdownRenderer content="This is *italic* text" />);
      
      const emElement = screen.getByText('italic');
      expect(emElement.tagName).toBe('EM');
    });

    it('should render links', () => {
      render(
        <MarkdownRenderer
          content="[Example Link](https://example.com)"
        />
      );
      
      const link = screen.getByRole('link', { name: 'Example Link' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render unordered lists', () => {
      render(
        <MarkdownRenderer
          content={'- Item 1\n- Item 2\n- Item 3'}
        />
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should render ordered lists', () => {
      render(
        <MarkdownRenderer
          content={'1. First\n2. Second\n3. Third'}
        />
      );
      
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('headings', () => {
    it('should render h1', () => {
      render(<MarkdownRenderer content="# Heading 1" />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Heading 1');
    });

    it('should render h2', () => {
      render(<MarkdownRenderer content="## Heading 2" />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Heading 2');
    });

    it('should render h3', () => {
      render(<MarkdownRenderer content="### Heading 3" />);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Heading 3');
    });
  });

  describe('GFM features', () => {
    it('should render tables', () => {
      render(
        <MarkdownRenderer
          content={'| Name | Age |\n|------|-----|\n| John | 25  |'}
        />
      );
      
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should render strikethrough', () => {
      render(<MarkdownRenderer content="~~deleted~~" />);
      
      const delElement = screen.getByText('deleted');
      expect(delElement.tagName).toBe('DEL');
    });

    it('should render task lists', () => {
      render(
        <MarkdownRenderer
          content={'- [x] Done\n- [ ] Todo'}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MarkdownRenderer
          content="Test"
          className="custom-class"
        />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have prose classes by default', () => {
      const { container } = render(<MarkdownRenderer content="Test" />);
      
      expect(container.firstChild).toHaveClass('prose');
      expect(container.firstChild).toHaveClass('prose-sm');
    });
  });

  describe('memo optimization', () => {
    it('should not re-render if content is the same', () => {
      const { rerender, container } = render(
        <MarkdownRenderer content="Test content" />
      );
      
      const firstRender = container.firstChild;
      
      rerender(<MarkdownRenderer content="Test content" />);
      
      const secondRender = container.firstChild;
      
      // Should be the same element
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render if content changes', () => {
      const { rerender } = render(
        <MarkdownRenderer content="First content" />
      );
      
      expect(screen.getByText('First content')).toBeInTheDocument();
      
      rerender(<MarkdownRenderer content="Second content" />);
      
      expect(screen.getByText('Second content')).toBeInTheDocument();
      expect(screen.queryByText('First content')).not.toBeInTheDocument();
    });

    it('should re-render if className changes', () => {
      const { rerender, container } = render(
        <MarkdownRenderer content="Test" className="class-1" />
      );
      
      expect(container.firstChild).toHaveClass('class-1');
      
      rerender(<MarkdownRenderer content="Test" className="class-2" />);
      
      expect(container.firstChild).toHaveClass('class-2');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const { container } = render(<MarkdownRenderer content="" />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle content with only whitespace', () => {
      const { container } = render(<MarkdownRenderer content="   " />);
      
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle complex nested markdown', () => {
      render(
        <MarkdownRenderer
          content={'# Title\n\n**Bold** and *italic*\n\n- List item 1\n- List item 2'}
        />
      );
      
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
    });

    it('should handle HTML entities', () => {
      render(<MarkdownRenderer content="&lt;div&gt;" />);
      
      expect(screen.getByText('<div>')).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      render(<MarkdownRenderer content="Test @user #tag $100" />);
      
      expect(screen.getByText(/Test @user #tag \$100/)).toBeInTheDocument();
    });
  });

  describe('code highlighting', () => {
    it('should render code with language class', () => {
      const { container } = render(
        <MarkdownRenderer
          content={'```python\nprint("hello")\n```'}
        />
      );
      
      const codeElement = container.querySelector('code.language-python');
      expect(codeElement).toBeInTheDocument();
    });

    it('should render code without language', () => {
      render(
        <MarkdownRenderer
          content={'```\ncode here\n```'}
        />
      );
      
      expect(screen.getByText(/code here/)).toBeInTheDocument();
    });
  });

  describe('security', () => {
    it('should not render script tags', () => {
      const { container } = render(
        <MarkdownRenderer
          content="<script>alert('xss')</script>"
        />
      );
      
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });

    it('should sanitize HTML in links', () => {
      render(
        <MarkdownRenderer
          content="[Link](javascript:alert('xss'))"
        />
      );
      
      const link = screen.queryByRole('link');
      // Link should be sanitized or not rendered
      if (link) {
        expect(link).not.toHaveAttribute('href', "javascript:alert('xss')");
      }
    });
  });
});

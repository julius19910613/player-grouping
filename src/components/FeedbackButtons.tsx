/**
 * 反馈按钮组件
 * 支持点赞/点踩和详细反馈
 */

import { memo, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react';
import { feedbackService } from '../services/feedback-service';
import { toast } from 'sonner';

interface FeedbackButtonsProps {
  messageId: string;
  onFeedbackSubmitted?: () => void;
}

export const FeedbackButtons = memo<FeedbackButtonsProps>(
  ({ messageId, onFeedbackSubmitted }) => {
    const [feedbackGiven, setFeedbackGiven] = useState<'like' | 'dislike' | null>(null);
    const [showDetailForm, setShowDetailForm] = useState(false);
    const [comment, setComment] = useState('');

    // 快速反馈（点赞/点踩）
    const handleQuickFeedback = useCallback(
      (type: 'like' | 'dislike') => {
        feedbackService.submitFeedback({
          type,
          messageId,
        });

        setFeedbackGiven(type);
        toast.success('感谢您的反馈！');
        onFeedbackSubmitted?.();
      },
      [messageId, onFeedbackSubmitted]
    );

    // 打开详细反馈表单
    const handleOpenDetail = useCallback(() => {
      setShowDetailForm(true);
    }, []);

    // 提交详细反馈
    const handleSubmitDetail = useCallback(() => {
      if (!comment.trim()) {
        toast.error('请输入反馈内容');
        return;
      }

      feedbackService.submitFeedback({
        type: 'suggestion',
        messageId,
        comment: comment.trim(),
      });

      setShowDetailForm(false);
      setComment('');
      toast.success('感谢您的反馈！');
      onFeedbackSubmitted?.();
    }, [comment, messageId, onFeedbackSubmitted]);

    // 取消详细反馈
    const handleCancelDetail = useCallback(() => {
      setShowDetailForm(false);
      setComment('');
    }, []);

    // 如果已经给出反馈，只显示结果
    if (feedbackGiven) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {feedbackGiven === 'like' ? (
            <>
              <ThumbsUp className="h-3 w-3" />
              <span>有帮助</span>
            </>
          ) : (
            <>
              <ThumbsDown className="h-3 w-3" />
              <span>需要改进</span>
            </>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickFeedback('like')}
            className="h-6 w-6 p-0"
            aria-label="点赞"
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickFeedback('dislike')}
            className="h-6 w-6 p-0"
            aria-label="点踩"
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenDetail}
            className="h-6 w-6 p-0"
            aria-label="详细反馈"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>

        {/* 详细反馈表单（对话框） */}
        {showDetailForm && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 id="feedback-title" className="text-lg font-semibold">
                  反馈建议
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelDetail}
                  className="h-6 w-6 p-0"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="请描述您的问题或建议..."
                className="w-full h-32 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="反馈内容"
              />

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={handleCancelDetail}>
                  取消
                </Button>
                <Button onClick={handleSubmitDetail}>提交</Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

FeedbackButtons.displayName = 'FeedbackButtons';

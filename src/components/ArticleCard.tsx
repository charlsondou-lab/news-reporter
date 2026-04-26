'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Article } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';
import ReactMarkdown from 'react-markdown';

// Category config
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; gradient: string }> = {
  ai:        { icon: '🤖', color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
  tools:     { icon: '🛠️', color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' },
  tech:      { icon: '💻', color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #047857)' },
  mindset:   { icon: '🧠', color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
  finance:   { icon: '💰', color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)' },
  marketing: { icon: '📢', color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #BE185D)' },
  design:      { icon: '🎨', color: '#F97316', gradient: 'linear-gradient(135deg, #F97316, #EA580C)' },
  crypto:      { icon: '🪙', color: '#FACC15', gradient: 'linear-gradient(135deg, #FACC15, #EAB308)' },
  solopreneur: { icon: '🔨', color: '#6366F1', gradient: 'linear-gradient(135deg, #6366F1, #4338CA)' },
  security:    { icon: '🛡️', color: '#14B8A6', gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)' },
  automation:  { icon: '⚡', color: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED, #5B21B6)' },
  growth:      { icon: '📈', color: '#D946EF', gradient: 'linear-gradient(135deg, #D946EF, #A21CAF)' },
  future:      { icon: '🚀', color: '#F43F5E', gradient: 'linear-gradient(135deg, #F43F5E, #BE123C)' },
  life:        { icon: '🌿', color: '#84CC16', gradient: 'linear-gradient(135deg, #84CC16, #4D7C0F)' },
  other:       { icon: '📄', color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280, #4B5563)' },
};

function getScoreClass(score: number): string {
  if (score >= 7) return 'high';
  if (score >= 4) return 'mid';
  return 'low';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return '剛才';
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

interface ArticleCardProps {
  article: Article;
  index: number;
  onToggleRead: (id: string, isRead: boolean) => void;
  onToggleBookmark: (id: string, isBookmarked: boolean) => void;
  onHide: (id: string) => void;
  onScore: (id: string, score: number, comment: string) => Promise<unknown>;
}

export default function ArticleCard({
  article,
  index,
  onToggleRead,
  onToggleBookmark,
  onHide,
  onScore,
}: ArticleCardProps) {
  const [userScore, setUserScore] = useState<number | null>(article.user_score);
  const [userComment, setUserComment] = useState(article.user_comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<string | null>(article.ai_feedback_analysis);

  const { language } = useLanguage();

  const cardRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const cat = CATEGORY_CONFIG[article.ai_category] || CATEGORY_CONFIG.other;

  // Auto mark as read when scrolled past (Intersection Observer)
  const handleAutoRead = useCallback(() => {
    if (!article.is_read) {
      onToggleRead(article.id, false);
    }
  }, [article.id, article.is_read, onToggleRead]);

  useEffect(() => {
    if (article.is_read) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // When card is fully out of viewport (scrolled past)
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          handleAutoRead();
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0 }
    );

    if (cardRef.current) {
      observerRef.current.observe(cardRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [article.is_read, handleAutoRead]);

  const handleSubmitScore = async () => {
    if (!userScore) return;
    setIsSubmitting(true);
    try {
      const result = await onScore(article.id, userScore, userComment);
      if (result && typeof result === 'object' && 'feedback' in result) {
        const feedback = (result as { feedback?: { analysis?: string } }).feedback;
        if (feedback?.analysis) {
          setFeedbackResult(feedback.analysis);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If user is selecting text, don't trigger click
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('textarea') ||
      target.closest('.score-dot')
    ) {
      return;
    }
    // Only toggle read state
    onToggleRead(article.id, article.is_read);
  };

  const isScored = article.scored_at !== null;
  const hasChanged = userScore !== article.user_score || userComment !== (article.user_comment || '');

  const displayTitle = language === 'tc' ? (article.ai_title_tc || article.ai_title || article.title) : (article.ai_title_en || article.title);
  const displaySummary = language === 'tc' ? (article.ai_summary_tc || article.ai_summary) : article.ai_summary_en;
  const displayContent = language === 'tc' ? (article.ai_content_tc || article.content_markdown) : article.content_markdown;

  return (
    <div
      ref={cardRef}
      className={`article-card ${article.is_read ? 'is-read' : ''}`}
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
      onClick={handleCardClick}
    >
      {/* Category ribbon */}
      <div className="card-category-ribbon" style={{ background: cat.gradient }} />

      {/* Header */}
      <div className="card-header">
        <span
          className="card-category-badge"
          style={{
            background: `${cat.color}18`,
            color: cat.color,
            border: `1px solid ${cat.color}30`,
          }}
        >
          {cat.icon} {article.ai_category.toUpperCase()}
        </span>

        <div style={{ flex: 1 }} />

        <span className={`card-score-badge ${getScoreClass(article.ai_score)}`}>
          AI {article.ai_score}/10
        </span>

        {article.user_score && (
          <span className={`card-score-badge ${getScoreClass(article.user_score)}`}>
            {language === 'tc' ? '你' : 'You'} {article.user_score}/10
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="card-title">
        {displayTitle}
      </h3>

      {/* Meta */}
      <div className="card-meta">
        {article.feed_title && (
          <span className="card-meta-item">📡 {article.feed_title}</span>
        )}
        {article.author && (
          <span className="card-meta-item">✍️ {article.author}</span>
        )}
        <span className="card-meta-item">
          🕐 {formatDate(article.published_at || article.created_at)}
        </span>
      </div>

      {/* Summary */}
      {displaySummary && (
        <p className="card-summary">{displaySummary}</p>
      )}

      {/* AI Score Reasoning */}
      {article.ai_score_reasoning && (
        <div className="card-reasoning">
          <strong>🤖 {language === 'tc' ? 'AI 評分理由' : 'AI Reasoning'}：</strong> {article.ai_score_reasoning}
        </div>
      )}

      {/* Expand content */}
      <button className="expand-btn" onClick={() => setShowContent(!showContent)}>
        {showContent
          ? (language === 'tc' ? '▲ 收起內容' : '▲ Hide Content')
          : (language === 'tc' ? '▼ 展開全文' : '▼ Read Full Content')}
      </button>

      {showContent && (
        <div className="content-expanded">
          {displayContent ? (
            <ReactMarkdown
              components={{
                a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                img: ({ ...props }) => <img {...props} loading="lazy" />
              }}
            >
              {displayContent}
            </ReactMarkdown>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>{language === 'tc' ? '（無內容）' : '(No content)'}</p>
          )}
        </div>
      )}

      {/* Score Section */}
      <div className="score-section">
        <div className="score-row">
          <span className="score-label">{language === 'tc' ? '你的評分' : 'Your Score'}</span>
          <div className="score-dots">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                className={`score-dot ${userScore === n ? `selected ${getScoreClass(n)}` : ''}`}
                onClick={() => setUserScore(n)}
                disabled={isSubmitting}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <textarea
            className="comment-input"
            placeholder={language === 'tc' ? "對這篇文章的評價...（選填，評分差距大時 AI 會分析你的偏好）" : "Optional comment... (AI uses this to learn your preferences when scores differ)"}
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            rows={1}
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div className="card-actions">
          {(hasChanged || !isScored) && userScore && (
            <button
              className="action-btn submit"
              onClick={handleSubmitScore}
              disabled={isSubmitting || !userScore}
            >
              {isSubmitting
                ? (language === 'tc' ? '⏳ 提交中...' : '⏳ Submitting...')
                : isScored
                  ? (language === 'tc' ? '更新評分' : 'Update Score')
                  : (language === 'tc' ? '💾 提交評分' : '💾 Submit')}
            </button>
          )}

          <div className="action-spacer" />

          <button
            className={`action-btn ${article.is_read ? 'active' : ''}`}
            onClick={() => onToggleRead(article.id, article.is_read)}
          >
            {article.is_read
              ? (language === 'tc' ? '◉ 已讀' : '◉ Read')
              : (language === 'tc' ? '○ 未讀' : '○ Unread')}
          </button>

          <button
            className={`action-btn ${article.is_bookmarked ? 'active' : ''}`}
            onClick={() => onToggleBookmark(article.id, article.is_bookmarked)}
          >
            {article.is_bookmarked
              ? (language === 'tc' ? '🔖 已收藏' : '🔖 Saved')
              : (language === 'tc' ? '☆ 收藏' : '☆ Save')}
          </button>

          <button className="action-btn" onClick={() => onHide(article.id)}>
            🙈 {language === 'tc' ? '隱藏' : 'Hide'}
          </button>

          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn"
            >
              ↗ {language === 'tc' ? '原文' : 'Source'}
            </a>
          )}
        </div>
      </div>

      {/* Feedback Analysis */}
      {feedbackResult && (
        <div className="feedback-card">
          <div className="feedback-title">
            🧠 {language === 'tc' ? 'AI 偏好分析' : 'AI Preference Analysis'}
          </div>
          <div className="feedback-text">
            {feedbackResult}
          </div>
        </div>
      )}
    </div>
  );
}

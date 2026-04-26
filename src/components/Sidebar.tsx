'use client';

import type { Category } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';

interface SidebarProps {
  categories: Category[];
  categoryStats: Record<string, { total: number; unread: number; avgAiScore: number; avgUserScore: number }>;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  overview: { total: number; unread: number; bookmarked: number; hidden: number; read: number };
  learningRecords: number;
  isOpen: boolean;
  onShowBookmarked: () => void;
  onMarkAllRead: () => void;
}

const CATEGORY_ICON_BY_ID: Record<string, string> = {
  ai: '🤖',
  tools: '🛠️',
  automation: '⚡',
  tech: '💻',
  security: '🛡️',
  future: '🚀',
  mindset: '🧠',
  solopreneur: '🔨',
  finance: '💰',
  crypto: '🪙',
  marketing: '📢',
  growth: '📈',
  design: '🎨',
  life: '🌿',
  other: '📄',
};

const CATEGORY_ICON_BY_KEYWORD: Record<string, string> = {
  brain: '🤖',
  wrench: '🛠️',
  bot: '⚡',
  cpu: '💻',
  shield: '🛡️',
  sparkles: '🚀',
  lightbulb: '🧠',
  user: '🔨',
  'line-chart': '💰',
  coins: '🪙',
  megaphone: '📢',
  'trending-up': '📈',
  palette: '🎨',
  heart: '🌿',
  circle: '📄',
};

function resolveCategoryIcon(category: Category): string {
  if (category.icon) {
    const keywordIcon = CATEGORY_ICON_BY_KEYWORD[category.icon.toLowerCase()];
    if (keywordIcon) return keywordIcon;
    if (category.icon.length <= 3) return category.icon;
  }
  return CATEGORY_ICON_BY_ID[category.id] || '📄';
}

export default function Sidebar({
  categories,
  categoryStats,
  selectedCategory,
  onSelectCategory,
  overview,
  learningRecords,
  isOpen,
  onShowBookmarked,
}: SidebarProps) {
  const totalUnread = overview.unread;
  const { language } = useLanguage();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <h1>{language === 'tc' ? 'AI 自家新聞台' : 'AI News Desk'}</h1>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">{language === 'tc' ? '總覽' : 'Overview'}</div>
        <div
          className={`sidebar-item ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          <span className="icon">📰</span>
          <span className="label">{language === 'tc' ? '全部文章' : 'All Articles'}</span>
          {totalUnread > 0 && <span className="sidebar-badge">{totalUnread}</span>}
        </div>
        <div className="sidebar-item" onClick={onShowBookmarked}>
          <span className="icon">📌</span>
          <span className="label">{language === 'tc' ? '收藏' : 'Bookmarks'}</span>
          {overview.bookmarked > 0 && <span className="sidebar-badge">{overview.bookmarked}</span>}
        </div>
      </div>

      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <div className="sidebar-section-title">{language === 'tc' ? '分類' : 'Categories'}</div>
        {categories.map((cat) => {
          const stats = categoryStats[cat.id];
          const unread = stats?.unread || 0;

          return (
            <div
              key={cat.id}
              className={`sidebar-item ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <span className="icon">{resolveCategoryIcon(cat)}</span>
              <span className="label">{cat.label}</span>
              {unread > 0 && <span className="sidebar-badge">{unread}</span>}
            </div>
          );
        })}
      </div>

      <div className="sidebar-divider" />

      <div className="stats-panel">
        <div className="sidebar-section-title">{language === 'tc' ? '統計' : 'Stats'}</div>
        <div className="stat-card">
          <div className="stat-value">{overview.total}</div>
          <div className="stat-label">{language === 'tc' ? '文章總數' : 'Total Articles'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview.read}</div>
          <div className="stat-label">{language === 'tc' ? '已讀總數' : 'Total Read'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{learningRecords}</div>
          <div className="stat-label">{language === 'tc' ? 'AI 學習紀錄' : 'AI Learning'}</div>
        </div>
      </div>
    </aside>
  );
}

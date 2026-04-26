'use client';

import { useLanguage } from '@/lib/LanguageContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuToggle: () => void;
  onFetchArticles: () => void;
  isFetching: boolean;
  unreadCount: number;
}

export default function Header({
  searchQuery,
  onSearchChange,
  onMenuToggle,
  onFetchArticles,
  isFetching,
  unreadCount,
}: HeaderProps) {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'tc' ? 'en' : 'tc');
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="mobile-menu-btn" onClick={onMenuToggle}>
          ☰
        </button>
        <div className="header-title">
          <span className="logo-icon">⚡</span>
          AI 自家新聞台
          {unreadCount > 0 && (
            <span style={{
              fontSize: '0.7rem',
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 600,
            }}>
              {unreadCount} {language === 'tc' ? '未讀' : 'Unread'}
            </span>
          )}
        </div>
      </div>

      <div className="header-actions">
        <button
          className="fetch-btn"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          onClick={toggleLanguage}
        >
          {language === 'tc' ? '🌐 繁體中文' : '🌐 English'}
        </button>

        <button
          className={`fetch-btn ${isFetching ? 'loading' : ''}`}
          onClick={onFetchArticles}
          disabled={isFetching}
        >
          <span className="fetch-icon">🔄</span>
          {isFetching 
            ? (language === 'tc' ? '抓取中...' : 'Fetching...') 
            : (language === 'tc' ? '抓取新文章' : 'Fetch News')}
        </button>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder={language === 'tc' ? "搜尋文章..." : "Search articles..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onSearchChange('');
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}

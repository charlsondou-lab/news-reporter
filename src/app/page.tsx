'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ArticleCard from '@/components/ArticleCard';
import type { Article, Category } from '@/lib/supabase';
import { useLanguage } from '@/lib/LanguageContext';

interface StatsData {
  overview: {
    total: number;
    unread: number;
    bookmarked: number;
    hidden: number;
    read: number;
  };
  categoryStats: Record<string, { total: number; unread: number; avgAiScore: number; avgUserScore: number }>;
  categories: Category[];
  learningRecords: number;
}

const EMPTY_STATS: StatsData = {
  overview: { total: 0, unread: 0, bookmarked: 0, hidden: 0, read: 0 },
  categoryStats: {},
  categories: [],
  learningRecords: 0,
};

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hideRead, setHideRead] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string; onUndo?: () => void }[]>([]);

  const { language } = useLanguage();

  const toastIdRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, type = 'success', onUndo?: () => void) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type, onUndo }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, onUndo ? 6000 : 3000); // Give more time if undo is available
  }, []);

  // Fetch articles
  const fetchArticles = useCallback(async (pageNum: number, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams({
      offset: append ? articles.length.toString() : '0',
      limit: '20',
      sort: sortBy,
      hideRead: hideRead.toString(),
      hideHidden: 'true',
    });

    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (onlyBookmarked) params.set('bookmarked', 'true');
    if (searchQuery) params.set('search', searchQuery);

    try {
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch articles');
      }

      if (append) {
        setArticles(prev => {
          const newArticles: Article[] = data.articles || [];
          // 確保過濾掉已經存在的文章，避免因為分頁偏移導致重複載入舊狀態的文章
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNew = newArticles.filter(a => !existingIds.has(a.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setArticles(data.articles || []);
      }
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      showToast('載入文章失敗', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, hideRead, onlyBookmarked, sortBy, searchQuery, showToast]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to fetch stats:', data?.error || data);
        setStats(EMPTY_STATS);
        return;
      }
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStats(EMPTY_STATS);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setPage(1);
    fetchArticles(1);
    fetchStats();
  }, [fetchArticles, fetchStats]);

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && page < totalPages) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchArticles(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [page, totalPages, loadingMore, fetchArticles]);

  // Auto-refill articles when they all disappear in hideRead mode
  useEffect(() => {
    if (hideRead && articles.length === 0 && !loading && !loadingMore && totalPages > 0) {
      setPage(1);
      fetchArticles(1);
    }
  }, [articles.length, hideRead, loading, loadingMore, totalPages, fetchArticles]);

  // Update article in state
  const updateArticleInState = useCallback((id: string, updates: Partial<Article>) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  // Handle article actions
  const handleToggleRead = useCallback(async (id: string, isRead: boolean) => {
    const turningToRead = !isRead;
    const article = articles.find(a => a.id === id);

    // Immediate UI feedback
    if (turningToRead && hideRead) {
      setArticles(prev => prev.filter(a => a.id !== id));
    } else {
      updateArticleInState(id, { is_read: turningToRead, read_at: turningToRead ? new Date().toISOString() : null });
    }

    const performUndo = async () => {
      if (turningToRead && hideRead && article) {
        setArticles(prev => [article, ...prev]);
      } else {
        updateArticleInState(id, { is_read: isRead, read_at: isRead ? new Date().toISOString() : null });
      }
      await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: isRead }),
      });
      fetchStats();
    };

    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: turningToRead }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      fetchStats();
      
      showToast(
        turningToRead ? (language === 'tc' ? '標記已讀' : 'Marked as read') : (language === 'tc' ? '標記未讀' : 'Marked as unread'),
        'success',
        performUndo
      );
    } catch {
      // Rollback
      if (turningToRead && hideRead) {
        fetchArticles(1);
      } else {
        updateArticleInState(id, { is_read: isRead });
      }
      showToast(language === 'tc' ? '操作失敗' : 'Operation Failed', 'error');
    }
  }, [updateArticleInState, fetchStats, showToast, language, hideRead, fetchArticles, articles]);

  const handleToggleBookmark = useCallback(async (id: string, isBookmarked: boolean) => {
    updateArticleInState(id, { is_bookmarked: !isBookmarked });
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_bookmarked: !isBookmarked }),
      });

      if (!res.ok) throw new Error('Failed to update bookmark');

      fetchStats();
    } catch (err) {
      updateArticleInState(id, { is_bookmarked: isBookmarked });
      showToast(language === 'tc' ? '操作失敗' : 'Operation Failed', 'error');
    }
  }, [updateArticleInState, fetchStats, showToast, language]);

  const handleHide = useCallback(async (id: string) => {
    const article = articles.find(a => a.id === id);
    setArticles(prev => prev.filter(a => a.id !== id));

    const performUndo = async () => {
      if (article) setArticles(prev => [article, ...prev]);
      await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: false }),
      });
      fetchStats();
    };

    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: true }),
      });

      if (!res.ok) throw new Error('Failed to hide article');

      fetchStats();
      showToast(language === 'tc' ? '文章已隱藏' : 'Article hidden', 'info', performUndo);
    } catch {
      showToast(language === 'tc' ? '操作失敗' : 'Operation Failed', 'error');
      fetchArticles(1);
    }
  }, [fetchStats, fetchArticles, showToast, language, articles]);

  const handleScore = useCallback(async (id: string, score: number, comment: string) => {
    try {
      const res = await fetch(`/api/articles/${id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit score');
      }

      const data = await res.json();

      // Immediate UI feedback
      if (hideRead) {
        setArticles(prev => prev.filter(a => a.id !== id));
      } else {
        updateArticleInState(id, {
          user_score: score,
          user_comment: comment,
          is_read: true,
          scored_at: new Date().toISOString(),
          ai_feedback_analysis: data.article?.ai_feedback_analysis || null,
        });
      }

      fetchStats();

      if (data.analysisScheduled) {
        showToast(language === 'tc' ? '✨ AI 已開始在背景分析你的偏好' : '✨ AI analysis started in background');
      } else {
        showToast(language === 'tc' ? '評分已儲存' : 'Score saved');
      }

      return data;
    } catch {
      showToast(language === 'tc' ? '評分失敗' : 'Failed to score', 'error');
      return null;
    }
  }, [updateArticleInState, fetchStats, showToast, language, hideRead]);

  // Batch actions
  const handleMarkAllRead = useCallback(async () => {
    // Remember which ones were unread
    const targetIds = articles.filter(a => !a.is_read).map(a => a.id);
    if (targetIds.length === 0) return;

    const previousArticles = [...articles];

    const performUndo = async () => {
      setArticles(previousArticles);
      await fetch('/api/articles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateMany',
          ids: targetIds,
          is_read: false
        }),
      });
      fetchStats();
      showToast(language === 'tc' ? '已復原標記' : 'Restored');
    };

    try {
      await fetch('/api/articles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAllRead',
          filters: selectedCategory !== 'all' ? { category: selectedCategory } : undefined,
        }),
      });
      
      if (hideRead) {
        setArticles(prev => prev.filter(a => !targetIds.includes(a.id)));
      } else {
        setArticles(prev => prev.map(a => targetIds.includes(a.id) ? { ...a, is_read: true, read_at: new Date().toISOString() } : a));
      }

      fetchStats();
      showToast(language === 'tc' ? '全部標記已讀' : 'Marked all as read', 'success', performUndo);
    } catch {
      showToast(language === 'tc' ? '操作失敗' : 'Operation Failed', 'error');
    }
  }, [selectedCategory, fetchStats, showToast, language, articles, hideRead]);

  const handleFetchArticles = useCallback(async () => {
    setFetching(true);
    showToast(language === 'tc' ? '🔄 正在從 TTRSS 抓取新文章...' : '🔄 Fetching new articles from TTRSS...');
    try {
      const res = await fetch('/api/cron/fetch-articles', { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        showToast(language === 'tc' ? `抓取失敗：${data.error}` : `Fetch failed: ${data.error}`, 'error');
      } else {
        showToast(language === 'tc' ? `✅ 抓取完成：${data.processed} 篇新文章` : `✅ Fetch complete: ${data.processed} new articles`);
        fetchArticles(1);
        fetchStats();
      }
    } catch {
      showToast(language === 'tc' ? '抓取文章失敗' : 'Failed to fetch articles', 'error');
    } finally {
      setFetching(false);
    }
  }, [fetchArticles, fetchStats, showToast, language]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'r') handleMarkAllRead();
      if (e.key === 'f') handleFetchArticles();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleMarkAllRead, handleFetchArticles]);

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
        <Sidebar
          categories={stats?.categories || []}
          categoryStats={stats?.categoryStats || {}}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setOnlyBookmarked(false);
          setSidebarOpen(false);
        }}
        overview={stats?.overview || EMPTY_STATS.overview}
        learningRecords={stats?.learningRecords || 0}
        isOpen={sidebarOpen}
        onShowBookmarked={() => {
          setOnlyBookmarked(true);
          setSelectedCategory('all');
          setSidebarOpen(false);
        }}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Main */}
      <div className="main-content">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onFetchArticles={handleFetchArticles}
          isFetching={fetching}
          unreadCount={stats?.overview?.unread || 0}
        />

        <div className="feed-container">
          {/* Filter Bar */}
          <div className="filter-bar">
            <button
              className="filter-btn active"
              onClick={() => setHideRead(!hideRead)}
            >
              {hideRead ? '👁️‍🗨️' : '👁️'} {hideRead ? (language === 'tc' ? '隱藏已讀' : 'Hide Read') : (language === 'tc' ? '顯示全部' : 'Show All')}
            </button>

            {onlyBookmarked && (
              <button
                className="filter-btn active"
                onClick={() => setOnlyBookmarked(false)}
              >
                🔖 {language === 'tc' ? '僅收藏 ✕' : 'Bookmarks ✕'}
              </button>
            )}

            <button className="filter-btn" onClick={handleMarkAllRead}>
              ✓ {language === 'tc' ? '全部已讀' : 'Mark All Read'}
            </button>

            <div className="filter-spacer" />

            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_at">{language === 'tc' ? '最新抓取' : 'Newest Fetched'}</option>
              <option value="published_at">{language === 'tc' ? '最新發佈' : 'Newest Published'}</option>
              <option value="ai_score">{language === 'tc' ? 'AI 評分高→低' : 'Highest AI Score'}</option>
            </select>
          </div>

          {/* Articles */}
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : (articles.length === 0 && page >= totalPages) ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>{language === 'tc' ? '暫無文章' : 'No Articles'}</h3>
              <p>
                {searchQuery
                  ? (language === 'tc' ? '找不到符合搜尋條件的文章' : 'No articles match your search')
                  : (language === 'tc' ? '點擊右上角的「抓取」按鈕從 TTRSS 獲取新文章' : 'Click the Fetch button to get new articles from TTRSS')}
              </p>
            </div>
          ) : (
            <>
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={index}
                  onToggleRead={handleToggleRead}
                  onToggleBookmark={handleToggleBookmark}
                  onHide={handleHide}
                  onScore={handleScore}
                />
              ))}

              {/* Infinite scroll trigger */}
              {page < totalPages && (
                <div ref={loadMoreRef}>
                  {loadingMore ? (
                    <div className="loading-spinner">
                      <div className="spinner" />
                    </div>
                  ) : (
                    <button className="load-more-btn" onClick={() => {
                      const next = page + 1;
                      setPage(next);
                      fetchArticles(next, true);
                    }}>
                      ⟡ {language === 'tc' ? '載入更多' : 'Load More'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.message}</span>
            {t.onUndo && (
              <button
                className="toast-undo-btn"
                onClick={() => {
                  t.onUndo?.();
                  setToasts(prev => prev.filter(toast => toast.id !== t.id));
                }}
              >
                {language === 'tc' ? '復原' : 'Undo'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

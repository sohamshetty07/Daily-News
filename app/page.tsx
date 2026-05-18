'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, Clock } from 'lucide-react';

interface Article {
  title: string;
  url: string;
  category: string;
}

const CATEGORIES = [
  'Business & National News',
  'International News',
  'Account/People Movement',
  'Interesting Read',
  'Economic Update/Sector'
];

const HEADER_STYLES: Record<string, { bg: string, pill: string }> = {
  'Business & National News': { bg: 'bg-slate-800', pill: 'bg-slate-700' },
  'International News': { bg: 'bg-blue-800', pill: 'bg-blue-700' },
  'Account/People Movement': { bg: 'bg-purple-800', pill: 'bg-purple-700' },
  'Interesting Read': { bg: 'bg-emerald-800', pill: 'bg-emerald-700' },
  'Economic Update/Sector': { bg: 'bg-amber-800', pill: 'bg-amber-700' },
};

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [rawArticles, setRawArticles] = useState<any[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/curate'); // GET request
        const data = await res.json();
        
        if (data.success && data.articles && data.articles.length > 0) {
          setArticles(data.articles);
          if (data.rawArticles) {
            setRawArticles(data.rawArticles);
          }
          if (data.lastRefreshed) {
            setLastRefreshed(new Date(data.lastRefreshed));
          }
        }
      } catch (err: any) {
        console.error("Initial load error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchCuration = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/curate', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to curate news');
      }
      
      setArticles(data.articles || data.data || []);
      if (data.rawArticles) {
        setRawArticles(data.rawArticles);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const getArticlesByCategory = (category: string) => {
    return articles.filter(a => a.category === category);
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans h-screen flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 shadow-sm gap-4 sm:gap-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white font-bold text-xl px-3 py-1 rounded tracking-tight">ZEE</div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Daily News Intelligence</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
              {lastRefreshed ? `Updated: ${lastRefreshed.toLocaleTimeString()}` : 'Ready for Daily Cycle'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold">{todayStr}</div>
            <div className="text-xs text-indigo-600 font-medium whitespace-nowrap">
              {lastRefreshed ? `Last Run: ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not run yet'}
            </div>
          </div>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="hidden sm:flex text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg font-bold items-center transition-colors"
          >
            {showRaw ? 'View Curated' : 'View Raw Engine Data'}
          </button>
          <button 
            onClick={fetchCuration}
            disabled={loading}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Curating...' : 'Refresh Feed'}
          </button>
        </div>
      </header>

      {/* Dashboard Stats Ribbon */}
      <div className="bg-indigo-50 px-6 py-2 border-b border-indigo-100 flex gap-6 shrink-0 overflow-x-auto shadow-inner">
        <div className="text-xs whitespace-nowrap"><span className="text-slate-500 uppercase font-bold">Sources Scanned:</span> <span className="font-mono font-bold ml-1">24</span></div>
        <div className="text-xs whitespace-nowrap"><span className="text-slate-500 uppercase font-bold">Curated Output:</span> <span className="font-mono font-bold ml-1">{articles.length}</span></div>
        <div className="text-xs whitespace-nowrap hidden sm:block"><span className="text-slate-500 uppercase font-bold">AI Deduplication:</span> <span className="font-mono font-bold text-green-600 ml-1">Active</span></div>
      </div>

      {/* Main Dashboard Grid */}
      <main className="flex-1 p-4 overflow-y-auto">
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4 border border-red-200 h-fit">
            <h3 className="text-sm font-medium text-red-800">Error fetching news: {error}</h3>
          </div>
        )}

        {!loading && articles.length === 0 && !error && (
          <div className="flex items-center justify-center h-full min-h-[400px]">
             <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md">
                <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">No data loaded yet</h2>
                <p className="mt-2 text-sm text-slate-500">Run the 'Refresh Feed' to scrape, deduplicate, and curate the latest news through Gemini.</p>
             </div>
          </div>
        )}

        {showRaw ? (
          <div className="bg-white border text-left border-slate-200 rounded-lg shadow-sm w-full">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 text-sm">Raw Engine Data ({rawArticles.length} total)</h2>
            </div>
            <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
              <table className="w-full min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-xs text-slate-500 uppercase tracking-wide">Title</th>
                    <th className="px-4 py-3 text-left font-bold text-xs text-slate-500 uppercase tracking-wide">Source URL</th>
                    <th className="px-4 py-3 text-left font-bold text-xs text-slate-500 uppercase tracking-wide">Time/Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rawArticles.map((ra, index) => {
                    let domain = ra.sourceUrl;
                    try { domain = new URL(ra.sourceUrl).hostname.replace('www.', ''); } catch (e) {}
                    return (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 align-top max-w-sm shrink-0">
                          <a href={ra.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium line-clamp-2">
                             {ra.title}
                          </a>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-500 font-mono text-xs break-all">
                          {domain}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-500 text-xs">
                          {ra.time || <span className="text-slate-300 italic">None</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && (
              <>
                {CATEGORIES.map((category) => (
                  <section key={`skel-${category}`} className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm h-full max-h-[800px] min-h-[250px] animate-pulse">
                    <div className="bg-slate-300 px-4 py-2 flex justify-between items-center shrink-0">
                      <div className="h-4 bg-slate-400 rounded w-1/3"></div>
                      <div className="h-4 bg-slate-400 rounded w-12"></div>
                    </div>
                    <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                      {[1, 2, 3].map((idx) => (
                        <article key={idx} className="border-l-2 border-slate-200 pl-3">
                          <div className="h-3.5 bg-slate-200 rounded w-full mb-1"></div>
                          <div className="h-3.5 bg-slate-200 rounded w-4/5 mb-3"></div>
                          <div className="flex justify-between items-center text-[10px] mt-1.5">
                            <div className="h-2.5 bg-slate-200 rounded w-1/4"></div>
                            <div className="h-2.5 bg-slate-200 rounded w-10"></div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}

            {!loading && articles.length > 0 && CATEGORIES.map((category) => {
              const categoryArticles = getArticlesByCategory(category);
              
              const headerColors = HEADER_STYLES[category] || { bg: 'bg-slate-800', pill: 'bg-slate-700' };

              return (
                <section key={category} className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm h-full max-h-[800px] min-h-[250px]">
                  <div className={`${headerColors.bg} text-white px-4 py-2 flex justify-between items-center shrink-0`}>
                    <h2 className="text-xs font-black uppercase tracking-widest truncate mr-2">{category}</h2>
                    <span className={`${headerColors.pill} text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap`}>
                      {String(categoryArticles.length).padStart(2, '0')} items
                    </span>
                  </div>
                  <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                    {categoryArticles.map((article, idx) => {
                      const isFirst = idx === 0;
                      let domain = '';
                      try {
                        domain = new URL(article.url).hostname.replace('www.', '');
                      } catch (e) {
                        domain = 'Source';
                      }

                      return (
                        <article key={idx} className={`border-l-2 pl-3 transition-opacity ${isFirst ? 'border-indigo-500' : 'border-slate-200 opacity-80 hover:opacity-100'}`}>
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`text-[13px] font-bold leading-tight block mb-1 ${isFirst ? 'hover:text-indigo-600 underline decoration-slate-200 underline-offset-2' : ''}`}
                          >
                            {article.title}
                          </a>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium mt-1.5">
                            <span className="truncate mr-2 text-slate-600">{domain}</span>
                            <span className="shrink-0">{isFirst ? 'Latest' : 'Recent'}</span>
                          </div>
                        </article>
                      );
                    })}
                    {categoryArticles.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400 font-medium uppercase tracking-wider">
                        No items in this run
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Bar */}
      {!loading && articles.length > 0 && (
        <footer className="bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center shrink-0 hidden sm:flex">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Internal Use Only • Zee News Curation Engine
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-bold text-slate-600 uppercase">API Status: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-[10px] font-bold text-slate-600 uppercase">Scraper: Active</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

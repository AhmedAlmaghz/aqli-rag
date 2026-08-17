import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Search, 
  Download, 
  Check, 
  Star, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Code, 
  Database, 
  FileText, 
  FolderSync, 
  Github, 
  Sparkles,
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import { Language, MarketplaceItem } from '../types';
import { DEFAULT_MARKETPLACE_CATALOG } from '../data/marketplaceData';

interface MarketplacePageProps {
  lang: Language;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ lang }) => {
  const [items, setItems] = useState<MarketplaceItem[]>(DEFAULT_MARKETPLACE_CATALOG);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [installingId, setInstallingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/marketplace/items')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const isDbFormat = data[0] && ('itemId' in data[0]);
          if (isDbFormat) {
            const dbMap = new Map(data.map((d: any) => [d.itemId, d.enabled]));
            const merged = DEFAULT_MARKETPLACE_CATALOG.map((catItem) => ({
              ...catItem,
              isInstalled: dbMap.has(catItem.id) ? !!dbMap.get(catItem.id) : catItem.isInstalled,
            }));
            setItems(merged);
          } else if (data[0] && data[0].nameAr) {
            setItems(data);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load marketplace items from API, using catalog:', err);
      });
  }, []);

  const filteredItems = items.filter((item) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = 
      ((item.nameAr || '').toLowerCase().includes(q)) ||
      ((item.nameEn || '').toLowerCase().includes(q)) ||
      ((item.descriptionAr || '').toLowerCase().includes(q)) ||
      ((item.descriptionEn || '').toLowerCase().includes(q));

    const matchesType = selectedType === 'all' || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleToggleInstall = async (item: MarketplaceItem) => {
    setInstallingId(item.id);
    const nextState = !item.isInstalled;
    try {
      await fetch('/api/marketplace/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          enabled: nextState,
          workspaceId: 'ws-enterprise-legal',
        }),
      });
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isInstalled: nextState } : it))
      );
    } catch (err) {
      console.error('Failed to toggle marketplace item:', err);
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Store className="w-4 h-4" />
            <span>{lang === 'ar' ? 'سوق الموصلات والأدوات وخوادم MCP' : 'Connectors, Tools & MCP Marketplace'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'ar' ? 'سوق تكاملات Aqli والموصلات المعتمدة' : 'Aqli Integrations & MCP Catalog'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'تثبيت بنقرة واحدة للموصلات السحابية وخوادم MCP الموثوقة ومهارات الذكاء الاصطناعي AI SDK Skills'
              : 'One-click installation for cloud connectors, verified MCP servers, and reusable AI SDK skills'}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'ar' ? 'جميع العناصر معتمدة ومفحوصة أمنياً' : 'Sandboxed & Security Audited'}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: 'all', labelAr: 'الكل', labelEn: 'All Items' },
            { id: 'connector', labelAr: 'الموصلات السحابية', labelEn: 'Connectors' },
            { id: 'mcp_server', labelAr: 'خوادم MCP', labelEn: 'MCP Servers' },
            { id: 'skill', labelAr: 'المهارات البرمجية', labelEn: 'Agent Skills' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                selectedType === tab.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {lang === 'ar' ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث في السوق...' : 'Search marketplace...'}
            className="w-full bg-slate-900 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute end-3 top-2.5" />
        </div>

      </div>

      {/* Marketplace Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isProcessing = installingId === item.id;
          return (
            <div
              key={item.id}
              className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between gap-5 hover:border-slate-700 transition-all shadow-md group"
            >
              <div className="space-y-4">
                
                {/* Item Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      {item.type === 'connector' && <FolderSync className="w-5 h-5" />}
                      {item.type === 'mcp_server' && <Database className="w-5 h-5 text-indigo-400" />}
                      {item.type === 'skill' && <Code className="w-5 h-5 text-violet-400" />}
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {lang === 'ar' ? item.nameAr : item.nameEn}
                      </h3>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>by {item.author}</span>
                        <span>•</span>
                        <span className="font-mono">v{item.version}</span>
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'ar' ? item.descriptionAr : item.descriptionEn}
                </p>

                {/* Capabilities Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(item.capabilities || []).map((cap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

              </div>

              {/* Footer: Rating & Install Action */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{item.rating}</span>
                  <span className="text-[10px] text-slate-500">({item.reviewsCount})</span>
                </div>

                <button
                  onClick={() => handleToggleInstall(item)}
                  disabled={isProcessing}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    item.isInstalled
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-sm'
                  }`}
                >
                  {isProcessing ? (
                    <span>...</span>
                  ) : item.isInstalled ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'مفعّل ومثبّت' : 'Installed'}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'تثبيت بنقرة واحدة' : 'Install'}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

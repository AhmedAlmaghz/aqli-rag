import React from 'react';
import { Language } from '../../types';
import pkg from '../../../package.json';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80 text-slate-400 py-6 px-4 sm:px-6 lg:px-8 mt-auto transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Side: Brand */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="font-bold text-slate-200">Aqli RAG Platform</span>
          <span className="text-xs text-indigo-400 font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
            v{pkg.version}
          </span>
        </div>

        {/* Center/Right: Powered by text */}
        <div className="text-xs text-slate-400 font-medium">
          Powered by <span className="font-bold text-slate-200 hover:text-indigo-400 transition-colors">Ahmed Almaghz</span> - 2026
        </div>

      </div>
    </footer>
  );
};

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './views/HomePage';
import { ChatPage } from './views/ChatPage';
import { KnowledgeBasePage } from './views/KnowledgeBasePage';
import { AgentStudioPage } from './views/AgentStudioPage';
import { MarketplacePage } from './views/MarketplacePage';
import { McpHubPage } from './views/McpHubPage';
import { SdlcPage } from './views/SdlcPage';
import { DashboardPage } from './views/DashboardPage';
import { SettingsPage } from './views/SettingsPage';
import { Language, Workspace, RagMode } from './types';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';

const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-enterprise-legal',
  nameAr: 'مساحة العمل المؤسسية (Aqli Legal & Compliance)',
  nameEn: 'Aqli Enterprise Legal & Cyber Compliance',
  tenantKey: 'saudi-legal-corp',
  encryptionKeyId: 'kms-key-ecc-saudi-01',
  storageQuotaMb: 10240,
  usedStorageMb: 124,
  storageUsedMb: 124,
  documentsCount: 4,
  vectorsCount: 5,
  defaultMode: 'strict',
  createdAt: new Date().toISOString(),
};

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [currentMode, setCurrentMode] = useState<RagMode>('strict');

  useEffect(() => {
    localStorage.setItem('aqli_theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  const toggleTheme = () => {};

  useEffect(() => {
    fetch('/api/workspaces')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const ws = {
            ...DEFAULT_WORKSPACE,
            ...data[0],
            defaultMode: data[0].defaultMode || 'strict',
          };
          setCurrentWorkspace(ws);
          setCurrentMode(ws.defaultMode);
        }
      })
      .catch(err => console.error('Failed to load initial workspace:', err));
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <div 
          dir={lang === 'ar' ? 'rtl' : 'ltr'} 
          className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-200 ${
            lang === 'ar' ? 'font-arabic' : ''
          } ${theme}`}
        >
          
          {/* Top Navbar */}
          <Navbar 
            lang={lang} 
            setLang={setLang}
            theme={theme}
            onToggleTheme={toggleTheme}
            currentWorkspace={currentWorkspace}
            setCurrentWorkspace={setCurrentWorkspace}
            currentMode={currentMode}
            setCurrentMode={setCurrentMode}
          />

          {/* Authentication Modal */}
          <AuthModal language={lang} />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route 
                path="/" 
                element={
                  <HomePage 
                    lang={lang} 
                    currentWorkspace={currentWorkspace} 
                    currentMode={currentMode} 
                    setCurrentMode={setCurrentMode} 
                  />
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ChatPage 
                    lang={lang} 
                    currentWorkspace={currentWorkspace} 
                    currentMode={currentMode} 
                    setCurrentMode={setCurrentMode} 
                  />
                } 
              />
              <Route 
                path="/chat/:id" 
                element={
                  <ChatPage 
                    lang={lang} 
                    currentWorkspace={currentWorkspace} 
                    currentMode={currentMode} 
                    setCurrentMode={setCurrentMode} 
                  />
                } 
              />
              <Route 
                path="/knowledge-base" 
                element={
                  <KnowledgeBasePage 
                    lang={lang} 
                    currentWorkspace={currentWorkspace} 
                  />
                } 
              />
              <Route 
                path="/agents" 
                element={
                  <AgentStudioPage 
                    lang={lang} 
                  />
                } 
              />
              <Route 
                path="/marketplace" 
                element={
                  <MarketplacePage 
                    lang={lang} 
                  />
                } 
              />
              <Route 
                path="/mcp" 
                element={
                  <McpHubPage 
                    lang={lang} 
                  />
                } 
              />
              <Route 
                path="/sdlc" 
                element={
                  <SdlcPage 
                    lang={lang} 
                  />
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <DashboardPage 
                    lang={lang} 
                    currentWorkspace={currentWorkspace} 
                  />
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <SettingsPage 
                    lang={lang} 
                    setLang={setLang} 
                    currentWorkspace={currentWorkspace} 
                  />
                } 
              />
            </Routes>
          </main>

          {/* Global Footer */}
          <Footer lang={lang} />

        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Server, 
  Terminal, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Play, 
  RefreshCw,
  Clock,
  Sliders,
  Radio,
  Sparkles,
  Zap,
  Code
} from 'lucide-react';
import { Language, McpServerConnection, ToolApprovalRequest } from '../types';

interface McpHubPageProps {
  lang: Language;
}

export const McpHubPage: React.FC<McpHubPageProps> = ({ lang }) => {
  const [connections, setConnections] = useState<McpServerConnection[]>([]);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [rpcLogs, setRpcLogs] = useState<any[]>([]);
  const [approvalsQueue, setApprovalsQueue] = useState<ToolApprovalRequest[]>([]);

  // Live Tool Execution State
  const [selectedTool, setSelectedTool] = useState('vector_search_rag');
  const [toolQuery, setToolQuery] = useState('الضوابط الأساسية للأمن السيبراني');
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);

  // Sync servers, logs, and approvals from PostgreSQL
  useEffect(() => {
    fetchServers();
    fetchRpcLogs();
    fetchApprovals();

    const interval = setInterval(() => {
      fetchRpcLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/mcp/servers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setConnections(data);
      }
    } catch (err) {
      console.error('Failed to fetch MCP servers:', err);
    }
  };

  const fetchRpcLogs = async () => {
    try {
      const res = await fetch('/api/mcp/rpc-logs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setRpcLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch RPC logs:', err);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/mcp/approvals');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped: ToolApprovalRequest[] = data.map((a: any) => ({
            id: a.id,
            toolName: a.toolName,
            mcpServer: a.serverId || 'postgres-internal',
            parameters: a.parameters || {},
            riskLevel: 'high',
            requestedAt: new Date(a.createdAt).toLocaleTimeString(),
            status: a.status || 'pending',
            reasonAr: `طلب تنفيذ الأداة: ${a.toolName}`,
            reasonEn: `Execution request for tool: ${a.toolName}`,
          }));
          setApprovalsQueue(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    }
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText('http://localhost:3000/api/mcp/sse');
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleResolveApproval = async (id: string, status: 'approved' | 'rejected') => {
    setApprovalsQueue((prev) =>
      prev.map((appr) => (appr.id === id ? { ...appr, status } : appr))
    );

    try {
      await fetch('/api/tools/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: id,
          status,
          approvedBy: 'Security Compliance Officer',
          workspaceId: 'ws-enterprise-legal',
        }),
      });
      fetchApprovals();
      fetchRpcLogs();
    } catch (err) {
      console.error('Failed to submit approval:', err);
    }
  };

  const handleExecuteLiveTool = async () => {
    setIsExecutingTool(true);
    setExecResult(null);
    try {
      const res = await fetch('/api/mcp/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: selectedTool,
          parameters: selectedTool === 'arabic_lemmatize_nlp' ? { text: toolQuery } : { query: toolQuery },
          workspaceId: 'ws-enterprise-legal',
        }),
      });
      const data = await res.json();
      setExecResult(data);
      fetchRpcLogs();
    } catch (err: any) {
      setExecResult({ error: err.message });
    } finally {
      setIsExecutingTool(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Network className="w-4 h-4" />
            <span>{lang === 'ar' ? 'مركز بروتوكول سياق النماذج MCP' : 'Model Context Protocol (MCP v1.2) Hub'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'ar' ? 'إدارة اتصالات MCP والموافقات الأمنية' : 'MCP Hub & Human-in-the-Loop Approvals'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'تكامل ثنائي الاتجاه: خادم MCP داخلي لربط IDEs و Claude Desktop، وعميل MCP لأدوات السحابة'
              : 'Bi-directional MCP: Inbound server for Claude Desktop/IDEs, and outbound client for cloud tools'}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold font-mono">
          <Activity className="w-4 h-4" />
          <span>MCP Transport: SSE / Stream Active</span>
        </div>
      </div>

      {/* Top Split: Inbound MCP Server Card & Outbound Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Inbound Server Endpoint (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-sm text-white">
                {lang === 'ar' ? 'خادم Aqli MCP الداخلي (Inbound)' : 'Internal Aqli MCP Server (Inbound)'}
              </h2>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
              Port 3000
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {lang === 'ar'
              ? 'انسخ هذا الرابط لربط Claude Desktop أو Cursor أو أي عميل MCP خارجي بقاعدة معرفتك مباشرة مع تطبيق عزل RLS.'
              : 'Connect external tools like Claude Desktop or Cursor to your private knowledge base securely with RLS.'}
          </p>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[10px] text-slate-500 font-mono">SSE Endpoint URL:</div>
            <div className="flex items-center justify-between gap-2 text-xs font-mono text-cyan-300">
              <span className="truncate">http://localhost:3000/api/mcp/sse</span>
              <button
                onClick={handleCopyEndpoint}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="نسخ الرابط"
              >
                {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1.5">
            <div className="text-slate-300 font-bold">Exposed Capabilities:</div>
            <div>• Tools: <span className="text-indigo-400">`search_knowledge_base`, `execute_rag_query`</span></div>
            <div>• Resources: <span className="text-cyan-400">`workspace://documents`, `workspace://chunks`</span></div>
            <div>• Auth: <span className="text-emerald-400">Bearer Tenant Token (RLS Isolated)</span></div>
          </div>
        </div>

        {/* Outbound MCP Connections (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'الاتصالات الخارجية المسجلة في قاعدة البيانات' : 'Registered MCP Clients (Database)'}</span>
            </h2>
            <span className="text-xs text-slate-400">
              {connections.length} {lang === 'ar' ? 'خوادم نشطة' : 'active servers'}
            </span>
          </div>

          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {lang === 'ar' ? conn.displayNameAr : conn.displayNameEn}
                      </h3>
                      <div className="text-[10px] text-slate-400 font-mono">{conn.endpointUrl}</div>
                    </div>
                  </div>

                  <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {conn.lastPingMs || 15}ms ping
                  </span>
                </div>

                {/* Tools Grid */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400">
                    {lang === 'ar' ? 'الأدوات المسجلة (Registered Tools):' : 'Registered Tools:'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(conn.tools || []).map((tool, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-cyan-300 font-bold">
                          <span>{tool.name}</span>
                          {tool.requiresApproval && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Approval
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{tool.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Interactive MCP Live Tool Execution Console */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-base text-white">
              {lang === 'ar' ? 'وحدة اختبار وتجربة أدوات MCP الحية (Live RPC Console)' : 'Interactive MCP Tool Execution Console'}
            </h2>
          </div>
          <span className="text-xs text-cyan-400 font-mono">JSON-RPC 2.0 Client</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {lang === 'ar' ? 'اختر أداة MCP للتنفيذ:' : 'Select Tool to Execute:'}
            </label>
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="vector_search_rag">vector_search_rag (Hybrid Search)</option>
              <option value="arabic_lemmatize_nlp">arabic_lemmatize_nlp (NLP Analysis)</option>
              <option value="reindex_workspace_vectors">reindex_workspace_vectors (Re-Index)</option>
              <option value="sdlc_security_scan">sdlc_security_scan (Security RLS)</option>
            </select>
          </div>

          <div className="md:col-span-6 space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {lang === 'ar' ? 'معاملات الأداة (Parameters):' : 'Tool Parameters (Input / Query):'}
            </label>
            <input
              type="text"
              value={toolQuery}
              onChange={(e) => setToolQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل نص الاستعلام أو المحتوى للتحليل...' : 'Enter query text or parameters...'}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={handleExecuteLiveTool}
              disabled={isExecutingTool}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-600/30"
            >
              {isExecutingTool ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{lang === 'ar' ? 'تنفيذ مباشر' : 'Execute RPC'}</span>
            </button>
          </div>
        </div>

        {execResult && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Response (Latency: {execResult.latencyMs || 0}ms)</span>
              </span>
              <span className="text-slate-500">JSON-RPC 2.0</span>
            </div>
            <pre className="p-3 rounded-xl bg-slate-900 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48 border border-slate-800">
              {JSON.stringify(execResult.result || execResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Human-in-the-Loop Tool Approvals Queue */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base text-white">
              {lang === 'ar' ? 'طابور الموافقات الأمنية البشرية (Human-in-the-Loop Queue)' : 'Human-in-the-Loop Approval Queue'}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {approvalsQueue.filter((a) => a.status === 'pending').length} pending
          </span>
        </div>

        {approvalsQueue.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {lang === 'ar' ? 'لا توجد طلبات موافقة معلقة حالياً في قاعدة البيانات.' : 'No pending tool approvals in database.'}
          </div>
        ) : (
          <div className="space-y-3">
            {approvalsQueue.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{req.toolName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">via {req.mcpServer}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono uppercase font-bold">
                      {req.riskLevel} risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {lang === 'ar' ? req.reasonAr : req.reasonEn}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleResolveApproval(req.id, 'rejected')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold cursor-pointer"
                      >
                        {lang === 'ar' ? 'رفض' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleResolveApproval(req.id, 'approved')}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-sm"
                      >
                        {lang === 'ar' ? 'موافقة وتنفيذ' : 'Approve'}
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs font-bold font-mono ${
                      req.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {req.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live RPC Log Stream */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">
              {lang === 'ar' ? 'سجل استدعاءات MCP المباشر (Database Live Telemetry)' : 'Live MCP RPC Telemetry Stream'}
            </h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Database Synced
          </span>
        </div>

        {rpcLogs.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            {lang === 'ar' ? 'لا توجد استدعاءات مسجلة بعد. استخدم وحدة الاختبار بالأعلى لتنفيذ أدوات MCP.' : 'No RPC logs recorded yet. Use the console above to execute tools.'}
          </div>
        ) : (
          <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto">
            {rpcLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  <span className="text-cyan-400 font-bold">{log.toolName}</span>
                  <span className="text-slate-400">({log.serverId || 'local'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">{log.latencyMs}ms</span>
                  <span className="text-emerald-400 font-bold">{log.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

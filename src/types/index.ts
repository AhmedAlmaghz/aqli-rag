export type Language = 'ar' | 'en';

export type RagMode = 'strict' | 'augmented' | 'open';

export interface Workspace {
  id: string;
  nameAr: string;
  nameEn: string;
  tenantKey: string;
  encryptionKeyId: string;
  storageQuotaMb: number;
  usedStorageMb: number;
  storageUsedMb?: number;
  documentsCount: number;
  vectorsCount: number;
  defaultMode: RagMode;
  createdAt: string;
}

export type RagEvaluationMetric = RagEvalMetric;

export type SourceType = 
  | 'local_file'
  | 'youtube'
  | 'pdf' 
  | 'docx' 
  | 'xlsx' 
  | 'csv' 
  | 'json' 
  | 'markdown' 
  | 'web' 
  | 'sitemap' 
  | 'connector' 
  | 'database' 
  | 'api_feed' 
  | 'rss' 
  | 'audio_transcript' 
  | 'ocr_scan';

export type ChunkingStrategy = 
  | 'semantic' 
  | 'sliding_window' 
  | 'hierarchical' 
  | 'markdown_header' 
  | 'tabular_row'
  | 'video_timestamp';

export type DocumentCategory = 
  | 'policy'
  | 'technical'
  | 'general'
  | 'legal'
  | 'financial'
  | 'operations'
  | 'regulatory'
  | 'cybersecurity'
  | string;

export interface DocumentSource {
  id: string;
  workspaceId: string;
  titleAr: string;
  titleEn: string;
  type: SourceType;
  category: DocumentCategory;
  sizeBytes: number;
  chunksCount: number;
  status: 'indexed' | 'indexing' | 'failed' | 'queued' | 'syncing';
  language: 'ar' | 'en' | 'mixed';
  source?: string;
  uploadDate?: string;
  uploadedAt?: string;
  createdAt?: string;
  lastSyncedAt: string;
  descriptionAr: string;
  descriptionEn: string;
  connectorName?: string;
  provenanceUrl?: string;
  sourceUrl?: string;
  sqlQuery?: string;
  youtubeVideoId?: string;
  thumbnailUrl?: string;
  videoDurationSeconds?: number;
  fileName?: string;
  fileMimeType?: string;
  chunkingStrategy?: ChunkingStrategy;
  refreshIntervalHours?: number;
  authorOrOrg?: string;
  classificationLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
  nlpMetadata?: {
    category: string;
    categoryLabelAr: string;
    categoryLabelEn: string;
    confidence: number;
    detectedLanguage: 'ar' | 'en' | 'mixed';
    languageLabelAr: string;
    languageLabelEn: string;
    arabicRatio?: number;
    keywords?: string[];
    summaryTopicAr?: string;
    summaryTopicEn?: string;
  };
  metadata?: Record<string, any>;
}

export interface DocumentChunk {
  id: string;
  sourceId: string;
  sourceTitleAr: string;
  sourceTitleEn: string;
  contentAr: string;
  contentEn?: string;
  chunkIndex: number;
  tokensCount: number;
  denseVectorDim: number; // e.g. 3072 for Gemini Embedding 2
  denseScore?: number;
  sparseScore?: number;
  hybridScore?: number;
  rrfScore?: number;
  chunkingStrategy?: ChunkingStrategy;
  parentChunkId?: string;
  metadata: {
    pageNumber?: number;
    sectionHeader?: string;
    isTable?: boolean;
    tags: string[];
    sourceType?: SourceType;
    sourceUrl?: string;
    rowNumber?: number;
    speaker?: string;
    timestamp?: string;
    youtubeTimestamp?: string;
    youtubeVideoId?: string;
    youtubeSeconds?: number;
    fileName?: string;
  };
}

export interface Citation {
  id: string;
  chunkId: string;
  sourceTitle: string;
  snippet: string;
  similarityScore: number;
  pageNumber?: number;
  sectionHeader?: string;
  isWebSource?: boolean;
  webUrl?: string;
  youtubeTimestamp?: string;
  youtubeVideoId?: string;
  youtubeSeconds?: number;
}

export interface ToolApprovalRequest {
  id: string;
  toolName: string;
  mcpServer: string;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reasonAr: string;
  reasonEn: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  ragMode: RagMode;
  agentId?: string;
  agentName?: string;
  citations?: Citation[];
  groundednessScore?: number;
  isRefusal?: boolean;
  isFallback?: boolean;
  toolCalls?: {
    id: string;
    toolName: string;
    serverName: string;
    args: Record<string, any>;
    result?: string;
    status: 'running' | 'completed' | 'failed' | 'needs_approval';
  }[];
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  feedback?: 'like' | 'dislike' | null;
  latencyMs?: number;
}

export interface AgentConfig {
  id: string;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  systemPromptAr: string;
  systemPromptEn: string;
  model: 'gemini-3.7-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.6-flash' | 'gemini-3.5-flash-lite' | 'gemini-2.5-flash' | 'claude-3-5-sonnet' | 'gpt-4o';
  temperature: number;
  defaultMode: RagMode;
  scopedSourceIds: string[]; // empty means all workspace sources
  attachedToolIds: string[];
  attachedMcpServerIds: string[];
  icon: string;
  isPreset: boolean;
  avatarBg: string;
}

export interface MarketplaceItem {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'connector' | 'mcp_server' | 'agent_template' | 'skill';
  category: 'cloud' | 'enterprise' | 'developer' | 'productivity' | 'security';
  descriptionAr: string;
  descriptionEn: string;
  author: string;
  version: string;
  rating: number;
  reviewsCount: number;
  isInstalled: boolean;
  iconName: string;
  badge?: string;
  capabilities: string[];
  configurationParams?: {
    key: string;
    labelAr: string;
    labelEn: string;
    type: 'string' | 'secret' | 'select' | 'boolean';
    required: boolean;
    defaultValue?: any;
    options?: string[];
  }[];
}

export interface McpServerConnection {
  id: string;
  name: string;
  displayNameAr: string;
  displayNameEn: string;
  endpointUrl: string;
  transport: 'sse' | 'stdio' | 'websocket';
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  registeredToolsCount: number;
  registeredResourcesCount: number;
  registeredPromptsCount: number;
  lastPingMs: number;
  tools: {
    name: string;
    description: string;
    requiresApproval: boolean;
    executionCount: number;
  }[];
}

export interface RagEvalMetric {
  id: string;
  nameAr: string;
  nameEn: string;
  score: number; // 0 - 100
  targetScore: number;
  status: 'passed' | 'warning' | 'failed';
  descriptionAr: string;
  descriptionEn: string;
  lastEvaluatedAt: string;
  trend: 'up' | 'down' | 'neutral';
  evalMethod: 'LLM-as-a-Judge' | 'Deterministic' | 'Semantic-Cosine' | 'BLEU-ROUGE';
}

export interface SDLCSection {
  id: string;
  number: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  icon: string;
  files: {
    path: string;
    nameAr: string;
    nameEn: string;
    purposeAr: string;
    purposeEn: string;
  }[];
  keyPrinciplesAr: string[];
  keyPrinciplesEn: string[];
}

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'auditor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  workspaceId: string;
  provider: 'database' | 'ldap' | 'saml' | 'oauth';
  status: 'active' | 'suspended' | 'pending';
  lastLoginAt?: string;
  createdAt?: string;
}

export interface AuthProviderInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'database' | 'ldap' | 'saml' | 'oauth';
  isDefault: boolean;
  status: 'active' | 'configured' | 'disabled';
  descriptionAr: string;
  descriptionEn: string;
  icon: string;
}

export type DbErrorCategory =
  | 'NONE'
  | 'CREDENTIAL_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_NOT_FOUND'
  | 'SSL_ERROR'
  | 'SCHEMA_ERROR'
  | 'UNCONFIGURED';

export interface DatabaseDiagnosticDetail {
  category: DbErrorCategory;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  technicalCode?: string;
  suggestedActionAr: string;
  suggestedActionEn: string;
  maskedHost?: string;
}

export interface DatabaseStatus {
  connected: boolean;
  type: 'PostgreSQL' | 'In-Memory (Fallback)';
  urlMasked?: string;
  targetEnvVar?: 'POSTGRES_URL' | 'DATABASE_URL' | 'CUSTOM' | 'NONE';
  configuredUrlPresent: boolean;
  databaseName?: string;
  serverVersion?: string;
  pgvectorSupported: boolean;
  pgTrgmSupported: boolean;
  rlsEnforced: boolean;
  defaultAuthProvider?: 'database';
  latencyMs?: number;
  tables: {
    sourcesCount: number;
    chunksCount: number;
    agentsCount: number;
    conversationsCount: number;
    auditLogsCount: number;
    usersCount?: number;
  };
  lastChecked: string;
  error?: string;
  diagnostic?: DatabaseDiagnosticDetail;
}

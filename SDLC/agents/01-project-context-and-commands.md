# Project Context and Commands

## 1. نظرة عامة على المنصة

منصة **Aqli RAG** هي نظام استرجاع وتوليد هجين (Hybrid RAG) ثنائي اللغة (عربي/إنجليزي) بمعمارية Multi-Tenant وSaaS-Ready. تعمل كل مساحة عمل (Workspace) بثلاثة أوضاع قابلة للتبديل لحظيًا: **Strict** (مقيّد بالمصادر)، **Augmented** (هجين مع الويب)، و**Open** (وكيل حر مع MCP خارجية). العزل بين المستأجرين يتم على مستوى صفوف قاعدة البيانات (Row-Level Security) مع تخزين كائنات منفصل لكل مساحة وتشفير أسرار عبر `pgcrypto` أو KMS خارجي.

التطبيق يبني وكلاء ذكاء اصطناعي مخصصين، يدير خط أنابيب معالجة مستندات غير متزامن، ويوفر سوقًا (Marketplace) للموصلات وخوادم MCP والأدوات. كل ذلك مبني على Next.js 16.2 و AI SDK 7 ومجموعة امتدادات PostgreSQL.

---

## 2. المكدس التقني المرجعي

| الطبقة | التقنية | الإصدار / الملاحظة |
|---|---|---|
| إطار العمل | Next.js (App Router) | 16.2 — Turbopack مستقر، تحسينات الوكلاء |
| واجهة المستخدم | React | 19.2 — View Transitions, Activity API, useEffectEvent |
| لغة | TypeScript | strict + `noUncheckedIndexedAccess` إلزامي |
| ذكاء اصطناعي | Vercel AI SDK | 7 — WorkflowAgent, Tool Approvals, MCP Apps, Skills |
| تنسيق | Tailwind CSS + shadcn/ui + Radix | v4 — دعم RTL/LTR ديناميكي |
| حالة العميل | Zustand + TanStack Query | v5 |
| تدويل | next-intl | تبديل اتجاه الكتابة حسب لغة المحتوى |
| تضمين | `gemini-embedding-2` | 3072 بُعدًا، متعدد الوسائط، 100+ لغة |
| استدلال — رئيسي | `gemini-3.6-flash` | الوكيل الرئيسي، استدلال متعدد الخطوات |
| استدلال — مساعد | `gemini-3.5-flash-lite` | إعادة صياغة، ريرانك، تلخيص، استخراج |
| قاعدة بيانات | PostgreSQL + `pgvector` + `pg_trgm` + `pgcrypto` | عبر Supabase / Neon / RDS / Self-hosted |
| تخزين كائنات | S3-compatible | AWS S3, R2, Supabase Storage, GCS |
| مصادقة | Provider Adapter | Auth.js / Clerk / Supabase Auth / WorkOS |
| مراقبة | OpenTelemetry via `@ai-sdk/otel` | تتبع خطوات الاستدلال + `pg_stat_statements` |
| اختبار | Vitest + Playwright | RAG Eval Harness منفصل عن اختبارات التكامل |
| Monorepo | Turborepo | حزم: `ui`, `db`, `ai-providers`, `mcp`, `connectors` |

**مبدأ التوجيه للمزودين (Routing Economics):** المهام الحتمية والبسيطة (تنظيف نص، كشف لغة، تقسيم، فحص حدود) تُوجَّه إلى دوال محلية أو نموذج صغير (`flash-lite`). المهام المعقدة (استدلال متعدد خطوات، توليد إجابة، تقييم جودة الاسترجاع) تُوجَّه إلى النموذج الرئيسي (`3.6-flash`).

---

## 3. خريطة المستودع (Repository Map)

بنية Turborepo Monorepo تفصل الحزم حسب المجال. على الوكلاء الالتزام بهذه الحدود عند التعديل.

```mermaid
graph TD
    A[apps/web — Next.js 16.2] --> B[packages/ui]
    A --> C[packages/db]
    A --> D[packages/ai-providers]
    A --> E[packages/mcp]
    A --> F[packages/connectors]
    A --> G[packages/eval]
    C --> H[(PostgreSQL + pgvector)]
    D --> I[Gemini / OpenAI / Anthropic / Mistral]
    E --> J[MCP Server (داخلي)]
    E --> K[MCP Client — خوادم خارجية]
    F --> L[Mistral Document AI / Unstructured]
    F --> M[S3-compatible Storage]
    G --> N[RAG Eval Harness]
```

| المسار | الدور | حدود التعديل للوكلاء |
|---|---|---|
| `apps/web/app/` | صفحات App Router كما في القسم 9 من التصميم | لا تنشئ صفحات خارج الجدول المعتمد |
| `apps/web/app/api/chat/` | نقاط نهاية البث (Streaming) لـ `useChat`/`Agent` | تعديل يلزم مراجعة طبقة `ai-providers` |
| `packages/db/` | **Schema، Migrations، RLS Policies، دوال Hybrid Search بـ `plpgsql`** | أي تعديل على الجداول إلزامي صيانة RLS + Migration |
| `packages/ai-providers/` | **Provider Adapter / Registry** — يوحّد الوصول إلى كل المزودين عبر واجهة واحدة | لا تكتب أغلفة خاصة بمزود في `apps/web`؛ كلها هنا |
| `packages/mcp/` | خادم MCP الداخلي + عميل MCP متعدد | الأدوات الجديدة تُسجَّل في `tools/registry.ts` |
| `packages/connectors/` | موصلات مصادر البيانات (PDF, Web, Drive, Slack, …) | كل موصل يطبّق واجهة `Connector` القياسية |
| `packages/eval/` | RAG Eval Harness — فحوصات جودة الاسترجاع والإجابة | يُستدعى في CI قبل كل نشر |
| `packages/ui/` | مكوّنات مشتركة (`ChatComposer`, `CitationCard`, `SourceStatusBadge`, `ProviderSwitcher`, `ThemeProvider`) | امتثل لـ shadcn/ui و Radix Primitives |

---

## 4. متغيرات البيئة الأساسية

متغيرات البيئة تُقسم إلى مجموعات. كل مجموعة يمكن أن تُدار عبر Vercel Secrets أو Doppler أو Vault خارجي.

### 4.1 الذكاء الاصطناعي والاستدلال

| المتغير | الغرض | ملاحظات |
|---|---|---|
| `GEMINI_API_KEY` | مفتاح Google Gemini الافتراضي | يُخزَّن مشفّرًا؛ لا يُمرَّر للواجهة |
| `AI_PROVIDER` | المزود الافتراضي عند بدء مساحة عمل جديدة | `gemini` (افتراضي) / `openai` / `anthropic` / `mistral` / `groq` |
| `EMBEDDING_PROVIDER` | مزود التضمين | `gemini-embedding-2` افتراضيًا |
| `EMBEDDING_DIM` | أبعاد المتجهات | `3072` — التبديل يتطلب إعادة فهرسة |
| `LLM_MASTER_MODEL` | النموذج الرئيسي للوكلاء | `gemini-3.6-flash` |
| `LLM_EXEC_MODEL` | نموذج التنفيذ السريع | `gemini-3.5-flash-lite` |

### 4.2 قاعدة البيانات والتخزين

| المتغير | الغرض | ملاحظات |
|---|---|---|
| `DATABASE_URL` | سلسلة اتصال PostgreSQL | يجب أن تدعم `pgvector` و`pg_trgm` |
| `DATABASE_POOL_MAX` | أقصى عدد اتصالات في التجمع | افتراضي `20` |
| `S3_ENDPOINT` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | تخزين كائنات متوافق مع S3 | دلو (Bucket) منفصل لكل Workspace عبر Prefix |
| `KMS_KEY_ID` | معرّف مفتاح التشفير خارجي (اختياري) | يستبدل `pgcrypto` عند الحاجة |

### 4.3 المصادقة والامتثال

| المتغير | الغرض | ملاحظات |
|---|---|---|
| `AUTH_PROVIDER` | `authjs` / `clerk` / `supabase` / `workos` | يوجّه الـ Provider Adapter |
| `AUTH_SECRET` | سر NextAuth | إلزامي عند اختيار `authjs` |
| `ENCRYPTION_KEY` | مفتاح تشفير الحقول الحساسة على مستوى العمود | مستخدم في `pgcrypto` |
| `AUDIT_LOG_ENABLED` | تفعيل سجل التدقيق | `true` افتراضيًا |

### 4.4 خط أنابيب المعالجة

| المتغير | الغرض | ملاحظات |
|---|---|---|
| `DOC_PROCESSOR` | `mistral` / `unstructured` | مزود استخلاص المستندات |
| `CHUNK_SIZE` | حجم المقطع الافتراضي | `512` رمز (Token) |
| `CHUNK_OVERLAP` | تداخل المقاطع | `64` رمز |
| `CHUNK_STRATEGY` | `semantic` / `structural` / `table-aware` | `semantic` افتراضيًا |
| `INGESTION_CONCURRENCY` | عدد مهام الفهرسة المتوازية | `5` افتراضيًا |
| `WORKFLOW_TIMEOUT_MS` | مهلة WorkflowAgent | `120000` (دقيقتان) |

---

## 5. الأوامر التشغيلية (Operational Commands)

كل الأوامر تُنفَّذ من جذر الـ Monorepo ما لم يُذكر خلاف ذلك. على الوكلاء استخدام هذه الأوامر بالضبط دون اختصار.

### 5.1 التثبيت والتشغيل

| الأمر | الغرض | ملاحظات |
|---|---|---|
| `pnpm install` | تثبيت الاعتمادات | يقرأ `pnpm-workspace.yaml` و`turbo.json` |
| `pnpm dev` | تشغيل بيئة التطوير عبر Turborepo | يشغّل `apps/web` على المنفذ `3000` |
| `pnpm build` | بناء الإنتاج | يُفعّل Turbopack ويُنشئ حزم الإنتاج |
| `pnpm start` | تشغيل بناء الإنتاج | للتحقق قبل النشر |

### 5.2 قاعدة البيانات

| الأمر | الغرض | الحزمة الهدف |
|---|---|---|
| `pnpm db:generate` | توليد أنواع Drizzle / Prisma من المخطط | `packages/db` |
| `pnpm db:migrate` | تنفيذ التهجرات | `packages/db` |
| `pnpm db:seed` | بيانات أولية (مزودون، سوق افتراضي) | `packages/db` |
| `pnpm db:rls:check` | التحقق من تطبيق RLS على كل جدول | `packages/db` — يفشل إذا وجد جدولًا بلا RLS |
| `pnpm db:extensions:check` | التحقق من تفعيل `pgvector`, `pg_trgm`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements` | يفشل إذا نقص امتداد |

### 5.3 الاختبار والفحص

| الأمر | الغرض | الحزمة الهدف |
|---|---|---|
| `pnpm typecheck` | فحص TypeScript الصارم عبر كل الحزم | كل الحزم |
| `pnpm lint` | ESLint + Prettier عبر كل الحزم | كل الحزم |
| `pnpm test` | اختبارات الوحدة (Vitest) | كل الحزم |
| `pnpm test:integration` | اختبارات تكامل خط أنابيب RAG | `packages/eval` |
| `pnpm test:eval` | RAG Eval Harness — تقييم جودة الاسترجاع عبر robbed rubric | `packages/eval` |
| `pnpm test:e2e` | اختبارات Playwright للواجهة ثنائية اللغة | `apps/web` |
| `pnpm test:e2e:rtl` | Playwright مع فرض RTL | يتحقق من الاتجاه والترتيب |
| `pnpm test:e2e:ltr` | Playwright مع فرض LTR | — |

### 5.4 الذكاء الاصطناعي و MCP

| الأمر | الغرض | الحزمة الهدف |
|---|---|---|
| `pnpm ai:generate:agent` | توليد قالب وكيل جديد (Agent Template) | `packages/ai-providers` |
| `pnpm mcp:server:start` | تشغيل خادم MCP الداخلي | `packages/mcp` — للربط مع Claude Desktop |
| `pnpm mcp:client:list` | سرد خوادم MCP الخارجية المسجّلة | `packages/mcp` |
| `pnpm mcp:permissions:audit` | تدقيق صلاحيات MCP الخارجية + سجل الاستدعاءات | `packages/mcp` |

---

## 6. خريطة المسارات في الواجهة

على الوكلاء الالتزام بهذه المسارات ولا يقترحون صفحات خارجها:

| المسار | الصفحة | ملاحظات |
|---|---|---|
| `/` | تعريفية + تسجيل الدخول | — |
| `/onboarding` | إعداد المساحة واختيار المزودين | خطوات متعددة (Wizard) |
| `/dashboard` | نظرة عامة | المصادر، الاستخدام، النشاط |
| `/sources` | إدارة المصادر | قائمة، حالة الفهرسة، مجلدات/وسوم |
| `/sources/[id]` | تفاصيل مصدر | معاينة المقاطع، إعادة معالجة |
| `/knowledge-base` | بحث دلالي مباشر | استكشاف داخل قاعدة المعرفة |
| `/chat` | واجهة الدردشة الرئيسية | بث الاستجابة |
| `/chat/[conversationId]` | محادثة محددة | سجل وسياق |
| `/agents` | إدارة/إنشاء الوكلاء | — |
| `/agents/[id]/build` | منشئ الوكيل | تعليمات، أدوات، MCP، نطاق |
| `/marketplace` | تصفح السوق | موصلات، وكلاء، أدوات، MCP |
| `/marketplace/[itemId]` | تفاصيل عنصر + تثبيت | — |
| `/mcp` | إدارة اتصالات MCP | داخلية وخارجية + صلاحيات |
| `/settings/* | الإعدادات | `providers`, `security`, `team`, `usage-billing` |
| `/admin` | لوحة مؤسسية | Multi-tenant oversight |

---

## 7. سياق هندسة الوكلاء (Context Engineering للمنصة)

يحدد هذا الفصل الحدود بين **السياق الثابت** (ما يُكتب في ملفات التعليمات) و**السياق الديناميكي** (ما يُحقن وقت التشغيل).

### 7.1 سياق ثابت (Static Context)

يُبنى في بداية كل مهمة ويُسحب من ملفات محددة لا يتعداها الوكيل:

| النوع | المصدر | نطاق القراءة |
|---|---|---|
| تعليمات | هذا الملف + الأقسام التالية في `AGENTS.md` | كامل |
| معرفة المجال | `packages/eval/docs/rag-architecture.md`, `docs/arabic-linguistics.md` | قراءة للمرجع |
| أمثلة أنماط | `packages/ai-providers/examples/` | للوكلاء الكاتبين للكود في `ai-providers` |
| حواجس | `packages/db/guardrails/rls-requirements.md`, `docs/security/audit-schema.md` | إلزامية للمهام التي تلامس قاعدة البيانات |

### 7.2 سياق ديناميكي (Dynamic Context)

يُحقن وقت التشغيل ولا يُكتب كنص ثابت في الـ Harness:

| النوع | المصدر | وقت الحقن |
|---|---|---|
| حالة المحادثة | `messages` array من `useChat` | قبل كل استدعاء نموذج |
| نطاق قاعدة المعرفة | `workspace_id`, `agent.scoped_sources` | قبل بناء استعلام Hybrid Search |
| موافقات الأدوات | `toolApproval` flow من AI SDK 7 | قبل تنفيذ كل أداة |
| حالة الفهرسة | `sources.status` | لعرض `SourceStatusBadge` |
| مفتاح مزود مساحة العمل | `workspace.provider_config` (مشفّر) | يُحقن في Adapter وقت الاستدعاء فقط |

### 7.3 المهارات (Agent Skills عبر Progressive Disclosure)

عند تسجيل مهارة في `packages/ai-providers/skills/`، لا تُمرّر بالكامل إلى النموذج. مرجع واحد فقط (`skillId`) يُمرّر، ثم تحمّل المهارة الكاملة عند الاستدعاء الفعلي (وضع `uploadSkill` في AI SDK 7). هذا يقلل الكثافة ويحافظ على ندرة السياق.

---

## 8. التهديدات الشائعة (80% Problem — ما يفوّته الوكلاء)

هذه قائمة بالغموض والحواف التي يفشل الوكلاء عادة في معالجتها. كل نقطة موثقة هنا لتكون صريحة في العقد مع AI.

### 8.1 عزل المستأجرين

الوكلاء يميلون إلى نسيان RLS عند إضافة جداول جديدة أو دوال `plpgsql`. الحد: قبل دمج أي migration يخص الجداول، يجب بها `R.policy()` (إذا كان ORM يدعم) أو أمر `CREATE POLICY` صريح. أمر `pnpm db:rls:check` يفشل في CI إن نقص.

### 8.2 العربية والتطبيع

الغموض: التطبيع العربي ليس موحّدًا — إزالة التشكيل، توحيد الألف والياء، توحيد الهمزات، وترتيب النص في الـ Trigram Index. الوكلاء يكتبون أحيانًا دوال تطبيع في طبقات مختلفة. الحد: طبقة تطبيع واحدة في `packages/db/normalization/`.

### 8.3 Hybrid Search

الغموض: Hybrid Search في `plpgsql` يجمع BM25 (نصي) + Vector (دلالي) + Trigram (ضبابي). الموازنة بين الأوزان ليست ثابتة — تختلف حسب اللغة ونوع الاستعلام. الحد: قياس الجودة عبر `pnpm test:eval` قبل تعديل الأوزان.

### 8.4 تغيير مزود التضمين

الغموض: إذا غيّر مستخدم مزود التضمين (مثلًا من 3072 بُعد إلى بُعد مختلف)، كل الفهارس القديمة تكون غير صالحة. الوكلاء قد ينسون إعادة بناء الفهرس. الحد: عند التبديل يُطلق حدث `embedding-provider-changed` يقوم مسؤول بقائمة انتظار إعادة الفهرسة لكامل المقاطع في المساحة.

### 8.5 المهلات الزمنية في الوكلاء طويلة الأمد

الغموض: مهام WorkflowAgent قد تتجاوز حد زمن تنفيذ الدالة (Serverless Timeout). الوكلاء قد يكتبون حلقة تنتظر النتيجة في الدالة نفسها. الحد: استخدام Vercel Workflows / Queues أو BullMQ خارج الدالة، وحفظ النتيجة في قاعدة بيانات لا في الذاكرة.

### 8.6 موافقات الأدوات

الغموض: ليست كل استدعاءات الأدوات تحتاج موافقة، فقط الحساسة (كتابة، حذف، استدعاء خارجي مدفوع). الوكلاء قد يطلبون موافقة على كل استدعاء مما يكسر تجربة الدردشة. الحد: جدول `tool_approval_policy` يحدد حساسية كل أداة.

---

## 9. القيود والافتراضات

- **افتراض**: النشر الافتراضي عبر Vercel وظائف Server + Queues. النشر البديل عبر Docker/Kubernetes مدعوم عبر Provider Adapters.
- **افتراض**: قاعدة البيانات الافتراضية Supabase، لكن الاختبارات تعمل ضد أي PostgreSQL يدعم الامتدادات المطلوبة.
- **حد**: لا تجمع مفاتيح API للواجهة الأمامية. تُخزَّن مشفّرة عبر `pgcrypto` على مستوى العمود وتُحقن في الـ Adapter وقت الاستدعاء فقط.
- **حد**: لا تكتب استدعاء مباشر لمزود (Google SDK, OpenAI SDK) في `apps/web`. كل الاستدعاءات تمر عبر `packages/ai-providers`.
- **حد**: لا تكتب صفحات أو مكونات خارج الجدول في القسم 6 وخريطة المكوّنات.
- **حد**: لا تعدّل `packages/eval/` خارج CI إلا لإضافة حالة اختبار جديدة.

---

## 10. جدول قراءة سريع للوكلاء الجدد (Bootstrap Checklist)

عند بدء وكيل جديد في المنصة، قبل أي تعديل، عليه إكمال هذا القائمة:

- [ ] قراءة هذا الملف بالكامل (سياق ثابت)
- [ ] قراءة [Coding Rules and Testing Contract](./02-coding-rules-and-testing-contract.md)
- [ ] قراءة [Workflow, Done Criteria, and Boundaries](./03-workflow-done-criteria-and-boundaries.md)
- [ ] تشغيل `pnpm install && pnpm db:extensions:check` والتأكد من نجاحه
- [ ] تشغيل `pnpm db:rls:check` والتأكد من نجاحه
- [ ] التأكد من أن التعديل المقترح ضمن حزمة معروفة في خريطة المستودع (القسم 3)
- [ ] تحديد ما إذا كانت المهمة تلامس RLS، التطبيع العربي، أو Hybrid Search — واستعراض الوثائق المرجعية المقابلة
- [ ] تحديد نموذج التوجيه: مهمة حتمية → نموذج صغير / `flash-lite` أو دالة محلية؛ مهمة معقدة → `3.6-flash`

---

**القسم التالي:** [Coding Rules and Testing Contract](./02-coding-rules-and-testing-contract.md)
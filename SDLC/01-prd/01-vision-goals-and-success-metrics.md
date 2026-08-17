# Vision, Goals, and Success Metrics

## 1. الرؤية والغرض (Vision & Purpose)

منصة **Aqli RAG** هي نظام استرجاع وتوليد هجين (Hybrid RAG) ثنائي اللغة (عربي/إنجليزي) مبني لمعمارية متعددة المستأجرين (Multi-Tenant) وجاهز للنشر كخدمة سحابية (SaaS-Ready). الغرض الأساسي من المنتج هو تمكين المؤسسات والأفراد من بناء قواعد معرفية خاصة دقيقة الأمان، مع الاستفادة من الذكاء الاصطناعي التوليدي دون المساس بخصوصية البيانات أو سيطرتها.

**المشكلة المُحَلَّة (The Problem Being Solved):**
تعاني أنظمة RAG التقليدية من ثلاث فجوات حرجة:
1. **فجوة العزل والخصوصية:** تفتقر معظم الأنظمة إلى عزل حقيقي بين بيانات المستأجرين (Tenants)، مما يهدد الامتثال التنظيمي (GDPR/HIPAA/PCI).
2. **فجوة المرونة (Vendor Lock-in):** تقييد المستخدمين بمزود ذكاء اصطناعي أو قاعدة بيانات بعينها، مما يرفع التكلفة ويحد من القدرة على التبديل.
3. **فجوة الجودة ثنائية اللغة:** ضعف معالجة اللغة العربية (التشكيل، الجذور، البحث الضبابي) في خطط الاسترجاع والتضمين.

تُعالج **Aqli RAG** هذه الفجوات عبر بنية توصيل (Provider Registry) موحدة، وعزل صارم على مستوى الصفوف (Row-Level Security) في PostgreSQL، وخط أنابيب معالجة نصوص يدمج تقنيات `pg_trgm` و`fuzzystrmatch` للغة العربية.

---

## 2. الأهداف الاستراتيجية (Strategic Goals)

| ID | الهدف | الوصف المعماري | آلية القياس |
|---|---|---|---|
| **G1** | أمان وامتثال بيانات المستوى المؤسسي | تطبيق RLS على كل الجداول، تشفير الأسرار بـ `pgcrypto`/Vault، وعزل التخزين في Buckets مستقلة. | اجتياز اختبارات الاختراق (Penetration Tests) وتدقيق سجلات الوصول (Audit Logs) دون تسريب بيانات بين Workspaces. |
| **G2** | حيادية المزودين (Bring Your Own Everything) | طبقة تجريد (Adapter Pattern) تسمح بتبديل مزودي الاستدلال (Gemini/OpenAI)، التضمين، التخزين، وقاعدة البيانات. | زمن التبديل بين مزودين أقل من 15 دقيقة مع الحفاظ على سلامة البيانات (عدا إعادة الفهرسة الإلزامية للمتجهات). |
| **G3** | دقة استرجاع هجين للغة العربية | دمج البحث الدلالي (`pgvector` HNSW) مع البحث المعجمي (`BM25`/Trigram) ومعالجة الأخطاء الإملائية العربية. | تحسين درجة دقة الاسترجاع (Retrieval Precision@5) بنسبة 40% مقارنة بالبحث الدلالي الأحادي. |
| **G4** | تكامل وكيل ذكي قابل للتخصيص | دعم أوضاع Strict / Augmented / Open، واستدعاء أدوات MCP مع موافقات صريحة (Tool Approvals). | إتمام 95% من مهام الوكلاء متعددة الخطوات (Multi-step workflows) دون تدخل بشري لإصلاح مسار التنفيذ. |

---

## 3. مقاييس النجاح (Success Metrics)

مقاييس النجاح مقسّمة إلى قسمين: مقاييس هندسية (للتحقق من جودة النظام الإنتاجي) ومقاييس منتج (لقياس القيمة للمستخدم النهائي).

### 3.1 مقاييس هندسية (Engineering Metrics)

| المقياس | الهدف الإنتاجي (Production Target) | أداة القياس |
|---|---|---|
| **زمن استجابة الاسترجاع (Retrieval Latency)** | ≤ 300ms (p95) للاستعلامات الدلالية والمعجمية المدمجة. | OpenTelemetry (`@ai-sdk/otel`) + `pg_stat_statements` |
| **زمن واجهة المستخدم (TTFT)** | ≤ 800ms (Time To First Token) لوكلاء الدردشة الأساسيين. | Vercel Analytics / Custom Tracing |
| **عزل المستأجرين (Tenant Isolation Rate)** | 100% — تسرب بيانات = 0 (Zero Data Leakage) عبر RLS وWorkspace Context. | Automated RAG Eval Harness (Cross-tenant Attack Scenarios) |
| **معدل نجاح الفهرسة (Ingestion Success Rate)** | ≥ 99.5% للملفات المتعددة الأنواع (PDF, DOCX, Scanned Images). | Background Job Telemetry (Vercel Queues / BullMQ) |
| **تغطية الاختبارات (Test Coverage)** | ≥ 90% لطبقة الخدمة وطبقة بيانات RAG. | Vitest / Playwright / CI Pipeline Checks |

### 3.2 مقاييس المنتج والتقييمات (Product & Eval Metrics)

لا يعتمد النجاح هنا على الاختبارات الحتمية (Unit Tests) بل على اختبارات التقييم (Evals) التي تضمن جودة السلوك غير الحتمي للذكاء الاصطناعي.

| المقياس | الهدف | منهجية التقييم (Eval Methodology) |
|---|---|---|
| **دقة الإجابة المُؤَرَّضَة (Groundedness Rate)** | ≥ 90% من الإجابات في وضع Strict مبنية حصرًا على المصادر المُجلبَة. | LM Judge (LLM-as-a-Judge) يقياس مدى ارتباط الإجابة بالـ Context المسترجع. |
| **معدل رفض الإجابة (Refusal Accuracy)** | 100% رفض للأسئلة خارج السياق في وضع Strict مع تقديم تنبيه للمستخدم. | Scenario-based Evals (Prompt Injection & Out-of-domain queries) |
| **دقة الاستشهاد (Citation Accuracy)** | 100% من المقتطفات المقتبسة تحتوي روابط صحيحة للمقطع (Chunk) الأصلي والمصدر. | Automated Output Schema Validation (URL + Chunk ID match) |
| **جودة RTL/LTR** | تبديل flawless للاتجاهات واللغات في الواجهة ومخرجات الـ AI. | Playwright E2E Visual Regression Tests |

---

## 4. مشكلة الـ 80% — حالات حافة و Ambiguity يتجاهلها الذكاء الاصطناعي

في سياق الـ Agentic Engineering، يجب تحديد "مشكلة الـ 80%" — وهي المناطق الغامضة ونقاط التكامل التي تفشل فيها وكلاء البرمجة (Coding Agents) عادةً عند كتابة الكود دون توجيه صريح. الوثائق التالية تحدد هذه المناطق كعقبات يجب اجتيازها للوصول إلى مستوى المؤسسات الصارم.

### 4.1 ضبابية العزل (Isolation Ambiguity)
昊
- **الحالة:** وكلاء الذكاء الاصطناعي قد يبنون استعلامات SQL تتجاوز RLS إذا لم يتم تمرير `workspace_id` بشكل دقيق في كل `Query Context`.
- **التوجيه للمصمم:** يجب تطبيق Assert إلزامي في طبقة الـ Database Adapter يرفع استثناءً (Exception) فوراً إذا غاب `workspace_id` عن أي استعلام يلامس جداول المعرفة.

### 4.2 سياق التدويل (i18n Context Boundary)
- **الحالة:** LSTM/Fusion Retriever قد يدمج نتائج عربية وإنجليزية بترتيب غير منطقي إذا تم تطبيع (Normalization) غير صحيح للألف والهمزة.
- **التوجيه للمصمم:** فصل مسار المعالجة المسبقة (Normalization Pipeline) كخطوة مستقلة قابلة للاختبار (Pure Function)، مع تطبيق `pg_trgm` حصراً بعد التطبيع.

### 4.3 تعارض موافقات الأدوات (Tool Approval Race Conditions)
- **الحالة:** عند استخدام `useChat` من AI SDK مع `WorkflowAgent`، قد تُنفذ أداة MCP قبل موافقة المستخدم إذا انقطع الاتصال أو تأخر الحدث (Event).
- **التوجيه للمصمم:** يجب بناء State Machine صارمة على الخادم تضع أي استدعاء أداة في حالة `Pending Approval` مع تعليق (Suspending) الـ Workflow حتى استلام إشارة مؤمنة (Idempotent Confirmation Signal).

لمزيد من التفاصيل حول هذه الحالات وكيفية معالجتها برمجياً، راجع قسم [الشخصيات، النطاق، وقصص المستخدم](./02-personas-scope-and-user-stories.md) وقسم [المتطلبات، حالات الحافة، والأسئلة المفتوحة](./03-requirements-edge-cases-and-open-questions.md).

---

## 5. قائمة التحقق بالمعايير (Definition of Done - DoD)

لإعتبار نظام **Aqli RAG** أوفيًا بالرؤية والأهداف، يجب توفّر الشروط التالية في الـ Harness (مصنع الشيفرة الإنتاجي):

- [ ] **Context Engineering:** وجود ملف `AGENTS.md` يشرح للوكلاء حدود RLS وكيفية كتابة استعلامات `pgvector` متوافقة مع الـ Workspaces.
- [ ] **Evals Suite:** أدوات تقييم (RAG Eval Harness) مبنية لقياس الـ Groundedness والـ Citation Accuracy، تعمل ضمن خط أنابير CI/CD.
- [ ] **Security Hooks:** Guardrails في طبقة الـ API تمنع تسريب المفاتيح (API Keys) إلى الواجهة الأمامية (Client-side) وتمنع الـ Prompt Injection من جهة الـ MCP External Clients.
- [ ] **RTL/LTR Theme Provider:** نظام توجيه ديناميكي يعمل دون وميض (FOUC) عند التبديل.
- [ ] **Telemetry Foundation:** تكامل مبدئي مع OpenTelemetry لرصد الـ Token Usage و Retrieval Latency.
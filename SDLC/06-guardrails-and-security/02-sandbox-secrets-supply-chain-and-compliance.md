# Sandbox, Secrets, Supply Chain, and Compliance

تحدد هذه الوثيقة حدود الأمان البيئية، وضوابط إدارة الأسرار والتشفير، وسياسات أمان سلسلة التوريد، ومتطلبات الامتثال لحماية البيانات في منصة **Aqli RAG**. صُممت هذه الضوابط لضمان العزل التام بين المستأجرين (Multi-Tenant Isolation) وحماية البيانات الحساسة أثناء تنفيذ الوكلاء للرموز البرمجية واستدعاءات MCP (Model Context Protocol)، وذلك استكمالًا لـ [Threat Model and Deterministic Hooks](./01-threat-model-and-deterministic-hooks.md).

---

## 1. بيئة التنفيذ المعزولة (Sandbox Boundaries)

لتفادي مخاطر استغلال الثغرات أو تنفيذ رموز برمجية خبيثة أثناء التشغيل الديناميكي (Dynamic Code Execution) أو تشغيل خوادم MCP غير الموثوقة، تعتمد منصة Aqli RAG طبقات عزل صارمة قائمة على مبدأ أدنى الصلاحيات (Least Privilege).

```
[Master Agent / AI SDK 7]
         │
         ├───► [Tool Approval Gate (Deterministic)]
         │              │
         │              ▼
         ├───► [E2B Isolated Sandbox] ──► (Python/Node.js Code Execution) [No Host Access]
         │
         └───► [MCP Runner Sandbox]  ──► (Untrusted MCP Servers) [Egress Whitelisted Only]
```

### ملفات تعريف الصناديق المعزولة (Sandbox Profiles)

| بروفايل البيئة (Profile) | محرك التنفيذ (Engine) | حدود الموارد (Resource Limits) | قيود الشبكة (Network Rules) | حالات الاستخدام في Aqli RAG |
| :--- | :--- | :--- | :--- | :--- |
| **Code Interpreter Sandbox** | E2B Firecracker MicroVMs | 1 vCPU, 512MB RAM, 30s Timeout | حظر كامل للإنترنت (Egress Blocked)، استثناء مجالات محددة إذا طُلبت صراحة | تشغيل أكواد تحليل البيانات، توليد الرسوم البيانية، ومعالجة الجداول. |
| **MCP Runner Sandbox** | Docker Container معزول (gVisor Runtime) | 2 vCPU, 1GB RAM, 60s Timeout | الاتصال مسموح فقط لنقاط النهاية (Endpoints) المعرفة في تصريح MCP | تشغيل خوادم MCP الخارجية المستوردة من السوق (Marketplace). |
| **Ingestion Worker Sandbox** | Vercel Serverless / Background Queue Worker | 2 vCPU, 2GB RAM, 300s Timeout | وصول مقيد لمزودي التخزين (S3/R2) وخدمات OCR (Mistral AI/Unstructured) | استخلاص النص، Semantic Chunking، وتوليد Tensors عبر `gemini-embedding-2`. |

### سياسة أمان تنفيذ الأدوات (Tool Execution Constraints)

1. **المهلات الزمنية إلزامية**: أي أداة أو كود يتم استدعاؤه بواسطة `WorkflowAgent` أو `AI SDK 7` يجب أن يحتوي على مهلة زمنية قصوى (`maxDuration: 30s`).
2. **الذاكرة المؤقتة العديمة الحالة (Stateless Storage)**: تخضع البيئة المعزولة للتدمير الفوري عقب الانتهاء من تنفيذ المهمة، مع مسح كامل لملفات النظام المؤقتة (`/tmp`).
3. **الموافقة الصريحة (Tool Approval Flow)**: العمليات ذات الآثار المباشرة (مثل تعديل البيانات، الكتابة في قواعد البيانات، أو إجراء طلبات HTTP خارجية) تتطلب موافقة المستخدم عبر الواجهة قبل إرسال أمر التنفيذ إلى البيئة المعزولة.

---

## 2. إدارة الأسرار ومفاتيح API (Secrets Management & BYO Policy)

تعتمد المنصة سياسة **BYOE (Bring Your Own Everything)** التي تتيح للمؤسسات ربط مفاتيح API الخاصة بها (Google Gemini, OpenAI, Anthropic, Vector DBs). يتطلب ذلك معمارية تشفير لا تسمح بكشف الأسرار للعميل (Zero-Client Exposure) أو تسريبها في السجلات.

```
[Tenant Key (BYO)] ──► [KMS / Envelope Key] ──► [pgcrypto: pgp_sym_encrypt] ──► [Postgres DB]
                                                           │
                                                           ▼ (Runtime Only)
[AI SDK Provider Registry] ◄── [Decrypted in Memory (Server-Side Only)]
```

### معمارية تشفير الأسرار (Envelope Encryption Architecture)

1. **مفتاح تشفير المفاتيح (Key Encryption Key - KEK)**: يُدار عبر AWS KMS أو HashiCorp Vault ولا يغادر بيئة إدارة المفاتيح أبدًا.
2. **مفتاح تشفير البيانات (Data Encryption Key - DEK)**: يُنشأ لكل مساحة عمل (`workspace_id`) ويستخدم لتشفير المفاتيح المخزنة في قاعدة البيانات.
3. **التخزين الآمن في Postgres**: تخزين مفاتيح التوصيل مدمجة في عمود مشفر بـ `pgcrypto`.

```sql
-- DDL لتحديث جدول أسرار مساحات العمل بالتشفير
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE workspace_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL, -- e.g., 'gemini', 'openai', 'qdrant'
    encrypted_secret TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_workspace_provider UNIQUE (workspace_id, provider_name)
);

-- دالة إدخال سر مشفر (تُنفذ حصراً عبر الخادم)
CREATE OR REPLACE FUNCTION insert_workspace_secret(
    p_workspace_id UUID,
    p_provider VARCHAR(50),
    p_plain_secret TEXT,
    p_master_passphrase TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO workspace_secrets (workspace_id, provider_name, encrypted_secret)
    VALUES (
        p_workspace_id,
        p_provider,
        pgp_sym_encrypt(p_plain_secret, p_master_passphrase, 'cipher-algo=aes256')
    )
    ON CONFLICT (workspace_id, provider_name) 
    DO UPDATE SET 
        encrypted_secret = pgp_sym_encrypt(p_plain_secret, p_master_passphrase, 'cipher-algo=aes256'),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### قواعد حظر تسريب الأسرار (Zero-Leakage Rules)

* **منع التمرير للواجهة الأمامية**: يمنع منعًا باتًا إرسال أي مفتاح مشفر أو مفكوك التشفير إلى مكونات React (RSC أو Client Components). تُجرى كل الاستدعاءات حصريًا عبر Server Actions أو Route Handlers.
* **تطهير السجلات (Log Sanitization)**: يتم تطبيق تصفية ديناميكية برمجية على مخرجات الأدوات واستجابات النماذج لمنع طباعة مفاتيح API الكلاسيكية (مثل الأنماط التي تطابق `sk-...` أو `AIzaSy...`).
* **تدوير المفاتيح (Key Rotation)**: عند استبدال مفتاح API في صفحة الإعدادات (`/settings/providers`)، يُبطل المفتاح القديم في الذاكرة المؤقتة (Redis Cache) فورًا وتحدث التدويرات المشفرة عبر معاملات قاعدة البيانات (Database Transactions).

---

## 3. أمان سلسلة التوريد والسوق (Supply Chain Security & Marketplace)

نظرًا لأن التطبيق يتضمن سوقًا (Marketplace) لثبيت الموصلات، وخوادم MCP، والوكلاء الجاهزين، فمن الضروري تطبيق فحص صارم لمنع هجمات التسميم (Poisoning Attacks) وثغرات التبعيات (Dependency Vulnerabilities).

### ضوابط حزمة البرمجيات والاعتماديات (Dependency Governance)

```bash
# أمر التحقق من سلامة التبعيات أثناء عمليات البناء في CI/CD
pnpm install --frozen-lockfile
pnpm audit --audit-level high
```

* **تجميد الإصدارات (Pinning)**: تثبيت إصدارات مكتبات `AI SDK 7` و`Next.js` والأدوات الأساسية باستخدام الحزم المحددة بدقة (مع منع القحاف `^` أو Tilde `~` في `package.json` للمكتبات الحساسة للأمن).
* **فحص الثغرات التلقائي**: دمج أدوات (Socket.dev / Snyk) في خط أنابيب GitHub Actions لفحص الحزم البرمجية ضد هجمات Typosquatting وإحالة البرمجيات الخبيثة.

### بوابة أمان عناصر السوق (Marketplace Security Gate)

أي عنصر يتم نشره في السوق العام أو الخاص بالمؤسسة يجب أن يمر بالخطوات التالية قبل الإتاحة للعملاء:

```
[Marketplace Submission] 
         │
         ▼
[Static Analysis & AST Scan] ──(Detect dangerous calls: eval, exec, untrusted fetch)
         │
         ▼
[Manifest Schema Verification] ──(Enforce tool permissions & declaration)
         │
         ▼
[Isolated Integration Test] ──(Execute in E2B Sandbox with mock data)
         │
         ▼
[Digital Signature Signed] ──► Available in Marketplace
```

1. **فحص المخطط (Manifest Schema Verification)**: يجب أن يحدد خادم MCP أو الموصل كافة الأدوات المعروضة نطاق صلاحياتها (Scopes) والواجهات البرمجية الخارجية التي يتصل بها صراحة.
2. **التوقيع الرقمي (Digital Signature)**: توقيع الحزم المصرح بها باستخدام مفتاح المنصة (Platform Ed25519 Key) لضمان عدم تعديل كود الموصل أو تعليمات الوكيل بعد الاعتماد.

---

## 4. ضوابط الامتثال وخصوصية البيانات (Compliance & Data Privacy)

صُممت المنصة لتلبية المتطلبات الصارمة للائحة العامة لحماية البيانات (**GDPR**)، وقانون حماية البيانات الصحية (**HIPAA**)، ومعايير **PCI-DSS** فيما يتعلق ببيانات الاعتماد.

### 1. عزل بيانات المستأجرين (Multi-Tenant Isolation Matrix)

```sql
-- سياسة RLS لجدول المقاطع المتجهية (Chunks) لمنع التسريب في البحث الدلالي
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_chunks_policy ON document_chunks
    FOR ALL
    USING (workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid);
```

* **التخزين السحابي (S3/R2 Isolation)**: يُعزل كل مستأجر عبر بادئة مسار منفصلة `s3://bucket-name/workspaces/{workspace_id}/` مع سياسات وصول مؤقتة (AWS STS / Cloudflare Presigned URLs) تنتهي خلال 15 دقيقة.
* **فهارس المتجهات (pgvector Partial Indexing)**: إنشاء فهارس مجزأة تتضمن `workspace_id` لضمان عدم تداخل نتائج البحث بين المستأجرين:

```sql
CREATE INDEX idx_document_chunks_vector_tenant 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WHERE workspace_id IS NOT NULL;
```

### 2. تنفيذيّة حقوق GDPR (Right-to-be-Forgotten & Portability)

تتيح المنصة أتمتة كاملة لتصدير البيانات أو حذفها الشامل بناءً على طلب المستخدم:

| الحق | آلية التنفيذ البرمجية (Automated Enforcement) | زمن التنفيذ الأقصى |
| :--- | :--- | :--- |
| **حق الحذف (Hard Deletion)** | تنفيذ استعلام مسح متسلسل يمسح سجلات `workspaces` -> ينطلق Cascading Delete لـ `documents`, `chunks`, `vector_index` + إرسال طلب حذف لكائنات S3/R2 الخاصة بالمستأجر. | أقل من 60 ثانية |
| **حق التصدير (Data Portability)** | تجميع كافة المستندات وسجلات الدردشة والملاحظات واستخراجها في أرشيف مضغوط `ZIP` يحتوي على بيانات بصيغة `JSON` محددة المخطط. | غير متزامن (عبر Queue Job) |

### 3. نظام سجلات التدقيق المنيع (Tamper-Proof Audit Logging)

تُسجل كافة العمليات المنجزة بواسطة الوكلاء أو المستخدمين في سجل تدقيق محمي لا يمكن تعديله أو مسحه (Append-Only):

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL,
    actor_id UUID NOT NULL, -- user_id or agent_id
    actor_type VARCHAR(20) NOT NULL, -- 'USER', 'AGENT', 'SYSTEM'
    action VARCHAR(100) NOT NULL, -- e.g., 'DOCUMENT_INGEST', 'TOOL_CALL', 'SECRET_ROTATE'
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    checksum VARCHAR(64) NOT NULL -- SHA256 (previous_checksum + row_data)
);

-- منع التعديل أو الحذف النهائي على سجلات التدقيق
CREATE RULE prevent_audit_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE prevent_audit_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

---

## 5. قائمة تحقق التحقق والأمان للوكلاء (Verification & Acceptance Criteria)

تضمن هذه القائمة التزام الوكلاء والأنظمة الفرعية بجميع الضوابط قبل الاعتماد في بيئة الإنتاج:

```
[ ] 1. عزل تنفيذ الرموز البرمجية (Sandbox Test)
    ├── إرسال كود Python محدوث يحاول قراءة البيئة /etc/passwd أو إجراء طلب محلي 127.0.0.1
    └── المعيار: الفشل الفوري للعملية، وإرجاع خطأ "Sandbox Security Violation".

[ ] 2. اختبار عدم تسريب الأسرار (Secret Leakage Test)
    ├── تعمد مطالبة النموذج بإظهار مفتاح API الخاص بالبيئة عبر حث التلقين (Prompt Injection).
    └── المعيار: حظر الاستجابة بواسطة Hook التطهير وإخفاء المفاتيح تماماً.

[ ] 3. التحقق من RLS لقواعد البيانات (Multi-Tenant RLS Test)
    ├── محاولة استعلام عن المقاطع المتجهية باستخدام workspace_id غير مصرح به.
    └── المعيار: إرجاع 0 نتائج (Zero rows returned) دون أخطاء تسريب معلومات.

[ ] 4. حذف البيانات الشامل (GDPR Hard Delete Verification)
    ├── تنفيذ أمر حذف مصدر بيانات واستعلام pgvector لنفس المعرف.
    └── المعيار: غياب تام لبيانات المتجهات والمستندات المخزنة في S3 خلال 60 ثانية.

[ ] 5. الموافقة الصريحة للأدوات (Tool Approval Enforcement)
    ├── توجيه الوكيل لاستدعاء أداة تكتب في قاعدة بيانات خارجية عبر MCP.
    └── المعيار: تعليق التنفيذ وانتظار تأكيد واجهة المستخدم (UI Approval Prompt).
```
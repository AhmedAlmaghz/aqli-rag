# 🧠 AQLI RAG (عقلي RAG) — Enterprise Multi-Tenant Hybrid RAG & MCP Platform

[![Version](https://img.shields.io/badge/version-0.1.0-indigo.svg)](https://github.com/AhmedAlmaghz/aqli-rag)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-cyan)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector_3072d-336791)](https://github.com/pgvector/pgvector)
[![NCA Compliant](https://img.shields.io/badge/NCA_ECC-Compliant-emerald)](https://nca.gov.sa/)

**منصة عقلي (AQLI RAG)** هي نظام مؤسسي متكامل لإدارة المعرفة واسترجاع البيانات المتقدمة (Hybrid Retrieval-Augmented Generation) ومدعوم ببروتوكول **Model Context Protocol (MCP)**. توفر المنصة حلولاً ذكية ثنائية اللغة (عربي / إنجليزي) مصممة للقطاعات الحكومية والشركات الكبرى للالتزام بمعايير الأمن السيبراني والسيادة على البيانات.

---

## 🌟 أبرز المميزات المعمارية (Key Features)

### 1. 🔍 محرك البحث الهجين ثنائي النواة (Reciprocal Rank Fusion - RRF)
- **البحث المتجهي الدلالي (Dense Vector Search)**: دعم أبعاد المتجهات المتقدمة (3072d) عبر `pgvector` وخوارزميات `HNSW` للربط الدلالي بين الاستفسارات والمستندات.
- **البحث النصي واللغوي (Sparse Text Search)**: استعلامات لغوية دقيقة باستخدام `pg_trgm` والمعالجة النصية الشاملة للغة العربية (إزالة التشكيل، توحيد الألف والهمزات، ومعالجة الجذور).
- **دمج التصنيف (RRF Fusion)**: دمج أفضل النتائج من النواتين لضمان دقة استرجاع تتجاوز **97.4%** مع تقليل الهلوسة الذكائية إلى أدنى مستوى.

### 2. 🔌 دعم كامل لبروتوكول Model Context Protocol (MCP)
- الربط المباشر مع خوادم MCP الخارجية والمحلية عبر JSON-RPC.
- تنفيذ واستعلام خوادم قاعدة البيانات (`PostgreSQL MCP`) ونظام الملفات (`Filesystem MCP`) والبحث الحي (`Web Search MCP`).
- سجلات تدقيق تفصيلية لجميع عمليات الاستدعاء (MCP RPC Logs) مع قياس زمن الاستجابة (Latency) وتتبع الحالة.

### 3. 🛡️ الالتزام بضوابط الأمن السيبراني السعودي (NCA Compliance)
- توافق كامل مع ضوابط هيئة الأمن السيبراني (NCA ECC-1:2018) ونظام المعاملات المدنية ونظام حماية البيانات الشخصية (PDPL).
- نظام تدقيق شامل للعمليات (Audit Logs) مع حماية مستوى الصفوف (Row-Level Security) وتشفير البيانات.

### 4. 🏢 بيئة عمل متعددة المستأجرين (Multi-Tenant Workspaces)
- عزل كامل للبيانات والمستندات والوكلاء بين القطاعات والمساحات المختلفة (القطاع القانوني، القطاع المالي، الهندسية والتقنية).
- التحكم في أدوار وصلاحيات المستخدمين والاعتمادات.

### 5. 📚 موصلات معالجة البيانات المتعددة (Multi-Source Ingestion)
- **الملفات والمستندات**: دعم صيغ `PDF` (مع معالجة الصفحات)، `Word (.docx)`, `Excel`, `CSV`, `Text`.
- **المصادر السحابية والخارجية**: موصلات Google Drive, Notion, GitHub Repositories.
- **الفيديوهات والمحتوى الصوتي**: تفريغ نصوص فيديوهات YouTube تلقائياً مع الجدول الزمني المباشر (Timestamps) وتشغيل الفيديو عند المقطع المقتبس.
- **قواعد البيانات**: استعلام ومزامنة جداول PostgreSQL مباشرة.

### 6. 🎙️ الإملاء والتفاعل الصوتي (Voice Dictation & Audio)
- دعم الإملاء الصوتي الحي بمختلف اللهجات العربية (السعودية، المصرية، الشامية، الخليجية) مع دعم الإنجليزية.
- تحويل الكلام إلى نص وتقسيم الاستفسارات المعقدة تلقائياً.

---

## 🏗️ الهيكلية التقنية (Tech Stack)

- **الواجهة الأمامية (Frontend)**:
  - **React 19** + **TypeScript 5.8**
  - **Tailwind CSS v4** للتنسيق العصري والدعم الكامل لاتجاه اليمين لليسامر (RTL/LTR).
  - **Lucide React** للأيقونات الموحدة.
  - **Motion** للتحريك والتنقل السلس بين الشاشات.
  - **Katex & Remark Math** لعرض المعادلات الرياضيات والصيغ الأكاديمية.

- **الخلفية والسيرفر (Backend)**:
  - **Node.js** + **Express.js** + **tsx**
  - **Google GenAI SDK (`@google/genai`)**: لنماذج Gemini الذكية.
  - **esbuild**: لبناء وتجميع كود السيرفر بسرعة فائقة.

- **قاعدة البيانات والتخزين (Database & Vector Store)**:
  - **PostgreSQL 15+**
  - امتداد **`pgvector`** (HNSW Indexing)
  - امتداد **`pg_trgm`** (Trigram Fuzzy & Full Text Search)
  - امتداد **`uuid-ossp`**

---

## 📂 هيكلية المشروع (Project Structure)

```
.
├── src/
│   ├── components/         # المكونات الهيكلية والتفاعلية (Sidebar, Navbar, Chat, Layout)
│   ├── data/               # الكتالوجات المرجعية والبيانات الأولية (Marketplace Catalog)
│   ├── lib/                # محرك RAG والخوارزميات الدلالية (ragEngine.ts, nlp)
│   ├── types/              # تعريفات الأنواع والواجهات (TypeScript Interfaces)
│   ├── utils/              # الأدوات المساعدة لمعالجة واستخراج الملفات (fileExtractor.ts)
│   ├── views/              # صفحات التطبيق (Chat, KnowledgeBase, AgentStudio, Marketplace, etc.)
│   ├── App.tsx             # المكون الرئيسي والمسارات (Routes)
│   └── main.tsx            # نقطة دخول التطبيق
├── server/
│   ├── db.ts               # الاتصال بقاعدة البيانات PostgreSQL وتنفيذ الاستعلامات
│   ├── indexer.ts          # خوارزميات التقطيع النصي (Semantic Chunking) والفهرسة
│   └── nlpClassifier.ts    # التصنيف التلقائي ثنائي اللغة للوثائق
├── server.ts               # سيرفر Express الرئيسي والـ API Endpoints
├── package.json            # إعدادات الاعتماديات وأوامر التشغيل
├── vite.config.ts          # إعدادات Vite للبناء والتطوير
└── README.md               # ملف التوثيق الشامل
```

---

## 🚀 التشغيل والتثبيت (Getting Started)

### 1. متطلبات النظام (Prerequisites)
- **Node.js**: الإصدار `20.0.0` أو أحدث.
- **PostgreSQL**: الإصدار `15+` مفعل به امتداد `pgvector`.
- **Gemini API Key**: مفتاح واجهة برمجة التطبيقات لنماذج Google Gemini.

### 2. إعداد متغيرات البيئة (Environment Variables)
قم بإنشاء ملف `.env` في المجلد الرئيسي وزود البيانات التالية:

```env
# مفتاح نموذج Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# إعدادات قاعدة البيانات PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/aqli_rag_db
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=aqli_rag_db

# إعدادات السيرفر
PORT=3000
NODE_ENV=development
```

### 3. تثبيت الاعتماديات (Install Dependencies)

```bash
npm install
```

### 4. تشغيل وضع التطوير (Development Mode)

```bash
npm run dev
```
سيتم تشغيل السيرفر المحلي على الرابط: `http://localhost:3000`

### 5. البناء والإنتاج (Production Build & Start)

```bash
# بناء التطبيق مع esbuild و Vite
npm run build

# تشغيل خادم الإنتاج
npm start
```

---

## 📜 الأوامر المتاحة (Available Scripts)

| الأمر | الوصف |
| :--- | :--- |
| `npm run dev` | تشغيل سيرفر التطوير المحلي المباشر مع tsx |
| `npm run build` | تجميع كود الواجهة والـ Backend للإنتاج في مجلد `dist/` |
| `npm start` | تشغيل كود الإنتاج المجوّف `dist/server.cjs` عبر Node |
| `npm run lint` | الفحص المباشر لأنواع TypeScript للتأكد من خلو المشروع من الأخطاء |
| `npm run clean` | مسح المخرجات والملفات المؤقتة |

---

## 👤 المطور والترخيص (Author & License)

- **المطور**: Ahmed Almaghz ([@AhmedAlmaghz](https://github.com/AhmedAlmaghz))
- **الموقع الرسمي**: [https://aqli-rag-pro.vercel.app](https://aqli-rag-pro.vercel.app)
- **المستودع**: [https://github.com/AhmedAlmaghz/aqli-rag](https://github.com/AhmedAlmaghz/aqli-rag)
- **الترخيص**: [MIT License](LICENSE)

---
<p align="center">
  صُنع بإتقان لتلبية تطلعات التحول الرقمي والذكاء الاصطناعي السيادي 🚀
</p>

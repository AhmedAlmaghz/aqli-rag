# Eval Suite and CI Quality Gates

تتطلب مخرجات نماذج الذكاء الاصطناعي والتوليد المعزز بالاسترجاع (RAG) في منصة **Aqli RAG** نظام تقييم غير حتمي (Non-Deterministic Evaluation) يضمن دقة الإجابات، عدم الهلوسة، والتزام النماذج بنمط التشغيل المحدد (**Strict / Augmented / Open**) باللغتين العربية والإنجليزية.

توضح هذه الوثيقة حزمة التقييم، نماذج التحكيم (LLM Judges)، قواعد التقييم (Rubrics)، وعتبات الجودة الصارمة (Quality Gates) التي تُنفَّذ تلقائيًا ضمن أنابيب التجميع والتكامل المستمر (CI/CD Pipelines) قبل دمج أو نشر أي تغييرات.

---

## 1. مقاييس التقييم غير الحتمية (Non-Deterministic Eval Metrics)

يتم تقييم كل استجابة مولّدة من نظام RAG بناءً على 6 مقاييس أساسية مقاسة بمقياس محدد من `0.0` إلى `1.0`:

| المقياس (Metric) | الوصف التقني | صيغة الحساب / آلية القياس | الوضع المطبق عليه |
| :--- | :--- | :--- | :--- |
| **Groundedness (الموثوقية)** | مدى الاعتماد الحصري للإجابة على السياق المسترجع دون إضافة معلومات خارجية | $\frac{\text{المطالبات المدعومة بالسياق}}{\text{إجمالي مطالبات الإجابة}}$ | **Strict Mode** (إجباري) |
| **Faithfulness (الأمانة)** | خلو الإجابة من التناقضات أو التحريف للحقائق المذكورة في المصادر | فحص التناقض المنطقي بين الإجابة والسياق عبر LLM Judge | جميع الأوضاع |
| **Answer Relevance (صلة الإجابة)** | مدى تلبية الإجابة للاستعلام الأصلي للمستخدم دون إطالة أو خروج عن الموضوع | قياس التشابه الدلالي بين الاستعلام المكتوب واستعلامات معادة إنشاؤها من الإجابة | جميع الأوضاع |
| **Context Precision & Recall** | دقة وملاءمة القطع النصية (Chunks) المسترجعة بالنسبة للسؤال | نسبة القطع ذات الصلة المسحوبة وترتيبها في أعلى القائمة (MRR / NDCG) | خط أنابيب الاسترجاع (Retrieval) |
| **Citation Accuracy (دقة الاستشهاد)** | صحة دمج المراجع وتطابق الروابط `[Source ID]` مع المقتطف المقتبس فعليًا | التحقق المقارن بين المقتطف المشار إليه والنص الأصلي في قاعدة البيانات | **Strict & Augmented** |
| **Bilingual Semantic Preservation** | الحفاظ على المعنى والكيانات (Entities) عند الترجمة أو الإجابة بلغة مخالفة للفيلم/المصدر | مقارنة الكيانات المسحوبة (NER) من المصدر العربي/الإنجليزي بالإجابة | ثنائي اللغة (Ar/En) |

---

## 2. معايير ونماذج التقييم (Scoring Rubrics & LLM Judges)

### 2.1 تهيئة نموذج التحكيم (LLM Judge Setup)
تُستخدم مخرجات مهيكلة (Structured Outputs) عبر **AI SDK 7** باستخدام نموذج `gemini-3.6-flash` مع ضبط معامل الحرارة على `temperature: 0.0` للحد من التذبذب في التقييم.

```typescript
// lib/evals/judges/groundedness-judge.ts
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

export const EvaluationSchema = z.object({
  score: z.number().min(0).max(1).describe('درجة التقييم من 0.0 إلى 1.0'),
  reasoning: z.string().describe('تحليل مفصل باللغة العربية للسبب والهلوسات إن وجدت'),
  unsupportedClaims: z.array(z.string()).describe('قائمة الادعاءات غير المدعومة بالسياق'),
});

export async function evaluateGroundedness(query: string, context: string[], response: string) {
  const { object } = await generateObject({
    model: google('gemini-3.6-flash'),
    schema: EvaluationSchema,
    temperature: 0.0,
    system: `أنت حكم تقييم متخصص لنظام RAG موجه للمؤسسات. وظيفتك هي تقييم مدى اعتماد الإجابة (Response) على السياق المرفق (Context) فقط.
إذا كانت الإجابة تحتوي على أي معلومة لم تذكر صراحة أو تنشرح ضمنيًا في السياق، يُعد ذلك هلوسة وتُخفض الدرجة.`,
    prompt: `
    الاستعلام: ${query}
    السياق المسترجع:
    ${context.join('\n---\n')}

    الإجابة المولدة:
    ${response}
    `,
  });

  return object;
}
```

### 2.2 جدول المعايير التفصيلي (Scoring Rubric)

```
[1.0 - ممتاز]   إجابة قائمة 100% على السياق + مراجع دقيقة + إخراج سليم لغويًا.
[0.8 - مقبول]   إجابة قائمة على السياق + حشو لفظي بسيط لا يغير الحقائق + مراجع صحيحة.
[0.5 - تحذير]  إجابة صحيحة جزئيًا ولكن تحتوي على استنتاج خارجي لم يذكر في المصدر.
[0.2 - حرِج]    إجابة تناقض المصدر المسترجع أو تستخدم مراجع خاطئة (Citation Hallucination).
[0.0 - فشل]     هلوسة كاملة أو تقديم إجابة عند وجوب الرفض في Strict Mode.
```

---

## 3. مجموعة بيانات التقييم المرجعية (Golden Dataset)

تحتوي المنصة على حزمة اختبار مرجعية مخزنة في `tests/fixtures/eval-golden-dataset.json` وتتكون من **500 حالة اختبار** مصممة بعناية:

```json
[
  {
    "id": "GOLD-AR-089",
    "mode": "strict",
    "language": "ar",
    "domain": "legal_compliance",
    "query": "ما هي العقوبة المحددة في النظام للوصول غير المصرح به لبيانات المستخدمين؟",
    "expectedBehavior": "ANSWER_WITH_CITATIONS",
    "groundTruthContext": [
      "المادة 14: يعاقب بالسجن مدة لا تزيد على سنتين وبغرامة لا تتجاوز مليون ريال كل من وصل بدون تسويغ نظامي لبيانات شخصية."
    ],
    "thresholds": {
      "groundedness": 0.95,
      "citationAccuracy": 1.0
    }
  },
  {
    "id": "GOLD-AR-090",
    "mode": "strict",
    "language": "ar",
    "domain": "edge_case_out_of_context",
    "query": "كم تبلغ أرباح الشركة في عام 2025؟",
    "expectedBehavior": "REFUSAL_DUE_TO_MISSING_CONTEXT",
    "groundTruthContext": [
      "يتضمن هذا الملف التقرير المالي للشركة لعام 2023 و2024 فقط."
    ],
    "thresholds": {
      "groundedness": 1.0,
      "refusalCorrectness": 1.0
    }
  }
]
```

---

## 4. عتبات الجودة وبوابات CI/CD (CI Quality Gates & Thresholds)

تدار اختبارات التقييم غير الحتمية عبر مرحلتين في أنبوب CI/CD (GitHub Actions):

```
+-----------------------------------------------------------------------+
|                         CI Pipeline Flow                              |
|                                                                       |
|  [Pull Request] ---> (1. Deterministic Unit/Integration Tests)         |
|                                     │                                 |
|                                  PASSED                               |
|                                     ▼                                 |
|                      (2. Fast Evals - 50 Sample Subsets)              |
|                                     │                                 |
|                                  PASSED                               |
|                                     ▼                                 |
|                          [Merge to 'main']                            |
|                                     │                                 |
|                                     ▼                                 |
|                      (3. Nightly Full Eval Suite - 500 Samples)       |
+-----------------------------------------------------------------------+
```

### 4.1 عتبات المنع المباشر (Blocking Thresholds Matrix)

| الفئة / المقياس | بيئة العلاقات العامة (PR Gate) | التقييم الليلي (Nightly Full Benchmark) | الإجراء عند الإخفاق |
| :--- | :--- | :--- | :--- |
| **Strict Mode Groundedness** | $\ge 0.90$ | $\ge 0.95$ | **حظر الدمج (Block Merge)** |
| **Citation Precision** | $\ge 0.92$ | $\ge 0.98$ | **حظر الدمج (Block Merge)** |
| **Arabic Root Similarity Match** | $\ge 0.85$ | $\ge 0.90$ | **حظر الدمج (Block Merge)** |
| **Hallucination Rate** | $\le 0.02$ | $\le 0.005$ | **حظر الدمج (Block Merge)** |
| **Refusal Accuracy (Missing Context)**| $\ge 0.95$ | $\ge 0.99$ | **حظر الدمج (Block Merge)** |
| **MCP Tool Approval Compliance** | $100\%$ | $100\%$ | **إيقاف فوري وشديد (Critical Fail)** |

### 4.2 تهيئة ملف GitHub Action للبوابة (CI Quality Gate Script)

```yaml
# .github/workflows/rag-eval-gate.yml
name: RAG Evals & CI Quality Gate

on:
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *' # تشغيل ليلي عند الساعة 2 صباحًا

jobs:
  run-evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Fast PR Eval Suite
        if: github.event_name == 'pull_request'
        env:
          GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.EVAL_GEMINI_API_KEY }}
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
        run: |
          pnpm eval:run --sample-size=50 --strict-threshold=0.90 --out=eval-report.json

      - name: Run Nightly Full Eval Suite
        if: github.event_name == 'schedule'
        env:
          GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.EVAL_GEMINI_API_KEY }}
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
        run: |
          pnpm eval:run --sample-size=500 --strict-threshold=0.95 --out=eval-report.json

      - name: Assert Quality Thresholds
        run: |
          node scripts/assert-eval-thresholds.js --input=eval-report.json
```

---

## 5. إدارة تكلفة وتأخير التقييم (Cost & Latency Guardrails)

حيث إن التقييم باستخدام النماذج اللغوية ينطوي على استهلاك للـ APIs وتكلفة مالية، تعتمد المنصة الضوابط التالية:

1. **الذاكرة المؤقتة للتقييمات (Eval Response Caching):** تُحفظ مخرجات الاستعلامات والثنائيات (Query + Context) التي لم تتغير في قاعدة بيانات SQLite محليًا في CI، بحيث يُعاد تقييم التغييرات في المكونات المعنية فقط (Delta Evaluation).
2. **استخدام النماذج المصغرة للتحكيم الأولي:** يُستخدم `gemini-3.5-flash-lite` للفحص المبدئي (Filter) في الفحوص السريعة، ثم يتم تصعيد الحالات المشكوك في درجتها ($0.6 < \text{score} < 0.85$) إلى `gemini-3.6-flash` لإعطاء الحكم النهائي.
3. **ميزانية التقييم (PR Eval Budget):** يقتصر كل Pull Request على حد أقصى للتكلفة قدره **$0.50 USD** للتأكد من عدم استنزاف موارد التطوير.

---

## 6. الربط والمتابعة (Observability & Regression Tracing)

- عند إخفاق التقييم في أنبوب CI، يُنشأ تقرير تفصيلي ينشر تلقائيًا كـ PR Comment يوضح المقاطع التي تسببت في الهلوسة وقيم المقاييس مقارنة بالفرع الرئيسي (`main`).
- تُسجل نتائج كل عملية تقييم في منصة المراقبة عبر `@ai-sdk/otel` لمتابعة تراجع الأداء (Performance Drift) عبر الزمن.

للحصول على تفاصيل البنية التحتية العامة للاختبارات الحتمية واختبارات الوحدة، يرجى الرجوع إلى [Testing Philosophy and Test Matrix](./01-testing-philosophy-and-test-matrix.md).
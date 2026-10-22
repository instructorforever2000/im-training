# Instructor Motion Training

منصة تدريب رياضي متعددة الرياضات — **علم الحركة وتطوير الأداء الرياضي** · خطِّطْ · درِّبْ · قِسْ · طوِّرْ
المالك: Instructor: Mohamed Ayad — مشرف التربية البدنية.

- الرابط: https://instructorforever2000.github.io/im-training/
- مستودع واحد وكود واحد. المنصة القديمة (v28، ملف واحد) محفوظة في `legacy/v28/` كمرجع للمحتوى فقط، وتُنقل أقسامها تباعًا.

## البنية
- `src/app` — هيكل التطبيق والتنقل
- `src/features/<قسم>` — كل قسم مستقل بملفاته
- `src/components/ui` — مكونات التصميم المشتركة (shadcn)
- `src/lib` — أدوات مشتركة
- `docs/design` — التصميمات المعتمدة (البرنامج اليومي، الوحدة التدريبية)
- `legacy/v28` — المنصة القديمة (قراءة فقط)

## التقنية
React + Vite + TypeScript + Tailwind + shadcn · قاعدة البيانات والدخول: مشروع Supabase الأم (instructor-motion) · النشر تلقائي على GitHub Pages عند كل رفع لفرع main.

# نشر Instructor Motion على متاجر التطبيقات

هذه الخطوة مؤجلة حتى تفتح حسابات المطورين. التطبيق نفسه لا يحتاج إعادة كتابة، فالمتاجر تغلّف نسخة GitHub Pages الحالية. جهّزتُ الملفات هنا لتختصر العمل عند الجاهزية.

| الملف | الغرض |
|---|---|
| `twa-manifest.json` | إعدادات تطبيق Android بتقنية TWA (Bubblewrap) |
| `capacitor.config.json` + `package.json` | تغليف أصلي لـ Android وiOS بأداة Capacitor |
| `privacy-policy.html` | قالب سياسة الخصوصية؛ المتجران يطلبان رابطاً لها |

## قبل البدء (للمتجرين)
1. انشر الموقع على GitHub Pages كما في README الرئيسي، وتأكد أن التثبيت من المتصفح يعمل.
2. عدّل `privacy-policy.html` ببيانات جهتك وارفعه مع الموقع. ضع رابطه في صفحة التطبيق في المتجر.
3. جهّز لقطات شاشة للجوال (3 إلى 8 صور) ووصفاً قصيراً بالعربية والإنجليزية.

## Android — Google Play
**الطريقة الأسهل (PWABuilder):**
1. افتح pwabuilder.com وأدخل رابط موقعك على GitHub Pages.
2. اختر **Android** ثم **Generate Package**. تحصل على ملف `.aab` جاهز للرفع، وملف `assetlinks.json`.
3. ضع `assetlinks.json` في مستودعك داخل المسار `.well-known/assetlinks.json`، حتى يثبت Google أن الموقع ملكك ويختفي شريط المتصفح.
4. من Google Play Console: **Create app**، ثم ارفع ملف `.aab` وأكمل بطاقة المتجر وتقييم المحتوى.

**بديل Bubblewrap:** عدّل `host` والروابط في `twa-manifest.json` باسم حسابك، ثم نفّذ `npx @bubblewrap/cli init --manifest=...` و`build`.

## iOS — App Store (يتطلب جهاز Mac)
1. ثبّت Node.js وXcode.
2. داخل هذا المجلد نفّذ `npm install` ثم `npm run ios`. يُنسخ التطبيق إلى `www` ويُفتح مشروع Xcode.
3. في Xcode اختر فريق المطور (Apple Developer)، وأضف الأيقونات من مجلد `icons`، ثم **Product ← Archive ← Distribute**.
4. أكمل صفحة التطبيق في App Store Connect وأرسله للمراجعة.

**ملاحظة من إرشادات Apple:** تتطلب Apple أن يقدّم التطبيق قيمة تتجاوز «موقعاً داخل غلاف». الأداة تعمل بدون إنترنت، ومصممة للجوال، وفيها وضع الحصة المباشرة، وهذه كلها نقاط قوة. اذكرها في وصف المراجعة.

## Android أصلي عبر Capacitor (اختياري)
نفّذ `npm install` ثم `npm run android`، فيفتح Android Studio لتوقيع التطبيق وبنائه.

## التحديثات بعد النشر
- **TWA / PWABuilder:** يكفي تحديث الموقع على GitHub، فيصل التحديث لمستخدمي Android تلقائياً.
- **Capacitor:** بعد تحديث الموقع نفّذ `npm run sync` ثم ابنِ نسخة جديدة وارفعها للمتجر.

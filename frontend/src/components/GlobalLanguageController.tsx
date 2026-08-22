// src/components/GlobalLanguageController.tsx

import {
  type MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";


/* =========================================================
   GLOBAL ACCESSMATE LANGUAGE CONTROLLER

   Goal:
   - One language source for the whole application.
   - Settings, Landing, Sidebar, Dashboard, Chat, Account,
     Library, Archive, Website Safety and future pages all
     react to accessmate_language.
   - No page refresh required.
   - RTL/LTR is applied globally.
   - Existing hard-coded UI strings are translated while the
     project is gradually migrated to a normal i18n dictionary.

   IMPORTANT:
   - User/assistant chat content is deliberately NOT translated.
   - Input values and uploaded file names are not changed.
   - Only UI text, placeholders, titles and accessibility labels
     are translated.
   ========================================================= */


type AppLanguage =
  | "en"
  | "ar";


const LANGUAGE_KEY =
  "accessmate_language";


/* =========================================================
   TRANSLATION PAIRS
   ========================================================= */

const TRANSLATIONS:
  Array<
    [
      string,
      string
    ]
  > = [

  /* -------------------------------------------------------
     GLOBAL / COMMON
     ------------------------------------------------------- */

  ["Home", "الرئيسية"],
  ["Dashboard", "لوحة التحكم"],
  ["Settings", "الإعدادات"],
  ["Account", "الحساب"],
  ["Profile", "الملف الشخصي"],
  ["Security", "الأمان"],
  ["Library", "المكتبة"],
  ["Archive", "الأرشيف"],
  ["Website Safety", "أمان المواقع"],
  ["Recent Chats", "المحادثات الأخيرة"],
  ["Recent chats", "المحادثات الأخيرة"],
  ["Recent", "الأخيرة"],
  ["Pinned", "المثبتة"],
  ["New chat", "محادثة جديدة"],
  ["New Chat", "محادثة جديدة"],
  ["Search", "بحث"],
  ["Search results", "نتائج البحث"],
  ["Loading...", "جاري التحميل..."],
  ["Refresh", "تحديث"],
  ["Refreshing...", "جاري التحديث..."],
  ["Delete", "حذف"],
  ["Deleting...", "جاري الحذف..."],
  ["Edit", "تعديل"],
  ["Save", "حفظ"],
  ["Saving...", "جاري الحفظ..."],
  ["Remove", "إزالة"],
  ["Cancel", "إلغاء"],
  ["Close", "إغلاق"],
  ["Open", "فتح"],
  ["Download", "تنزيل"],
  ["Downloading...", "جاري التنزيل..."],
  ["Copy", "نسخ"],
  ["Back", "رجوع"],
  ["Logout", "تسجيل الخروج"],
  ["Active", "نشط"],
  ["Inactive", "غير نشط"],
  ["Connected", "متصل"],
  ["Not connected", "غير متصل"],
  ["On", "مفعّل"],
  ["Off", "متوقف"],
  ["ON", "مفعّل"],
  ["OFF", "متوقف"],
  ["Yes", "نعم"],
  ["No", "لا"],
  ["Email", "البريد الإلكتروني"],
  ["Phone", "الهاتف"],
  ["Phone Number", "رقم الهاتف"],
  ["Full Name", "الاسم الكامل"],
  ["Status", "الحالة"],
  ["Created", "تاريخ الإنشاء"],
  ["Updated", "آخر تحديث"],
  ["Created At", "تاريخ الإنشاء"],
  ["Updated At", "آخر تحديث"],
  ["Not available", "غير متاح"],
  ["Unavailable", "غير متاح"],
  ["Verified", "موثّق"],
  ["User", "المستخدم"],
  ["Send", "إرسال"],
  ["Failed", "فشل"],
  ["Pending", "قيد الانتظار"],
  ["Sent", "تم الإرسال"],
  ["Recently", "مؤخرًا"],
  ["Just now", "الآن"],

  /* -------------------------------------------------------
     SIDEBAR
     ------------------------------------------------------- */

  ["Primary navigation", "التنقل الرئيسي"],
  ["Main navigation sidebar", "الشريط الجانبي الرئيسي"],
  ["AccessMate AI dashboard", "لوحة تحكم AccessMate AI"],
  ["Collapse sidebar", "طي الشريط الجانبي"],
  ["Expand sidebar", "توسيع الشريط الجانبي"],
  ["Start a new chat", "بدء محادثة جديدة"],
  ["Chat options", "خيارات المحادثة"],
  ["Pin", "تثبيت"],
  ["Unpin", "إلغاء التثبيت"],
  ["Website Safety", "أمان المواقع"],

  /* -------------------------------------------------------
     DASHBOARD
     ------------------------------------------------------- */

  ["Search AccessMate", "ابحث في AccessMate"],
  [
    "Search chats, files, or AccessMate tools...",
    "ابحث في المحادثات أو الملفات أو أدوات AccessMate..."
  ],
  [
    "Search chats and AccessMate tools",
    "البحث في المحادثات وأدوات AccessMate"
  ],
  ["Clear search", "مسح البحث"],
  ["Get answers to anything", "احصل على إجابة لأي شيء"],
  ["Ask AI", "اسأل الذكاء الاصطناعي"],
  ["General assistant", "مساعد عام"],
  ["Analyze File", "تحليل ملف"],
  ["Analyze file", "تحليل ملف"],
  ["Analyze this file", "حلّل هذا الملف"],
  ["Upload a file and get insights", "ارفع ملفًا واحصل على تحليل ذكي"],
  ["Vision & OCR", "الرؤية واستخراج النص"],
  [
    "Extract text and understand images",
    "استخرج النص وافهم الصور"
  ],
  ["Describe this image", "صف هذه الصورة"],
  [
    "Describe this image and extract useful information for accessibility.",
    "صف هذه الصورة واستخرج المعلومات المفيدة لإمكانية الوصول."
  ],
  ["Voice Assistant", "المساعد الصوتي"],
  ["Speak and get instant help", "تحدث واحصل على مساعدة فورية"],
  ["Explain Simply", "اشرح ببساطة"],
  ["Explain simply", "اشرح ببساطة"],
  ["Explain this simply", "اشرح هذا ببساطة"],
  ["Make complex topics easy", "بسّط الموضوعات المعقدة"],
  ["Check if a website is safe", "تحقق من أمان موقع"],
  [
    "Check suspicious links before opening them.",
    "افحص الروابط المشبوهة قبل فتحها."
  ],
  ["Quick actions", "إجراءات سريعة"],
  ["Main workspace", "مساحة العمل الرئيسية"],
  ["Dashboard top bar", "الشريط العلوي للوحة التحكم"],
  ["Dashboard information panel", "لوحة معلومات لوحة التحكم"],
  ["Care Alert Activity", "نشاط تنبيهات الرعاية"],
  ["Care alert activity", "نشاط تنبيهات الرعاية"],
  ["Care alert notifications", "إشعارات تنبيهات الرعاية"],
  ["Notifications", "الإشعارات"],
  ["Notifications panel", "لوحة الإشعارات"],
  [
    "Sent, pending, and failed alerts will appear here.",
    "ستظهر هنا التنبيهات المرسلة وقيد الانتظار والفاشلة."
  ],
  [
    "Connected to the Care Alerts backend",
    "متصل بنظام تنبيهات الرعاية"
  ],
  ["Refresh notifications", "تحديث الإشعارات"],
  ["Voice Guidance", "الإرشاد الصوتي"],
  ["Voice guidance", "الإرشاد الصوتي"],
  ["Voice guidance status", "حالة الإرشاد الصوتي"],
  ["Navigation narration is active", "الإرشاد الصوتي للتنقل مفعّل"],
  ["Navigation narration is off", "الإرشاد الصوتي للتنقل متوقف"],
  ["Turn voice guidance on", "تشغيل الإرشاد الصوتي"],
  ["Turn voice guidance off", "إيقاف الإرشاد الصوتي"],
  ["Turn on", "تشغيل"],
  ["Turn off", "إيقاف"],
  [
    "Voice guidance is on. Press to turn it off.",
    "الإرشاد الصوتي مفعّل. اضغط لإيقافه."
  ],
  [
    "Voice guidance is off. Press to turn it on.",
    "الإرشاد الصوتي متوقف. اضغط لتشغيله."
  ],
  ["Accessibility tips", "نصائح إمكانية الوصول"],
  ["Tips for You", "نصائح لك"],
  [
    "Use Tab and Shift + Tab to move between controls.",
    "استخدم Tab وShift + Tab للتنقل بين عناصر التحكم."
  ],
  [
    "Use the microphone for hands-free help.",
    "استخدم الميكروفون للحصول على مساعدة دون استخدام اليدين."
  ],
  [
    "Upload documents to get AI insights.",
    "ارفع المستندات للحصول على تحليل بالذكاء الاصطناعي."
  ],
  ["Message AccessMate", "راسل AccessMate"],
  ["Message AccessMate AI", "راسل AccessMate AI"],
  ["Message AccessMate AI...", "اكتب رسالتك إلى AccessMate AI..."],
  [
    "Message AccessMate AI text field",
    "حقل كتابة رسالة إلى AccessMate AI"
  ],
  ["Attach a file", "إرفاق ملف"],
  ["Attach file", "إرفاق ملف"],
  ["Remove file", "إزالة الملف"],
  ["Record voice", "تسجيل صوت"],
  ["Recording voice...", "جاري تسجيل الصوت..."],
  ["Start voice recording", "بدء التسجيل الصوتي"],
  ["Stop voice recording", "إيقاف التسجيل الصوتي"],
  ["Stop recording", "إيقاف التسجيل"],
  ["Send message", "إرسال الرسالة"],
  [
    "What do you want AccessMate to do with this file?",
    "ماذا تريد من AccessMate أن يفعل بهذا الملف؟"
  ],
  ["AI assistant message area", "منطقة رسائل مساعد الذكاء الاصطناعي"],

  /* -------------------------------------------------------
     ACCOUNT
     ------------------------------------------------------- */

  ["Account Center", "مركز الحساب"],
  [
    "Manage your identity, contact details, profile image, and account security.",
    "أدر هويتك وبيانات التواصل وصورة الملف الشخصي وأمان الحساب."
  ],
  ["Profile Information", "معلومات الملف الشخصي"],
  [
    "Update your personal information used across AccessMate.",
    "حدّث معلوماتك الشخصية المستخدمة في AccessMate."
  ],
  ["Your Account", "حسابك"],
  ["Your full name", "اسمك الكامل"],
  ["Email address", "عنوان البريد الإلكتروني"],
  ["Phone number", "رقم الهاتف"],
  ["Account status", "حالة الحساب"],
  ["Account details", "تفاصيل الحساب"],
  ["Login verification", "التحقق من تسجيل الدخول"],
  ["Email OTP enabled", "التحقق بالبريد الإلكتروني مفعّل"],
  ["Password recovery", "استعادة كلمة المرور"],
  ["Email reset code", "رمز إعادة تعيين عبر البريد"],
  ["Session", "الجلسة"],
  ["Authenticated", "تم التحقق"],
  [
    "Password recovery and authenticated session controls.",
    "إعدادات استعادة كلمة المرور والجلسة الموثقة."
  ],
  ["Save Profile", "حفظ الملف الشخصي"],
  ["Save profile", "حفظ الملف الشخصي"],
  ["Send Password Reset Code", "إرسال رمز إعادة تعيين كلمة المرور"],
  ["Send password reset code", "إرسال رمز إعادة تعيين كلمة المرور"],
  ["Sending...", "جاري الإرسال..."],
  ["Change profile photo", "تغيير صورة الملف الشخصي"],
  ["Email unavailable", "البريد الإلكتروني غير متاح"],
  ["Not added", "غير مضاف"],
  ["Logout from AccessMate", "تسجيل الخروج من AccessMate"],
  ["Profile saved successfully.", "تم حفظ الملف الشخصي بنجاح."],
  [
    "Profile image selected. Press Save Profile to keep it.",
    "تم اختيار صورة الملف الشخصي. اضغط حفظ الملف الشخصي للاحتفاظ بها."
  ],
  [
    "Password reset code sent to your email.",
    "تم إرسال رمز إعادة تعيين كلمة المرور إلى بريدك الإلكتروني."
  ],

  /* -------------------------------------------------------
     SETTINGS
     ------------------------------------------------------- */

  ["Adaptive Preferences", "التفضيلات التكيفية"],
  [
    "Configure accessibility, language, caregiver information, and Telegram alert delivery.",
    "اضبط إمكانية الوصول واللغة وبيانات مقدم الرعاية وإرسال التنبيهات عبر تيليجرام."
  ],
  ["User Mode", "وضع المستخدم"],
  ["Language", "اللغة"],
  ["Accessibility", "إمكانية الوصول"],
  ["Accessibility Profile", "ملف إمكانية الوصول"],
  ["Accessibility settings", "إعدادات إمكانية الوصول"],
  [
    "Choose how AccessMate adapts its interface and guidance to you.",
    "اختر كيف يقوم AccessMate بتكييف الواجهة والإرشاد وفق احتياجاتك."
  ],
  ["Mode, language, text & voice", "الوضع واللغة والنص والصوت"],
  ["Standard", "قياسي"],
  ["Blind", "كفيف"],
  ["Low Vision", "ضعف بصري"],
  ["Deaf / Hard of Hearing", "أصم / ضعيف السمع"],
  ["Non-speaking", "غير ناطق"],
  ["Reading Difficulty", "صعوبة في القراءة"],
  ["Combined Needs", "احتياجات متعددة"],
  ["Preferred Language", "اللغة المفضلة"],
  ["Text Size", "حجم النص"],
  ["Normal", "عادي"],
  ["Large", "كبير"],
  ["Extra Large", "كبير جدًا"],
  ["High Contrast", "تباين عالٍ"],
  [
    "Selecting Blind automatically turns Voice Guidance on.",
    "اختيار وضع كفيف يقوم بتشغيل الإرشاد الصوتي تلقائيًا."
  ],
  [
    "Applies a global base text size immediately.",
    "يطبق حجم النص الأساسي على الموقع فورًا."
  ],
  [
    "Applies additional contrast to the application immediately.",
    "يطبق تباينًا إضافيًا على التطبيق فورًا."
  ],
  [
    "Reads focused and activated controls through the global voice guide.",
    "ينطق العناصر التي يتم التركيز عليها أو تفعيلها عبر الإرشاد الصوتي."
  ],
  ["Reset", "إعادة ضبط"],
  ["Reset accessibility settings", "إعادة ضبط إعدادات إمكانية الوصول"],
  ["Save Accessibility", "حفظ إعدادات الوصول"],
  ["Save accessibility settings", "حفظ إعدادات إمكانية الوصول"],
  [
    "Accessibility settings were saved and applied.",
    "تم حفظ وتطبيق إعدادات إمكانية الوصول."
  ],
  ["Accessibility preferences reset.", "تمت إعادة ضبط تفضيلات إمكانية الوصول."],
  [
    "Blind mode enabled. Voice Guidance is now on.",
    "تم تفعيل وضع المكفوفين. الإرشاد الصوتي يعمل الآن."
  ],
  [
    "Blind mode enabled. Voice Guidance was turned on automatically.",
    "تم تفعيل وضع المكفوفين والإرشاد الصوتي تلقائيًا."
  ],
  ["Caregiver", "مقدم الرعاية"],
  ["Caregiver settings", "إعدادات مقدم الرعاية"],
  ["Caregiver Name", "اسم مقدم الرعاية"],
  ["Caregiver name", "اسم مقدم الرعاية"],
  ["Caregiver phone", "هاتف مقدم الرعاية"],
  ["Caregiver email", "بريد مقدم الرعاية"],
  ["Relationship", "صلة القرابة"],
  ["Preferred Alert Channel", "قناة التنبيه المفضلة"],
  ["Primary Caregiver", "مقدم الرعاية الأساسي"],
  ["Trusted support contact", "جهة دعم موثوقة"],
  [
    "Manage the trusted support contact used by caregiver and alert workflows.",
    "إدارة جهة الدعم الموثوقة المستخدمة في مسارات مقدم الرعاية والتنبيهات."
  ],
  ["Father, mother, sibling...", "الأب، الأم، الأخ..."],
  ["Saved with the caregiver profile.", "تُحفظ مع ملف مقدم الرعاية."],
  [
    "Use this person as the primary support contact.",
    "استخدم هذا الشخص كجهة الدعم الأساسية."
  ],
  ["Save Caregiver", "حفظ مقدم الرعاية"],
  ["Caregiver saved successfully.", "تم حفظ بيانات مقدم الرعاية بنجاح."],
  ["Telegram settings", "إعدادات تيليجرام"],
  [
    "Connect Telegram to the existing AccessMate alert workflow.",
    "اربط تيليجرام بمسار تنبيهات AccessMate الحالي."
  ],
  ["Connection Status", "حالة الاتصال"],
  ["Generate Link", "إنشاء الرابط"],
  ["Sync Telegram", "مزامنة تيليجرام"],
  ["Disconnect", "فصل الاتصال"],
  ["Open Telegram Connection", "فتح اتصال تيليجرام"],
  [
    "Create a fresh secure connection link.",
    "إنشاء رابط اتصال جديد."
  ],
  ["Confirm the bot connection.", "تأكيد اتصال البوت."],
  [
    "Remove the active Telegram connection.",
    "إزالة اتصال تيليجرام الحالي."
  ],
  [
    "Generate a link, open Telegram and press Start, then return to AccessMate and sync.",
    "أنشئ الرابط وافتح تيليجرام واضغط Start ثم ارجع إلى AccessMate وقم بالمزامنة."
  ],
  ["Telegram connected successfully.", "تم ربط تيليجرام بنجاح."],
  ["Telegram disconnected.", "تم فصل تيليجرام."],
  ["Loading settings...", "جاري تحميل الإعدادات..."],

  /* -------------------------------------------------------
     LIBRARY
     ------------------------------------------------------- */

  ["Asset Repository", "مستودع الملفات"],
  [
    "Uploaded images, documents, audio, CSV files, and other supported assets in one place.",
    "الصور والمستندات والصوت وملفات CSV وغيرها من الملفات المدعومة في مكان واحد."
  ],
  ["Files", "الملفات"],
  ["Refresh library files", "تحديث ملفات المكتبة"],
  [
    "Search files by name, type, or MIME...",
    "ابحث عن الملفات بالاسم أو النوع أو MIME..."
  ],
  ["Search library files", "البحث في ملفات المكتبة"],
  ["Library header", "رأس صفحة المكتبة"],
  ["Library search", "بحث المكتبة"],
  ["Library files", "ملفات المكتبة"],
  ["No matching files", "لا توجد ملفات مطابقة"],
  ["No files uploaded yet", "لم يتم رفع ملفات بعد"],
  [
    "Try another file name, type, or MIME value.",
    "جرّب اسم ملف أو نوعًا أو قيمة MIME أخرى."
  ],
  [
    "Files uploaded through AccessMate will appear here automatically.",
    "ستظهر الملفات المرفوعة عبر AccessMate هنا تلقائيًا."
  ],
  ["Loading files...", "جاري تحميل الملفات..."],
  ["Untitled file", "ملف بدون اسم"],

  /* -------------------------------------------------------
     ARCHIVE
     ------------------------------------------------------- */

  ["Conversation Archive", "أرشيف المحادثات"],
  ["Archived", "المؤرشفة"],
  ["Archived conversations", "المحادثات المؤرشفة"],
  [
    "Archived conversations stay saved here until you restore or permanently delete them.",
    "تظل المحادثات المؤرشفة محفوظة هنا حتى تستعيدها أو تحذفها نهائيًا."
  ],
  ["No archived chats", "لا توجد محادثات مؤرشفة"],
  [
    "Conversations you archive from the sidebar will appear here automatically.",
    "ستظهر المحادثات التي تؤرشفها من الشريط الجانبي هنا تلقائيًا."
  ],
  ["Loading archived conversations...", "جاري تحميل المحادثات المؤرشفة..."],
  ["Refresh archived conversations", "تحديث المحادثات المؤرشفة"],
  ["Unarchive", "إلغاء الأرشفة"],
  ["Untitled", "بدون عنوان"],

  /* -------------------------------------------------------
     WEBSITE SAFETY
     ------------------------------------------------------- */

  ["Website Protection", "حماية المواقع"],
  [
    "Check suspicious links before you trust them, sign in, download files, or enter personal information.",
    "افحص الروابط المشبوهة قبل الوثوق بها أو تسجيل الدخول أو تنزيل الملفات أو إدخال معلومات شخصية."
  ],
  ["Check URL", "فحص رابط"],
  ["Trusted Domains", "المواقع الموثوقة"],
  ["History", "السجل"],
  ["Check a website", "افحص موقعًا"],
  ["Website URL", "رابط الموقع"],
  ["Check Website", "فحص الموقع"],
  ["Checking...", "جاري الفحص..."],
  ["Risk score", "درجة الخطورة"],
  ["Threat feeds", "مصادر التهديد"],
  ["Known matches", "تهديدات معروفة"],
  ["Engine", "المحرك"],
  ["Official domain", "دومين رسمي"],
  ["Trusted by you", "موثوق بواسطتك"],
  ["Add to trusted domains", "إضافة إلى المواقع الموثوقة"],
  ["Check another URL", "فحص رابط آخر"],
  ["Domain identity", "هوية الدومين"],
  ["Domain", "الدومين"],
  ["Registered domain", "الدومين المسجل"],
  ["Brand", "العلامة"],
  ["Official root", "الدومين الرسمي"],
  ["Identity status", "حالة الهوية"],
  ["Recommended action", "الإجراء المقترح"],
  ["Security signals", "إشارات الأمان"],
  ["Evidence used by the safety engine", "الأدلة التي استخدمها محرك الأمان"],
  ["No additional signals", "لا توجد إشارات إضافية"],
  [
    "The URL did not produce additional local security signals.",
    "لم ينتج الرابط إشارات أمان محلية إضافية."
  ],
  ["Add trusted domain", "إضافة موقع موثوق"],
  ["Edit trusted domain", "تعديل موقع موثوق"],
  ["Website / Brand name", "اسم الموقع"],
  ["Category", "التصنيف"],
  ["Bank, work, personal...", "بنك، عمل، شخصي..."],
  ["Save changes", "حفظ التعديلات"],
  ["Your trusted domains", "المواقع الموثوقة"],
  [
    "Only domains saved by your account appear here.",
    "تظهر هنا فقط المواقع التي أضفتها إلى حسابك."
  ],
  ["No trusted domains yet", "لا توجد مواقع موثوقة بعد"],
  [
    "Add websites you recognize and regularly use.",
    "أضف المواقع التي تعرفها وتستخدمها باستمرار."
  ],
  ["Website check history", "سجل فحص المواقع"],
  [
    "Previous checks saved to your account.",
    "عمليات الفحص السابقة المحفوظة في حسابك."
  ],
  ["No website checks yet", "لا توجد عمليات فحص بعد"],
  [
    "Your future website checks will appear here.",
    "ستظهر عمليات فحص المواقع هنا بعد استخدامها."
  ],
  ["Score", "الدرجة"],
  ["Trusted", "موثوق"],
  ["Threat match", "تم العثور على تهديد"],
  ["No known match", "لا يوجد تطابق معروف"],

  /* -------------------------------------------------------
     AUTH
     ------------------------------------------------------- */

  ["AI Powered Accessibility", "إمكانية وصول مدعومة بالذكاء الاصطناعي"],
  ["Adaptive AI for Accessibility", "ذكاء اصطناعي متكيف لإمكانية الوصول"],
  ["Without Limits", "بلا حدود"],
  ["Secure Access", "وصول آمن"],
  ["Secure access", "وصول آمن"],
  ["Welcome back.", "مرحبًا بعودتك."],
  ["Login", "تسجيل الدخول"],
  ["Log in", "تسجيل الدخول"],
  ["Signing in...", "جاري تسجيل الدخول..."],
  ["Create account", "إنشاء حساب"],
  ["Create Account", "إنشاء حساب"],
  ["Create your account.", "أنشئ حسابك."],
  ["Creating account...", "جاري إنشاء الحساب..."],
  ["First name", "الاسم الأول"],
  ["Last name", "اسم العائلة"],
  ["Username", "اسم المستخدم"],
  ["Password", "كلمة المرور"],
  ["Confirm password", "تأكيد كلمة المرور"],
  ["Remember me", "تذكرني"],
  ["Forgot password?", "نسيت كلمة المرور؟"],
  ["New to AccessMate?", "جديد في AccessMate؟"],
  ["Already a member?", "لديك حساب بالفعل؟"],
  ["Start for free", "ابدأ مجانًا"],
  ["Back home", "العودة للرئيسية"],
  ["Back to login", "العودة لتسجيل الدخول"],
  ["Show password", "إظهار كلمة المرور"],
  ["Hide password", "إخفاء كلمة المرور"],
  ["Verification", "التحقق"],
  ["Verify your email.", "تحقق من بريدك الإلكتروني."],
  ["OTP code", "رمز التحقق"],
  ["Verify", "تحقق"],
  ["Verifying...", "جاري التحقق..."],
  ["Resend code", "إعادة إرسال الرمز"],
  ["Account recovery", "استعادة الحساب"],
  ["Reset password", "إعادة تعيين كلمة المرور"],
  ["Reset your password.", "أعد تعيين كلمة المرور."],
  ["Reset code", "رمز إعادة التعيين"],
  ["New password", "كلمة المرور الجديدة"],
  ["Confirm new password", "تأكيد كلمة المرور الجديدة"],
  ["Send reset code", "إرسال رمز إعادة التعيين"],
  ["Resetting...", "جاري إعادة التعيين..."],
  ["Country", "الدولة"],
  ["Egypt", "مصر"],

  /* -------------------------------------------------------
     PUBLIC WEBSITE
     ------------------------------------------------------- */

  ["Features", "المميزات"],
  ["Solutions", "الحلول"],
  ["About Us", "من نحن"],
  ["Get Started", "ابدأ الآن"],
  ["Main navigation", "التنقل الرئيسي"],
  ["Toggle menu", "فتح أو إغلاق القائمة"],
  ["AccessMate AI Home", "الرئيسية - AccessMate AI"],
  ["Smart Features", "مميزات ذكية"],
  ["Accessible", "متاح للجميع"],
  ["Bilingual Support", "دعم ثنائي اللغة"],
  ["Voice Assistant", "المساعد الصوتي"],
  ["Vision Support", "دعم الرؤية"],
  ["Web Safety", "أمان الويب"],
  ["Caregiver Alerts", "تنبيهات مقدم الرعاية"],
  ["Speak, listen & get instant help.", "تحدث واستمع واحصل على مساعدة فورية."],
  ["Understand the world with AI vision.", "افهم العالم باستخدام الرؤية بالذكاء الاصطناعي."],
  ["Browse safely with AI protection.", "تصفح بأمان مع حماية الذكاء الاصطناعي."],
  ["Real-time alerts to your caregivers.", "تنبيهات فورية لمقدمي الرعاية."],
  ["Partner With Us", "كن شريكًا معنا"],
  [
    "Welcome to AccessMate AI. Accessibility without limits.",
    "مرحبًا بك في AccessMate AI. إمكانية وصول بلا حدود."
  ],
  [
    "Technology should adapt to people, not the other way around.",
    "يجب أن تتكيف التكنولوجيا مع الناس، وليس العكس."
  ],

  /* -------------------------------------------------------
     WORKSPACE / NAVIGATION COMPLETION
     ------------------------------------------------------- */

  ["Chats", "المحادثات"],
  ["Hearing Assistant", "مساعد السمع"],
  ["Care Center", "مركز الرعاية"],
  ["Alert History", "سجل التنبيهات"],
  ["AccessMate Workspace", "مساحة عمل AccessMate"],
  ["Conversation Workspace", "مساحة المحادثات"],
  ["Conversation", "المحادثة"],
  ["Online", "متصل"],
  ["Today", "اليوم"],
  ["Emergency", "طوارئ"],
  ["Ready", "جاهز"],
  ["Paused", "متوقف مؤقتًا"],
  ["Listening", "يستمع"],
  ["Monitoring", "يراقب"],
  ["Stop", "إيقاف"],
  ["Pause", "إيقاف مؤقت"],
  ["Resume", "استئناف"],
  ["Clear", "مسح"],
  ["English", "الإنجليزية"],
  ["Arabic", "العربية"],
  ["XL", "كبير جدًا"],

  /* -------------------------------------------------------
     CHATS
     ------------------------------------------------------- */

  [
    "Search, open, pin, archive, restore, or permanently delete your AccessMate conversations.",
    "ابحث في محادثات AccessMate وافتحها أو ثبّتها أو أرشفها أو استعدها أو احذفها نهائيًا."
  ],
  ["Search conversations...", "ابحث في المحادثات..."],
  ["Search conversations", "البحث في المحادثات"],
  ["Conversation filters", "مرشحات المحادثات"],
  ["All Chats", "كل المحادثات"],
  ["Conversation list", "قائمة المحادثات"],
  ["Loading conversations...", "جاري تحميل المحادثات..."],
  ["No conversations found", "لم يتم العثور على محادثات"],
  [
    "Try another search or filter, or start a new conversation.",
    "جرّب بحثًا أو مرشحًا آخر، أو ابدأ محادثة جديدة."
  ],
  ["Updated", "آخر تحديث"],
  ["Are you sure you want to permanently delete this chat?", "هل تريد حذف هذه المحادثة نهائيًا؟"],
  ["Failed to archive chat.", "تعذر أرشفة المحادثة."],
  ["Failed to unarchive chat.", "تعذر إلغاء أرشفة المحادثة."],
  ["Failed to delete chat.", "تعذر حذف المحادثة."],

  /* -------------------------------------------------------
     CHAT PAGE
     ------------------------------------------------------- */

  ["Your intelligent accessibility assistant", "مساعدك الذكي لإمكانية الوصول"],
  ["How can I help you?", "كيف يمكنني مساعدتك؟"],
  ["How can I help you today?", "كيف يمكنني مساعدتك اليوم؟"],
  ["Start a conversation with AccessMate AI", "ابدأ محادثة مع AccessMate AI"],
  ["Recording", "جارٍ التسجيل"],
  ["Click mic to stop", "اضغط على الميكروفون للإيقاف"],
  ["AccessMate is processing your request...", "يعالج AccessMate طلبك..."],
  ["Ask anything about this document...", "اسأل أي شيء عن هذا المستند..."],
  ["Messages are secure and encrypted", "الرسائل آمنة ومشفرة"],
  ["Start recording", "بدء التسجيل"],
  ["Recording voice...", "جاري تسجيل الصوت..."],
  ["Invalid conversation ID.", "معرّف المحادثة غير صالح."],
  ["Failed to save message.", "تعذر حفظ الرسالة."],
  ["Authentication token not found.", "لم يتم العثور على رمز المصادقة."],
  ["Microphone recording is not supported in this browser.", "تسجيل الميكروفون غير مدعوم في هذا المتصفح."],
  ["Failed to start microphone:", "تعذر تشغيل الميكروفون:"],

  /* -------------------------------------------------------
     HEARING ASSISTANT
     ------------------------------------------------------- */

  [
    "Live communication and environmental sound awareness.",
    "تواصل مباشر ووعي بالأصوات المحيطة."
  ],
  ["Conversation", "المحادثة"],
  ["Sound Awareness", "الوعي بالأصوات"],
  ["LIVE CONVERSATION", "المحادثة المباشرة"],
  ["Speech appears here in real time", "يظهر الكلام هنا في الوقت الفعلي"],
  ["Fullscreen captions", "عرض النص بملء الشاشة"],
  ["Speech will appear here when listening starts.", "سيظهر الكلام هنا عند بدء الاستماع."],
  ["Translating…", "جاري الترجمة…"],
  ["Translation unavailable", "الترجمة غير متاحة"],
  ["Microphone paused", "الميكروفون متوقف مؤقتًا"],
  ["Live streaming", "استماع مباشر"],
  ["Whisper listening", "Whisper يستمع"],
  ["Microphone off", "الميكروفون متوقف"],
  ["Start Listening", "بدء الاستماع"],
  ["TYPE TO SPEAK", "اكتب ليتم النطق"],
  ["Type a reply and AccessMate will speak it aloud.", "اكتب ردك وسيقوم AccessMate بنطقه بصوت واضح."],
  ["Type your reply...", "اكتب الرد هنا..."],
  ["Clear text", "مسح النص"],
  ["Speak", "نطق"],
  ["Stop Speaking", "إيقاف النطق"],
  ["Caption Settings", "إعدادات النص المباشر"],
  ["Spoken language", "لغة الكلام"],
  ["Caption size", "حجم النص"],
  ["Live Translation", "الترجمة المباشرة"],
  ["Translate final captions", "ترجمة المقاطع النصية النهائية"],
  ["To English", "إلى الإنجليزية"],
  ["Session Transcript", "نص الجلسة"],
  ["Save session", "حفظ الجلسة"],
  ["Save Session", "حفظ الجلسة"],
  ["Add at least one caption before saving", "أضف مقطعًا نصيًا واحدًا على الأقل قبل الحفظ"],
  ["Save this hearing session to your account", "احفظ جلسة السمع هذه في حسابك"],
  ["Copy transcript", "نسخ نص الجلسة"],
  ["Download transcript", "تنزيل نص الجلسة"],
  ["No captions yet.", "لا توجد مقاطع نصية بعد."],
  ["SOUND AWARENESS", "الوعي بالأصوات"],
  [
    "YAMNet monitors important environmental sounds and creates visual alerts.",
    "يراقب YAMNet الأصوات البيئية المهمة ويُنشئ تنبيهات مرئية."
  ],
  ["Initializing…", "جاري التهيئة…"],
  ["Start Monitoring", "بدء المراقبة"],
  ["Stop Monitoring", "إيقاف المراقبة"],
  ["Listening to the environment", "جارٍ الاستماع إلى البيئة المحيطة"],
  ["Sound monitoring is off", "مراقبة الأصوات متوقفة"],
  [
    "Important sounds require repeated detection unless confidence is very high, reducing accidental alerts.",
    "تتطلب الأصوات المهمة اكتشافًا متكررًا ما لم تكن الثقة مرتفعة جدًا، لتقليل التنبيهات العرضية."
  ],
  ["Recent Sound Alerts", "تنبيهات الأصوات الأخيرة"],
  ["No important sounds detected yet.", "لم يتم اكتشاف أصوات مهمة بعد."],
  ["Confidence", "الثقة"],
  ["Emergency confirmation", "تأكيد الطوارئ"],
  ["Emergency Assistance", "مساعدة طارئة"],
  [
    "Do you want AccessMate to send an emergency care alert to your caregiver?",
    "هل تريد من AccessMate إرسال تنبيه رعاية طارئ إلى مقدم الرعاية؟"
  ],
  ["Sending…", "جاري الإرسال…"],
  ["Send Alert", "إرسال التنبيه"],
  ["Emergency alert sent to your caregiver.", "تم إرسال تنبيه الطوارئ إلى مقدم الرعاية."],
  ["Important environmental sound detected.", "تم اكتشاف صوت بيئي مهم."],
  ["Transcript copied.", "تم نسخ نص الجلسة."],
  ["Saving session...", "جاري حفظ الجلسة..."],
  ["Server save failed; a local backup was kept on this device.", "فشل الحفظ على الخادم، وتم الاحتفاظ بنسخة محلية على هذا الجهاز."],
  ["Unable to save this session to the server or this device.", "تعذر حفظ هذه الجلسة على الخادم أو هذا الجهاز."],
  ["Microphone access is not supported in this browser.", "الوصول إلى الميكروفون غير مدعوم في هذا المتصفح."],
  ["Microphone or speech-recognition permission was denied.", "تم رفض إذن الميكروفون أو التعرف على الكلام."],
  ["Unable to start microphone.", "تعذر تشغيل الميكروفون."],
  ["Text-to-Speech is not supported in this browser.", "تحويل النص إلى كلام غير مدعوم في هذا المتصفح."],
  ["Unable to start Sound Awareness.", "تعذر تشغيل الوعي بالأصوات."],
  ["Alarm", "إنذار"],
  ["Siren", "صفارة إنذار"],
  ["Doorbell", "جرس الباب"],
  ["Baby Cry", "بكاء طفل"],
  ["Knocking", "طرق على الباب"],
  ["Alert Beep", "صفارة تنبيه"],

  /* -------------------------------------------------------
     CARE CENTER COMPLETION
     ------------------------------------------------------- */

  ["AccessMate Care System", "نظام الرعاية في AccessMate"],
  ["Refresh Care Center", "تحديث مركز الرعاية"],
  ["Loading Care Center...", "جاري تحميل مركز الرعاية..."],
  ["Primary Caregiver", "مقدم الرعاية الأساسي"],
  ["Not configured", "غير مُعد"],
  ["Disconnect Telegram", "فصل تيليجرام"],
  ["Active Alerts", "التنبيهات النشطة"],
  ["Telegram caregiver connection", "ربط مقدم الرعاية بتيليجرام"],
  ["Connect Telegram Alerts", "ربط تنبيهات تيليجرام"],
  ["Connect Telegram", "ربط تيليجرام"],
  ["Check connection", "التحقق من الاتصال"],
  ["Quick care needs", "احتياجات الرعاية السريعة"],
  ["What do you need?", "ماذا تحتاج؟"],
  ["Configure a caregiver from Settings first.", "قم بإعداد مقدم رعاية من الإعدادات أولًا."],
  ["No daily needs are available.", "لا توجد احتياجات يومية متاحة."],
  ["Monitor ongoing alerts here.", "تابع التنبيهات الجارية هنا."],
  ["Alert options", "خيارات التنبيه"],
  ["No active alerts", "لا توجد تنبيهات نشطة"],
  ["You're all set!", "كل شيء على ما يرام!"],
  ["Alert acknowledged successfully.", "تم تأكيد استلام التنبيه بنجاح."],
  ["Alert resolved successfully.", "تم إغلاق التنبيه بنجاح."],

  /* -------------------------------------------------------
     ALERT HISTORY
     ------------------------------------------------------- */

  ["Care Alert Timeline", "الخط الزمني لتنبيهات الرعاية"],
  [
    "Review every care alert lifecycle, including Hearing Assistant emergencies and linked environmental-sound events.",
    "راجع دورة حياة كل تنبيه رعاية، بما في ذلك طوارئ مساعد السمع وأحداث الأصوات البيئية المرتبطة."
  ],
  ["Loading alert history...", "جاري تحميل سجل التنبيهات..."],
  ["Total Alerts", "إجمالي التنبيهات"],
  ["Search message, sound, source, risk...", "ابحث بالرسالة أو الصوت أو المصدر أو الخطورة..."],
  ["Search alert history", "البحث في سجل التنبيهات"],
  ["All Statuses", "كل الحالات"],
  ["All Risks", "كل مستويات الخطورة"],
  ["All Sources", "كل المصادر"],
  ["Clear Filters", "مسح المرشحات"],
  ["Pending, sent, acknowledged, resolved and failed alerts", "تنبيهات قيد الانتظار والمرسلة والمؤكدة والمغلقة والفاشلة"],
  ["There are no care alerts yet.", "لا توجد تنبيهات رعاية بعد."],
  ["No alerts match the selected filters.", "لا توجد تنبيهات تطابق المرشحات المحددة."],
  ["User Confirmed", "أكد المستخدم"],
  ["Linked Environmental Sound", "صوت بيئي مرتبط"],
  ["Legacy - Sign Language", "قديم - لغة الإشارة"],

  /* -------------------------------------------------------
     LIBRARY COMPLETION
     ------------------------------------------------------- */

  ["Total Files", "إجمالي الملفات"],
  ["Across all categories", "عبر جميع التصنيفات"],
  ["Documents", "المستندات"],
  ["Images", "الصور"],
  ["Audio", "الصوت"],
  ["Others", "أخرى"],
  ["Other supported files", "ملفات أخرى مدعومة"],
  ["Name", "الاسم"],
  ["Type", "النوع"],
  ["Size", "الحجم"],
  ["Last Modified", "آخر تعديل"],
  ["Actions", "الإجراءات"],
  ["IMAGE", "صورة"],
  ["DOCUMENT", "مستند"],
  ["AUDIO", "صوت"],
  ["OTHER", "أخرى"],
  ["Are you sure you want to permanently delete this file?", "هل تريد حذف هذا الملف نهائيًا؟"],
  ["Failed to download file.", "تعذر تنزيل الملف."],

  /* -------------------------------------------------------
     WEBSITE SAFETY COMPLETION / BACKEND RESULT TEXT
     ------------------------------------------------------- */

  ["Paste the full link or domain. AccessMate checks domain identity, suspicious patterns, phishing sources, and malware intelligence.", "الصق الرابط الكامل أو النطاق. يتحقق AccessMate من هوية النطاق والأنماط المشبوهة ومصادر التصيد ومعلومات البرمجيات الضارة."],
  ["Check website form", "نموذج فحص الموقع"],
  ["Website scanner", "فاحص المواقع"],
  ["Website URL to check", "رابط الموقع المراد فحصه"],
  ["Clear URL", "مسح الرابط"],
  ["A low-risk result means no major configured signal or known threat match was found. It is not a guarantee that a website is safe.", "النتيجة منخفضة الخطورة تعني عدم العثور على مؤشر خطر رئيسي مُعد أو تهديد معروف، ولا تُعد ضمانًا بأن الموقع آمن."],
  ["Copy URL", "نسخ الرابط"],
  ["Official, trusted, and impersonation checks", "فحوصات الموقع الرسمي والموثوق وانتحال الهوية"],
  ["What AccessMate recommends you do next", "ما يوصي AccessMate بفعله بعد ذلك"],
  ["Trusted status never overrides phishing or malware warnings.", "حالة الموقع الموثوق لا تتجاوز تحذيرات التصيد أو البرمجيات الضارة."],
  ["Website Safety is a decision-support feature. A domain can change or become compromised after a previous check, so important links should be checked again when needed.", "ميزة أمان المواقع أداة لدعم القرار. قد يتغير النطاق أو يتعرض للاختراق بعد فحص سابق، لذلك يجب إعادة فحص الروابط المهمة عند الحاجة."],
  ["No major URL-level risk signs were found, and the threat sources that completed returned no match.", "لم يتم العثور على مؤشرات خطورة رئيسية على مستوى الرابط، ولم تُظهر مصادر التهديد المكتملة أي تطابق."],
  ["This link has some caution signs. Check the domain carefully.", "يحتوي هذا الرابط على بعض مؤشرات الحذر. تحقق من النطاق بعناية."],
  ["LOW", "منخفض"],
  ["MEDIUM", "متوسط"],
  ["HIGH", "مرتفع"],
  ["CRITICAL", "حرج"],
  ["CAUTION", "حذر"],
  ["ALLOW", "سماح"],
  ["BLOCK", "حظر"],

  /* -------------------------------------------------------
     SETTINGS COMPLETION
     ------------------------------------------------------- */

  ["Manage accessibility preferences, trusted caregivers, and Telegram care alerts.", "إدارة تفضيلات إمكانية الوصول ومقدمي الرعاية الموثوقين وتنبيهات الرعاية عبر تيليجرام."],
  ["Settings sections", "أقسام الإعدادات"],
  ["Mode, language, text and voice", "الوضع واللغة والنص والصوت"],
  ["Manage trusted support contacts", "إدارة جهات الدعم الموثوقة"],
  ["Configure real care alert delivery", "إعداد إرسال تنبيهات الرعاية الفعلية"],
  ["Every option below applies a real interface or guidance change.", "كل خيار أدناه يطبق تغييرًا فعليًا على الواجهة أو الإرشاد."],
  ["Select a working accessibility preset.", "اختر إعدادًا مسبقًا مناسبًا لإمكانية الوصول."],
  ["Changes language direction between LTR and RTL immediately.", "يغير اتجاه الصفحة بين LTR وRTL فورًا."],
  ["Changes the global application base font size.", "يغير حجم الخط الأساسي للتطبيق بالكامل."],
  ["Enables AccessMate voice guidance and browser speech output.", "يفعّل الإرشاد الصوتي في AccessMate ونطق المتصفح."],
  ["Increases application contrast and focus visibility.", "يزيد تباين التطبيق ووضوح التركيز."],
  ["Manage the trusted contacts used by AccessMate Care Center.", "إدارة جهات الاتصال الموثوقة التي يستخدمها مركز رعاية AccessMate."],
  ["No caregivers have been added yet.", "لم تتم إضافة مقدمي رعاية بعد."],
  ["Edit Caregiver", "تعديل مقدم الرعاية"],
  ["Add Caregiver", "إضافة مقدم رعاية"],
  ["Create or update a trusted support contact.", "أنشئ أو حدّث جهة دعم موثوقة."],
  ["Parent, sibling, friend...", "والد، أخ، صديق..."],
  ["Alert Delivery", "إرسال التنبيهات"],
  ["Active Caregiver", "مقدم رعاية نشط"],
  ["Save Changes", "حفظ التغييرات"],
  ["Check Connection", "التحقق من الاتصال"],
  ["Open Telegram Bot", "فتح بوت تيليجرام"],


  /* -------------------------------------------------------
     FINAL UI COVERAGE
     ------------------------------------------------------- */

  ["AccessMate tools", "أدوات AccessMate"],
  ["No matching chats or tools.", "لا توجد محادثات أو أدوات مطابقة."],
  ["Live care-alert activity", "نشاط تنبيهات الرعاية المباشر"],
  ["Loading notifications...", "جاري تحميل الإشعارات..."],
  ["No care alerts yet", "لا توجد تنبيهات رعاية بعد"],
  ["AccessMate User", "مستخدم AccessMate"],
  ["Dashboard greeting", "تحية لوحة التحكم"],
  ["Unable to record audio.", "تعذر تسجيل الصوت."],
  ["Microphone permission was denied or the microphone is unavailable.", "تم رفض إذن الميكروفون أو أن الميكروفون غير متاح."],
  ["Failed to load conversations:", "تعذر تحميل المحادثات:"],
  ["Failed to archive conversation:", "تعذر أرشفة المحادثة:"],
  ["Failed to unarchive conversation:", "تعذر إلغاء أرشفة المحادثة:"],
  ["Failed to delete conversation:", "تعذر حذف المحادثة:"],
  ["• Click mic to stop", "• اضغط على الميكروفون للإيقاف"],
  ["captions", "مقاطع نصية"],
  ["detected events", "أحداث مكتشفة"],
  ["Please choose an image file.", "يرجى اختيار ملف صورة."],
  ["Account header", "رأس صفحة الحساب"],
  ["Loading account data...", "جاري تحميل بيانات الحساب..."],
  ["Account profile summary", "ملخص الملف الشخصي للحساب"],
  ["Profile information", "معلومات الملف الشخصي"],
  ["Full name", "الاسم الكامل"],
  ["Account security", "أمان الحساب"],
  ["Website Safety sections", "أقسام أمان المواقع"],
  ["Archive header", "رأس صفحة الأرشيف"],
  ["Blind mode enabled. Voice Guidance and High Contrast are now active.", "تم تفعيل وضع المكفوفين. الإرشاد الصوتي والتباين العالي يعملان الآن."],
  ["Combined accessibility mode enabled.", "تم تفعيل وضع إمكانية الوصول المتعدد."],
  ["AccessMate language changed to English.", "تم تغيير لغة AccessMate إلى الإنجليزية."],
  ["Voice Guidance is now on.", "تم تشغيل الإرشاد الصوتي."],
  ["Accessibility settings were saved and applied on this device.", "تم حفظ إعدادات إمكانية الوصول وتطبيقها على هذا الجهاز."],
  ["Edit caregiver", "تعديل مقدم الرعاية"],
  ["Delete caregiver", "حذف مقدم الرعاية"],

];


/* =========================================================
   MAPS
   ========================================================= */

const EN_TO_AR =
  new Map<string, string>(
    TRANSLATIONS
  );

const AR_TO_EN =
  new Map<string, string>(
    TRANSLATIONS.map(
      (
        [
          english,
          arabic,
        ]
      ) => [
        arabic,
        english,
      ]
    )
  );


/* =========================================================
   TRANSLATION HELPERS
   ========================================================= */

function getStoredLanguage():
  AppLanguage {
  return localStorage.getItem(
    LANGUAGE_KEY
  ) ===
  "ar"
    ? "ar"
    : "en";
}


function preserveWhitespace(
  original:
    string,
  translated:
    string
) {
  const leading =
    original.match(
      /^\s*/
    )?.[0] ||
    "";

  const trailing =
    original.match(
      /\s*$/
    )?.[0] ||
    "";

  return (
    leading +
    translated +
    trailing
  );
}


function translateDynamic(
  value:
    string,
  language:
    AppLanguage
) {
  const text =
    value.trim();


  if (
    language ===
    "ar"
  ) {
    const dynamicArabic:
      Array<
        [
          RegExp,
          (
            match:
              RegExpMatchArray
          ) => string
        ]
      > = [
      [
        /^Good morning\b(.*)$/i,
        (
          match
        ) =>
          `صباح الخير${match[1] || ""}`,
      ],

      [
        /^Good afternoon\b(.*)$/i,
        (
          match
        ) =>
          `مساء الخير${match[1] || ""}`,
      ],

      [
        /^Good evening\b(.*)$/i,
        (
          match
        ) =>
          `مساء الخير${match[1] || ""}`,
      ],

      [
        /^Notifications,\s*(\d+)\s*unread$/i,
        (
          match
        ) =>
          `الإشعارات، ${match[1]} غير مقروءة`,
      ],

      [
        /^Notifications\.\s*(\d+)\s*unread\.?$/i,
        (
          match
        ) =>
          `الإشعارات. ${match[1]} غير مقروءة.`,
      ],

      [
        /^Open conversation\s+(.+)$/i,
        (
          match
        ) =>
          `فتح المحادثة ${match[1]}`,
      ],

      [
        /^Open chat\s+(.+)$/i,
        (
          match
        ) =>
          `فتح المحادثة ${match[1]}`,
      ],

      [
        /^Options for\s+(.+)$/i,
        (
          match
        ) =>
          `خيارات ${match[1]}`,
      ],

      [
        /^Delete\s+(.+)\s+permanently$/i,
        (
          match
        ) =>
          `حذف ${match[1]} نهائيًا`,
      ],

      [
        /^Unarchive\s+(.+)$/i,
        (
          match
        ) =>
          `إلغاء أرشفة ${match[1]}`,
      ],

      [
        /^Download\s+(.+)$/i,
        (
          match
        ) =>
          `تنزيل ${match[1]}`,
      ],

      [
        /^Delete\s+(.+)$/i,
        (
          match
        ) =>
          `حذف ${match[1]}`,
      ],

      [
        /^Remove\s+(.+)$/i,
        (
          match
        ) =>
          `إزالة ${match[1]}`,
      ],

      [
        /^(\d+)\s+unread$/i,
        (
          match
        ) =>
          `${match[1]} غير مقروءة`,
      ],

      [
        /^Updated\s+(.+)$/i,
        (
          match
        ) =>
          `آخر تحديث ${match[1]}`,
      ],

      [
        /^(\d+)\s+captions$/i,
        (
          match
        ) =>
          `${match[1]} مقاطع نصية`,
      ],

      [
        /^(\d+)\s+detected events$/i,
        (
          match
        ) =>
          `${match[1]} أحداث مكتشفة`,
      ],

      [
        /^Confidence\s+(\d+)%$/i,
        (
          match
        ) =>
          `الثقة ${match[1]}%`,
      ],

      [
        /^(.+) was detected\. Do you want to alert your caregiver\?$/i,
        (
          match
        ) => {
          const translatedLabel =
            EN_TO_AR.get(match[1]) || match[1];

          return `تم اكتشاف ${translatedLabel}. هل تريد تنبيه مقدم الرعاية؟`;
        },
      ],

      [
        /^The domain matches a recognized official domain for\s+(.+),\s+and no major URL-level risk signs were found\.?$/i,
        (
          match
        ) =>
          `يتطابق النطاق مع نطاق رسمي معروف لـ ${match[1]}، ولم يتم العثور على مؤشرات خطورة رئيسية على مستوى الرابط.`,
      ],

      [
        /^Quick action\s+(\d+)\s+of\s+(\d+)$/i,
        (
          match
        ) =>
          `إجراء سريع ${match[1]} من ${match[2]}`,
      ],
    ];


    for (
      const [
        pattern,
        replacement,
      ] of dynamicArabic
    ) {
      const match =
        text.match(
          pattern
        );

      if (
        match
      ) {
        return replacement(
          match
        );
      }
    }
  }


  if (
    language ===
    "en"
  ) {
    const dynamicEnglish:
      Array<
        [
          RegExp,
          (
            match:
              RegExpMatchArray
          ) => string
        ]
      > = [
      [
        /^صباح الخير(.*)$/,
        (
          match
        ) =>
          `Good morning${match[1] || ""}`,
      ],

      [
        /^مساء الخير(.*)$/,
        (
          match
        ) =>
          `Good evening${match[1] || ""}`,
      ],

      [
        /^الإشعارات،\s*(\d+)\s*غير مقروءة$/,
        (
          match
        ) =>
          `Notifications, ${match[1]} unread`,
      ],

      [
        /^الإشعارات\.\s*(\d+)\s*غير مقروءة\.?$/,
        (
          match
        ) =>
          `Notifications. ${match[1]} unread.`,
      ],

      [
        /^فتح المحادثة\s+(.+)$/,
        (
          match
        ) =>
          `Open conversation ${match[1]}`,
      ],

      [
        /^خيارات\s+(.+)$/,
        (
          match
        ) =>
          `Options for ${match[1]}`,
      ],

      [
        /^حذف\s+(.+)\s+نهائيًا$/,
        (
          match
        ) =>
          `Delete ${match[1]} permanently`,
      ],

      [
        /^إلغاء أرشفة\s+(.+)$/,
        (
          match
        ) =>
          `Unarchive ${match[1]}`,
      ],

      [
        /^تنزيل\s+(.+)$/,
        (
          match
        ) =>
          `Download ${match[1]}`,
      ],

      [
        /^إزالة\s+(.+)$/,
        (
          match
        ) =>
          `Remove ${match[1]}`,
      ],

      [
        /^(\d+)\s+غير مقروءة$/,
        (
          match
        ) =>
          `${match[1]} unread`,
      ],

      [
        /^آخر تحديث\s+(.+)$/,
        (
          match
        ) =>
          `Updated ${match[1]}`,
      ],

      [
        /^(\d+)\s+مقاطع نصية$/,
        (
          match
        ) =>
          `${match[1]} captions`,
      ],

      [
        /^(\d+)\s+أحداث مكتشفة$/,
        (
          match
        ) =>
          `${match[1]} detected events`,
      ],

      [
        /^الثقة\s+(\d+)%$/,
        (
          match
        ) =>
          `Confidence ${match[1]}%`,
      ],

      [
        /^تم اكتشاف\s+(.+)\. هل تريد تنبيه مقدم الرعاية؟$/,
        (
          match
        ) => {
          const translatedLabel =
            AR_TO_EN.get(match[1]) || match[1];

          return `${translatedLabel} was detected. Do you want to alert your caregiver?`;
        },
      ],

      [
        /^إجراء سريع\s+(\d+)\s+من\s+(\d+)$/,
        (
          match
        ) =>
          `Quick action ${match[1]} of ${match[2]}`,
      ],
    ];


    for (
      const [
        pattern,
        replacement,
      ] of dynamicEnglish
    ) {
      const match =
        text.match(
          pattern
        );

      if (
        match
      ) {
        return replacement(
          match
        );
      }
    }
  }


  return null;
}


function translateText(
  original:
    string,
  language:
    AppLanguage
) {
  if (
    !original
  ) {
    return original;
  }


  const trimmed =
    original.trim();


  if (
    !trimmed
  ) {
    return original;
  }


  const map =
    language ===
    "ar"
      ? EN_TO_AR
      : AR_TO_EN;


  const exact =
    map.get(
      trimmed
    );


  if (
    exact
  ) {
    return preserveWhitespace(
      original,
      exact
    );
  }


  const dynamic =
    translateDynamic(
      trimmed,
      language
    );


  if (
    dynamic
  ) {
    return preserveWhitespace(
      original,
      dynamic
    );
  }


  return original;
}


/* =========================================================
   SAFETY: DO NOT TRANSLATE USER / AI CONTENT
   ========================================================= */

const DO_NOT_TRANSLATE_SELECTOR = [
  "[data-no-translate]",
  '[translate="no"]',

  /*
   * Chat messages are content, not UI.
   */
  "[data-message-content]",
  '[data-role="user"]',
  '[data-role="assistant"]',
  ".message-bubble",
  ".chat-message",
  ".user-message",
  ".assistant-message",
  ".message-content",
  ".chat-message-content",

  /*
   * Code / document content should stay untouched.
   */
  "code",
  "pre",
  "kbd",
  "samp",
].join(
  ","
);


function shouldSkipElement(
  element:
    Element | null
) {
  if (
    !element
  ) {
    return false;
  }


  if (
    element.matches(
      DO_NOT_TRANSLATE_SELECTOR
    )
  ) {
    return true;
  }


  return Boolean(
    element.closest(
      DO_NOT_TRANSLATE_SELECTOR
    )
  );
}


/* =========================================================
   DOM TRANSLATION
   ========================================================= */

const TRANSLATABLE_ATTRIBUTES = [
  "placeholder",
  "title",
  "aria-label",
  "data-voice-label",
  "data-voice-context",
] as const;


function translateElementAttributes(
  element:
    Element,
  language:
    AppLanguage
) {
  if (
    shouldSkipElement(
      element
    )
  ) {
    return;
  }


  for (
    const attribute of
    TRANSLATABLE_ATTRIBUTES
  ) {
    const current =
      element.getAttribute(
        attribute
      );


    if (
      !current
    ) {
      continue;
    }


    const translated =
      translateText(
        current,
        language
      );


    if (
      translated !==
      current
    ) {
      element.setAttribute(
        attribute,
        translated
      );
    }
  }
}


function translateTextNode(
  node:
    Text,
  language:
    AppLanguage
) {
  const parent =
    node.parentElement;


  if (
    !parent ||
    shouldSkipElement(
      parent
    )
  ) {
    return;
  }


  /*
   * Never modify form values.
   */
  if (
    parent instanceof
      HTMLInputElement ||
    parent instanceof
      HTMLTextAreaElement
  ) {
    return;
  }


  const current =
    node.nodeValue ||
    "";


  const translated =
    translateText(
      current,
      language
    );


  if (
    translated !==
    current
  ) {
    node.nodeValue =
      translated;
  }
}


function translateNode(
  node:
    Node,
  language:
    AppLanguage
) {
  if (
    node.nodeType ===
    Node.TEXT_NODE
  ) {
    translateTextNode(
      node as Text,
      language
    );

    return;
  }


  if (
    node.nodeType !==
    Node.ELEMENT_NODE
  ) {
    return;
  }


  const element =
    node as Element;


  if (
    shouldSkipElement(
      element
    )
  ) {
    return;
  }


  translateElementAttributes(
    element,
    language
  );


  const walker =
    document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT |
        NodeFilter.SHOW_TEXT
    );


  let current:
    Node | null =
    walker.currentNode;


  while (
    current
  ) {
    if (
      current.nodeType ===
      Node.TEXT_NODE
    ) {
      translateTextNode(
        current as Text,
        language
      );
    } else if (
      current.nodeType ===
      Node.ELEMENT_NODE
    ) {
      translateElementAttributes(
        current as Element,
        language
      );
    }


    current =
      walker.nextNode();
  }
}


function translateWholePage(
  language:
    AppLanguage
) {
  if (
    !document.body
  ) {
    return;
  }


  translateNode(
    document.body,
    language
  );
}


/* =========================================================
   GLOBAL DOCUMENT DIRECTION
   ========================================================= */

function applyDocumentLanguage(
  language:
    AppLanguage
) {
  document.documentElement.lang =
    language ===
    "ar"
      ? "ar"
      : "en";


  document.documentElement.dir =
    language ===
    "ar"
      ? "rtl"
      : "ltr";


  document.body?.classList.toggle(
    "app-arabic",
    language ===
      "ar"
  );


  document.body?.classList.toggle(
    "app-english",
    language ===
      "en"
  );


  document.body?.setAttribute(
    "dir",
    language ===
    "ar"
      ? "rtl"
      : "ltr"
  );
}


/* =========================================================
   OPTIONAL NATIVE DIALOG TRANSLATION
   ========================================================= */

function installDialogTranslation(
  languageRef:
    MutableRefObject<AppLanguage>
) {
  const originalAlert =
    window.alert.bind(
      window
    );

  const originalConfirm =
    window.confirm.bind(
      window
    );


  window.alert =
    (
      message?:
        any
    ) => {
      const value =
        String(
          message ??
          ""
        );


      originalAlert(
        translateText(
          value,
          languageRef.current
        )
      );
    };


  window.confirm =
    (
      message?:
        string
    ) => {
      const value =
        String(
          message ??
          ""
        );


      return originalConfirm(
        translateText(
          value,
          languageRef.current
        )
      );
    };


  return () => {
    window.alert =
      originalAlert;

    window.confirm =
      originalConfirm;
  };
}


/* =========================================================
   COMPONENT
   ========================================================= */

export default function GlobalLanguageController() {
  const [
    language,
    setLanguage
  ] =
    useState<AppLanguage>(
      getStoredLanguage
    );


  const languageRef =
    useRef<AppLanguage>(
      language
    );


  useEffect(() => {
    languageRef.current =
      language;


    applyDocumentLanguage(
      language
    );


    /*
     * Run after React has finished the current paint.
     */
    const frame =
      window.requestAnimationFrame(
        () => {
          translateWholePage(
            language
          );
        }
      );


    return () => {
      window.cancelAnimationFrame(
        frame
      );
    };
  }, [
    language,
  ]);


  useEffect(() => {
    const observer =
      new MutationObserver(
        (
          mutations
        ) => {
          const currentLanguage =
            languageRef.current;


          for (
            const mutation of
            mutations
          ) {
            if (
              mutation.type ===
              "characterData"
            ) {
              translateNode(
                mutation.target,
                currentLanguage
              );

              continue;
            }


            if (
              mutation.type ===
              "attributes"
            ) {
              translateNode(
                mutation.target,
                currentLanguage
              );

              continue;
            }


            for (
              const addedNode of
              Array.from(
                mutation.addedNodes
              )
            ) {
              translateNode(
                addedNode,
                currentLanguage
              );
            }
          }
        }
      );


    if (
      document.body
    ) {
      observer.observe(
        document.body,
        {
          childList:
            true,

          subtree:
            true,

          characterData:
            true,

          attributes:
            true,

          attributeFilter:
            [
              ...TRANSLATABLE_ATTRIBUTES,
            ],
        }
      );
    }


    return () => {
      observer.disconnect();
    };
  }, []);


  useEffect(() => {
    /*
     * Same-tab localStorage changes do not trigger the native
     * "storage" event, so we support:
     * - current AccessMate custom events
     * - native storage for other tabs
     * - a small fallback check for any old language control
     */
    function syncLanguage(
      explicit?:
        unknown
    ) {
      const eventLanguage =
        explicit ===
        "ar" ||
        explicit ===
        "en"
          ? explicit
          : null;


      const next:
        AppLanguage =
        eventLanguage ||
        getStoredLanguage();


      setLanguage(
        (
          current
        ) =>
          current ===
          next
            ? current
            : next
      );
    }


    function handlePublicLanguageChange(
      event:
        Event
    ) {
      const custom =
        event as
          CustomEvent<any>;


      const detailLanguage =
        custom.detail?.language ||
        custom.detail?.lang ||
        custom.detail;


      syncLanguage(
        detailLanguage
      );
    }


    function handleSettingsChange(
      event:
        Event
    ) {
      const custom =
        event as
          CustomEvent<any>;


      syncLanguage(
        custom.detail
          ?.preferredLanguage
      );
    }


    function handleStorage(
      event:
        StorageEvent
    ) {
      if (
        event.key ===
        LANGUAGE_KEY
      ) {
        syncLanguage(
          event.newValue
        );
      }
    }


    window.addEventListener(
      "accessmate-public-language-change",
      handlePublicLanguageChange
    );


    window.addEventListener(
      "accessmate-language-change",
      handlePublicLanguageChange
    );


    window.addEventListener(
      "accessmate-settings-updated",
      handleSettingsChange
    );


    window.addEventListener(
      "storage",
      handleStorage
    );


    const interval =
      window.setInterval(
        () => {
          syncLanguage();
        },
        350
      );


    return () => {
      window.removeEventListener(
        "accessmate-public-language-change",
        handlePublicLanguageChange
      );


      window.removeEventListener(
        "accessmate-language-change",
        handlePublicLanguageChange
      );


      window.removeEventListener(
        "accessmate-settings-updated",
        handleSettingsChange
      );


      window.removeEventListener(
        "storage",
        handleStorage
      );


      window.clearInterval(
        interval
      );
    };
  }, []);


  useEffect(() => {
    return installDialogTranslation(
      languageRef
    );
  }, []);


  /*
   * No visual UI. This component controls the whole document.
   */
  return null;
}

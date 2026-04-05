import React from 'react'
import { Link } from 'react-router-dom'
import TemporaryLayout from './TemporaryLayout'
import { TEMPORARY_SITE_ROUTES } from './constants'

const cards = [
  {
    title: 'شجرة العائلة',
    description: 'مدخل سريع إلى النسخة المؤقتة من شجرة العائلة مع عرض تدريجي وعرض عضوي.',
    to: TEMPORARY_SITE_ROUTES.familyTree,
    accent: 'from-emerald-700 via-green-700 to-lime-600',
    action: 'فتح صفحة الشجرة'
  },
  {
    title: 'الأخبار',
    description: 'متابعة الأخبار عبر كاش الأخبار الحالي حتى تعود المنصة الأصلية بكامل محتواها.',
    to: TEMPORARY_SITE_ROUTES.news,
    accent: 'from-amber-700 via-orange-700 to-red-600',
    action: 'فتح صفحة الأخبار'
  }
]

const TemporaryHomePage = () => {
  return (
    <TemporaryLayout
      title="سنعود قريباً"
      subtitle="نعمل حالياً على تشغيل بديل مؤقت وآمن للموقع الرسمي بعد تعثر المحتوى السابق. إلى أن تكتمل الاستعادة، يمكنك الوصول سريعاً إلى شجرة العائلة والأخبار من هنا."
      badge="واجهة مؤقتة"
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <section className="space-y-6">
          <div className="rounded-[30px] border border-emerald-100 bg-emerald-50/70 p-6 shadow-sm">
            <div className="text-sm font-bold text-emerald-800">حالة المنصة</div>
            <p className="mt-3 text-lg leading-8 text-stone-700">
              المحتوى الحالي بديل مؤقت للموقع الأصلي، وتم عزله عن الواجهة القديمة حتى نعيد الخدمة تدريجياً بثبات أعلى.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {cards.map((card) => (
              <Link
                key={card.to}
                to={card.to}
                className="group overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
              >
                <div className={`h-3 bg-gradient-to-l ${card.accent}`} />
                <div className="p-6">
                  <h2 className="text-2xl font-black text-stone-900">{card.title}</h2>
                  <p className="mt-3 min-h-[84px] text-sm leading-7 text-stone-600">{card.description}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">
                    {card.action}
                    <span className="transition group-hover:-translate-x-1">‹</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-[32px] border border-stone-200 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-stone-500">روابط إضافية</p>
          <div className="mt-5 space-y-3">
            <Link
              to={TEMPORARY_SITE_ROUTES.familyTree}
              className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm font-semibold text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"
            >
              <span>المنصة الرقمية لشجرة عائلة الشاعر</span>
              <span>‹</span>
            </Link>
            <Link
              to={TEMPORARY_SITE_ROUTES.news}
              className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm font-semibold text-stone-700 transition hover:border-amber-300 hover:text-amber-800"
            >
              <span>آخر الأخبار المتاحة</span>
              <span>‹</span>
            </Link>
          </div>

          <div className="mt-6 rounded-[28px] bg-stone-900 px-5 py-6 text-white">
            <div className="text-xs font-bold uppercase tracking-[0.26em] text-stone-300">ملاحظة</div>
            <p className="mt-3 text-sm leading-7 text-stone-100">
              تم تجهيز هذه الواجهة لتكون بديلاً مؤقتاً سريعاً دون المساس ببنية المحتوى القديم داخل المشروع.
            </p>
          </div>
        </aside>
      </div>
    </TemporaryLayout>
  )
}

export default TemporaryHomePage

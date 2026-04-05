import React from 'react'
import { Link } from 'react-router-dom'
import TemporaryLayout from './TemporaryLayout'
import { TEMPORARY_SITE_CREDITS, TEMPORARY_SITE_ROUTES } from './constants'

const treeOptions = [
  {
    title: 'شجرة العائلة التدريجي',
    description: 'عرض متدرج يساعد على تتبع التسلسل العائلي جيلاً بعد جيل بصورة واضحة ومريحة.',
    to: TEMPORARY_SITE_ROUTES.progressiveTree,
    accent: 'border-emerald-200 hover:border-emerald-400 hover:text-emerald-900'
  },
  {
    title: 'الشجرة العضوية',
    description: 'عرض شجري بصري يوضح الفروع الرئيسية والارتباطات العائلية في بنية مرنة ومباشرة.',
    to: TEMPORARY_SITE_ROUTES.organicTree,
    accent: 'border-amber-200 hover:border-amber-400 hover:text-amber-900'
  }
]

const TemporaryFamilyTreePage = () => {
  return (
    <TemporaryLayout
      title="المنصه الرقميه لشجرة عائلة الشاعر"
      subtitle="اختر طريقة العرض المناسبة للوصول إلى شجرة العائلة بالشكل التدريجي أو بالشكل الشجري."
      badge="شجرة العائلة"
      footer="المنصة الرقمية الرسمية لشجرة عائلة الشاعر."
    >
      <div className="relative overflow-hidden rounded-[34px] border border-stone-200 bg-[linear-gradient(135deg,#fffdf8,#f8f5ed,#f5efe5)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="absolute left-0 top-0 h-36 w-36 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-amber-100/70 blur-3xl" />

        <div className="relative z-10 space-y-6">
          <div className="rounded-[28px] bg-[linear-gradient(135deg,#052e2b,#14532d,#3f6212)] p-6 text-white shadow-[0_18px_60px_rgba(5,46,43,0.25)]">
            <div className="text-sm font-bold text-emerald-100">البوابة الرئيسية</div>
            <div className="mt-3 text-3xl font-black sm:text-4xl">شجرة العائلة</div>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-white/85 sm:text-base">
              الوصول إلى الشجرة متاح عبر عرضين بصريين مختلفين، بحيث يختار الزائر الشكل الأنسب
              له في التصفح والقراءة.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {treeOptions.map((option) => (
              <Link
                key={option.to}
                to={option.to}
                className={`rounded-[28px] border bg-white/90 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${option.accent}`}
              >
                <div className="text-xl font-black text-stone-900">{option.title}</div>
                <p className="mt-3 text-sm leading-7 text-stone-600">{option.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold">
                  فتح العرض
                  <span>‹</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-8 text-left text-xs leading-6 text-stone-500 sm:absolute sm:bottom-6 sm:left-6 sm:mt-0 sm:max-w-xs">
          <div>{TEMPORARY_SITE_CREDITS.development}</div>
          <div>{TEMPORARY_SITE_CREDITS.editorial}</div>
        </div>
      </div>
    </TemporaryLayout>
  )
}

export default TemporaryFamilyTreePage

import React from 'react'
import TemporaryLayout from './TemporaryLayout'

const TemporaryNewsPage = () => {
  return (
    <TemporaryLayout
      title="قسم الأخبار"
      subtitle="هذا القسم سيظهر قريباً بعد ربط الموقع بلوحة الإدارة الجديدة الخاصة بإضافة الأخبار وإدارتها."
      badge="الأخبار"
      footer="قسم الأخبار قيد التجهيز ضمن الإدارة الجديدة للموقع."
    >
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[34px] border border-stone-200 bg-[linear-gradient(135deg,#fff8ef,#fffdf8,#f6f1e7)] p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-12">
          <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-700">
            ⏳
          </div>
          <h2 className="mt-6 text-3xl font-black text-stone-900 sm:text-4xl">قريباً</h2>
          <p className="mt-4 text-base leading-8 text-stone-600 sm:text-lg">
            نعمل على تجهيز قسم الأخبار ليكون مرتبطاً مباشرة بلوحة إدارة جديدة تتيح إضافة المحتوى
            وتنظيمه بصورة أفضل.
          </p>
        </div>
      </div>
    </TemporaryLayout>
  )
}

export default TemporaryNewsPage

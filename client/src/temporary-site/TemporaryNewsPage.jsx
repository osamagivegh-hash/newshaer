import React, { useEffect, useMemo, useState } from 'react'
import TemporaryLayout from './TemporaryLayout'

const API_ROOT = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  : ''

const formatDate = (value) => {
  if (!value) return 'تاريخ غير متوفر'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'تاريخ غير متوفر'

  return new Intl.DateTimeFormat('ar', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(parsed)
}

const TemporaryNewsPage = () => {
  const [items, setItems] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadNews = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_ROOT}/api/news?limit=24`, {
          signal: controller.signal
        })

        if (!response.ok) {
          throw new Error('تعذر جلب الأخبار المؤقتة')
        }

        const payload = await response.json()
        const nextItems = Array.isArray(payload?.data?.items) ? payload.data.items : []

        setItems(nextItems)
        setLastUpdated(payload?.data?.lastUpdated || null)
      } catch (loadError) {
        if (loadError.name === 'AbortError') return
        setError(loadError.message || 'تعذر تحميل الأخبار')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    loadNews()

    return () => controller.abort()
  }, [])

  const renderedItems = useMemo(() => items.slice(0, 24), [items])

  return (
    <TemporaryLayout
      title="الأخبار"
      subtitle="هذه الصفحة تعرض الأخبار المتاحة حالياً من كاش الأخبار حتى تظل الواجهة المؤقتة عاملة حتى أثناء أعمال الاستعادة."
      badge="أخبار مؤقتة"
      footer="مصدر هذه الصفحة هو كاش الأخبار الحالي، لذلك تبقى صالحة للعمل كجزء من البديل المؤقت للموقع."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-500">الحالة</div>
            <div className="mt-2 text-lg font-black text-stone-900">
              {loading ? 'جاري التحميل' : error ? 'يوجد خلل' : 'جاهزة'}
            </div>
          </div>
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-500">عدد الأخبار</div>
            <div className="mt-2 text-lg font-black text-stone-900">{renderedItems.length}</div>
          </div>
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-500">آخر تحديث</div>
            <div className="mt-2 text-sm font-bold text-stone-900">{formatDate(lastUpdated)}</div>
          </div>
        </div>

        {loading && (
          <div className="rounded-[30px] border border-stone-200 bg-white p-10 text-center text-stone-600 shadow-sm">
            جاري تحميل الأخبار المؤقتة...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[30px] border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && renderedItems.length === 0 && (
          <div className="rounded-[30px] border border-stone-200 bg-white p-10 text-center text-stone-600 shadow-sm">
            لا توجد أخبار متاحة حالياً داخل الكاش.
          </div>
        )}

        {!loading && !error && renderedItems.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            {renderedItems.map((item, index) => (
              <article
                key={`${item.link || item.title}-${index}`}
                className="rounded-[30px] border border-white bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500">
                  <span className="rounded-full bg-stone-100 px-3 py-1">{item.source || 'مصدر غير محدد'}</span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{formatDate(item.pubDate)}</span>
                </div>
                <h2 className="mt-4 text-xl font-black leading-9 text-stone-900">{item.title || 'خبر بدون عنوان'}</h2>
                <p className="mt-3 text-sm leading-8 text-stone-600">
                  {item.description || 'لا يوجد وصف مختصر لهذا الخبر حالياً.'}
                </p>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-800 transition hover:text-emerald-900"
                  >
                    قراءة الخبر من المصدر
                    <span>‹</span>
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </TemporaryLayout>
  )
}

export default TemporaryNewsPage

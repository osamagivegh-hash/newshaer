import React from 'react'
import { Link } from 'react-router-dom'
import { TEMPORARY_SITE_ROUTES } from './constants'

const navItems = [
  { label: 'الرئيسية', to: TEMPORARY_SITE_ROUTES.home },
  { label: 'شجرة العائلة', to: TEMPORARY_SITE_ROUTES.familyTree },
  { label: 'الأخبار', to: TEMPORARY_SITE_ROUTES.news }
]

const TemporaryLayout = ({
  title,
  subtitle,
  badge = 'الواجهة الرسمية',
  children,
  footer
}) => {
  return (
    <div
      className="min-h-screen rtl-content text-stone-900"
      dir="rtl"
      style={{
        backgroundImage:
          'radial-gradient(circle at top, rgba(250,204,21,0.18), transparent 20%), radial-gradient(circle at 85% 15%, rgba(22,163,74,0.16), transparent 18%), linear-gradient(180deg, #faf7ef 0%, #f4efe5 52%, #fbfaf7 100%)'
      }}
    >
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              {badge}
            </div>
            <div className="mt-2 text-lg font-black text-stone-900">منصة عائلة الشاعر</div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-300 hover:text-emerald-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/70 bg-white/80 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="border-b border-stone-100 bg-[linear-gradient(135deg,#042f2e,#14532d,#365314)] px-6 py-8 text-white sm:px-8">
            <div className="max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-emerald-100/80">Alshaer Family Platform</p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
              {subtitle && (
                <p className="mt-4 max-w-3xl text-sm leading-8 text-white/85 sm:text-base">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8 sm:py-10">{children}</div>
        </section>
      </main>

      <footer className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-white/60 bg-white/70 px-6 py-4 text-sm text-stone-600 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur">
          {footer || 'المنصة الرقمية الرسمية لعائلة الشاعر.'}
        </div>
      </footer>
    </div>
  )
}

export default TemporaryLayout

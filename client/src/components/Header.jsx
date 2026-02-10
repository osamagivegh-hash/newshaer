import React, { useState, useEffect } from 'react'
import SearchBar from './common/SearchBar'
import MobileMenu from './common/MobileMenu'

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    let lastScrollTime = 0

    const handleScroll = () => {
      const now = Date.now()
      if (now - lastScrollTime < 100) return
      lastScrollTime = now

      setIsScrolled(window.scrollY > 50)

      // Update active section based on scroll position
      const sections = ['hero', 'news', 'conversations', 'palestine', 'articles', 'gallery', 'contact']
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId) => {
    // للرئيسية نذهب لأعلى الصفحة تماماً
    if (sectionId === 'hero') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
      return
    }

    const element = document.getElementById(sectionId)
    if (!element) return

    const headerEl = document.querySelector('header')
    const tickerEl = document.getElementById('news-tickers')
    const headerHeight = headerEl?.offsetHeight || 0
    const tickerHeight = tickerEl?.offsetHeight || 0
    const offset = headerHeight + tickerHeight + 20 // small margin

    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const targetPosition = Math.max(elementPosition - offset, 0)

    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    })
  }

  const navItems = [
    { id: 'hero', label: 'الرئيسية' },
    { id: 'family-tree', label: 'شجرة العائلة' },
    { id: 'news', label: 'الأخبار' },
    { id: 'conversations', label: 'حوارات' },
    { id: 'palestine', label: 'فلسطين' },
    { id: 'articles', label: 'مقالات' },
    { id: 'gallery', label: 'معرض الصور' },
    { id: 'contact', label: 'تواصل معنا' },
  ]

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // أيقونة العائلة/الأشخاص
  const FamilyPresenceIcon = () => (
    <svg
      className="w-4 h-4 md:w-5 md:h-5 text-palestine-green"
      viewBox="0 0 24 24"
      fill="currentColor"
      title="تواجد العائلة"
    >
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  )

  return (
    <header
      className={`fixed top-0 left-0 right-0 transition-colors duration-300 ${isScrolled
        ? 'bg-white shadow-md border-b border-gray-100'
        : 'bg-gradient-to-b from-white via-white/98 to-white/95'
        }`}
      style={{ zIndex: 1000 }}
    >
      {/* شريط زخرفي علوي بألوان فلسطين */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="flex-1 bg-gradient-to-r from-palestine-black to-palestine-black/80"></div>
        <div className="flex-1 bg-gradient-to-r from-white to-gray-100 border-y border-gray-200"></div>
        <div className="flex-1 bg-gradient-to-r from-palestine-green/80 to-palestine-green"></div>
        <div className="flex-1 bg-gradient-to-r from-palestine-red to-palestine-red/80"></div>
      </div>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 h-20 md:h-24 flex items-center justify-between">

        {/* Right Side: Logo & Branding */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div
            onClick={() => scrollToSection('hero')}
            className="cursor-pointer group flex flex-col items-start"
          >
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-palestine-black via-palestine-green to-palestine-red bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105 font-kufi">
              عائلة الشاعر
            </h1>
            <span className="text-[10px] md:text-xs text-gray-600 font-medium tracking-wide mt-1 hidden sm:block opacity-80 group-hover:opacity-100 transition-opacity">
              المنصه الرقميه لشجرة عائلة الشاعر
            </span>
            <div className="h-0.5 w-16 group-hover:w-full bg-gradient-to-r from-palestine-green to-palestine-red transition-all duration-500 mt-1"></div>
          </div>
        </div>

        {/* Center: Navigation (Desktop) */}
        <div className="hidden lg:flex items-center justify-center flex-1 px-8">
          <div className="flex items-center space-x-reverse space-x-1 bg-gray-50 rounded-full px-3 py-1.5 shadow-sm border border-gray-100">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  scrollToSection(item.id)
                }}
                className={`relative px-4 py-2 text-sm font-bold rounded-full transition-all duration-200 cursor-pointer select-none whitespace-nowrap hover:scale-105 active:scale-95 ${activeSection === item.id
                  ? 'bg-gradient-to-r from-palestine-green to-olive-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-palestine-green hover:bg-white hover:shadow-sm'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Left Side: Actions (Flags, Search, Mobile Menu) */}
        <div className="flex items-center gap-3 md:gap-4">

          {/* Flags Container - Now Inline */}
          <div className="hidden md:flex items-center gap-2 bg-gray-50/50 rounded-full px-3 py-1.5 border border-gray-100 hover:bg-white transition-colors">

            {/* Family Presence Icon */}
            <div className="text-palestine-green px-1 cursor-pointer hover:scale-110 transition-transform" title="تواجد العائلة">
              <FamilyPresenceIcon />
            </div>

            {/* Palestine */}
            <div className="relative group cursor-pointer hover:-translate-y-1 transition-transform duration-200">
              <img src="https://flagcdn.com/w40/ps.png" alt="فلسطين" className="w-9 h-6 rounded shadow-sm object-cover border border-gray-200" />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">فلسطين</div>
            </div>

            {/* Egypt */}
            <div className="relative group cursor-pointer hover:-translate-y-1 transition-transform duration-200">
              <img src="https://flagcdn.com/w40/eg.png" alt="مصر" className="w-9 h-6 rounded shadow-sm object-cover border border-gray-200" />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">مصر</div>
            </div>

            {/* Jordan */}
            <div className="relative group cursor-pointer hover:-translate-y-1 transition-transform duration-200">
              <img src="https://flagcdn.com/w40/jo.png" alt="الأردن" className="w-9 h-6 rounded shadow-sm object-cover border border-gray-200" />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">الأردن</div>
            </div>

            {/* KSA */}
            <div className="relative group cursor-pointer hover:-translate-y-1 transition-transform duration-200">
              <img src="https://flagcdn.com/w40/sa.png" alt="السعودية" className="w-9 h-6 rounded shadow-sm object-cover border border-gray-200" />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">السعودية</div>
            </div>

          </div>

          {/* Search Bar - Icon on Mobile, Bar on Desktop */}
          <div className="hidden xl:block w-48 transition-all duration-300 focus-within:w-64">
            <SearchBar />
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden relative">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="group flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 text-black hover:text-palestine-green hover:bg-gray-100 border border-gray-200 shadow-sm transition-all duration-300 active:scale-95 touch-manipulation"
              aria-label="فتح القائمة"
            >
              <svg className="h-7 w-7 transition-transform group-hover:rotate-180 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        navItems={navItems}
        activeSection={activeSection}
        scrollToSection={scrollToSection}
      />
    </header>
  )
}

export default Header

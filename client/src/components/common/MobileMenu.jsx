import React, { useState, useEffect } from 'react'
import SearchBar from './SearchBar'

const MobileMenu = ({ isOpen, onClose, navItems, activeSection, scrollToSection }) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleNavClick = (item) => {
    if (item.route) {
      window.location.href = item.route;
    } else {
      scrollToSection(item.id)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 md:hidden pointer-events-auto"
        style={{ zIndex: 90 }}
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className={`
          fixed top-0 right-0 w-80 max-w-[85vw] bg-white shadow-2xl 
          transform transition-transform duration-300 ease-in-out md:hidden flex flex-col pointer-events-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ zIndex: 100, height: '100dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-palestine-black">عائلة الشاعر</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="إغلاق القائمة"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <SearchBar className="w-full" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto">
          <div className="py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`
                  w-full text-right px-4 py-3 text-base transition-colors duration-200
                  ${activeSection === item.id
                    ? 'bg-palestine-green text-white border-r-4 border-olive-600'
                    : 'text-palestine-black hover:bg-gray-50 hover:text-palestine-green'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {activeSection === item.id && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">تواصل معنا</p>
            <div className="flex justify-center space-x-4 space-x-reverse">
              <a
                href="mailto:info@alshaerfamily.com"
                className="p-2 rounded-full bg-palestine-green text-white hover:bg-olive-700 transition-colors"
                aria-label="البريد الإلكتروني"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </a>
              <a
                href="tel:+970123456789"
                className="p-2 rounded-full bg-palestine-green text-white hover:bg-olive-700 transition-colors"
                aria-label="الهاتف"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default MobileMenu

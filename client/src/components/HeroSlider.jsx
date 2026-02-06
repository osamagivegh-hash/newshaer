import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../utils/api'
import { normalizeImageUrl } from '../utils/imageUtils'

const HeroSlider = () => {
  const [slides, setSlides] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await api.get('/hero-slides')
        const data = response.data?.data || response.data || []
        setSlides(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching hero slides:', error)
        setSlides([])
      } finally {
        setLoading(false)
      }
    }

    fetchSlides()
  }, [])

  // Auto-advance slides every 5 seconds from the start
  useEffect(() => {
    if (slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [slides.length])

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index)
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  // Don't render if loading
  if (loading) {
    return (
      <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gradient-to-b from-olive-50 to-palestine-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palestine-green"></div>
      </div>
    )
  }

  // Don't show anything if no slides
  if (slides.length === 0) {
    return null
  }

  return (
    <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-palestine-black">
      {/* Slides - INSTANT transition (no animation) - popup/replace effect */}
      {slides.map((slide, index) => (
        <div
          key={slide.id || slide._id || index}
          className={`absolute inset-0 ${index === currentSlide ? 'block z-10' : 'hidden z-0'
            }`}
          style={{ transition: 'none' }}
        >
          {/* Background Image */}
          <img
            src={normalizeImageUrl(slide.image)}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading={index === 0 ? 'eager' : 'lazy'}
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>

          {/* Content */}
          <div className="absolute inset-0 flex items-end justify-center pb-16 md:pb-24">
            <div className="text-center px-4 max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4 drop-shadow-lg">
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-4 md:mb-6 drop-shadow-md">
                  {slide.subtitle}
                </p>
              )}
              {slide.link && (
                <a
                  href={slide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-palestine-green hover:bg-olive-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-300 shadow-lg hover:shadow-xl"
                >
                  {slide.linkText || 'اقرأ المزيد'}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full shadow-lg"
            aria-label="الشريحة السابقة"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 rounded-full shadow-lg"
            aria-label="الشريحة التالية"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-3 rounded-full ${index === currentSlide
                  ? 'bg-palestine-green w-8'
                  : 'bg-white/50 hover:bg-white/80 w-3'
                }`}
              aria-label={`الانتقال للشريحة ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Palestine Flag Decorative Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 z-20 flex">
        <div className="flex-1 bg-palestine-black"></div>
        <div className="flex-1 bg-palestine-white"></div>
        <div className="flex-1 bg-palestine-green"></div>
        <div className="flex-1 bg-palestine-red"></div>
      </div>
    </div>
  )
}

export default HeroSlider

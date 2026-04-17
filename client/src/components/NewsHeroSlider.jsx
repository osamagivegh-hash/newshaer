import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'

const CATEGORY_ICONS = {
  'تعازي': '🕊️',
  'أفراح وزواجات': '💍',
  'صلح وجاهات واحتفالات وفعاليات': '🎉',
  'مواليد': '👶',
  'إعلانات': '📢',
  'أخبار عامة': '📰'
}

const CATEGORY_COLORS = {
  'تعازي': 'bg-gray-700',
  'أفراح وزواجات': 'bg-pink-600',
  'صلح وجاهات واحتفالات وفعاليات': 'bg-amber-600',
  'مواليد': 'bg-blue-500',
  'إعلانات': 'bg-purple-600',
  'أخبار عامة': 'bg-green-700'
}

const NewsHeroSlider = () => {
  const [posts, setPosts] = useState([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    api.get('/fb-posts/latest', { params: { limit: 8 } })
      .then(res => {
        if (res.data?.success) {
          setPosts(res.data.data.filter(p => p.image_url))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Auto-advance every 3 seconds
  useEffect(() => {
    if (posts.length <= 1 || isPaused) return
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % posts.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [posts.length, isPaused])

  const goTo = useCallback((i) => setCurrentSlide(i), [])
  const goPrev = useCallback(() => setCurrentSlide(prev => (prev - 1 + posts.length) % posts.length), [posts.length])
  const goNext = useCallback(() => setCurrentSlide(prev => (prev + 1) % posts.length), [posts.length])

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch { return '' }
  }

  const truncate = (text, max = 120) => {
    if (!text) return ''
    return text.length > max ? text.slice(0, max) + '...' : text
  }

  if (loading) {
    return (
      <div className="w-full h-[200px] sm:h-[300px] md:h-[420px] bg-gradient-to-b from-gray-100 to-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-palestine-green"></div>
      </div>
    )
  }

  if (posts.length === 0) return null

  const post = posts[currentSlide]

  return (
    <section
      className="relative w-full h-[200px] sm:h-[300px] md:h-[420px] overflow-hidden bg-black"
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      {posts.map((p, i) => (
        <div
          key={p._id}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            i === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        >
          {/* Background Image */}
          <img
            src={p.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading={i === 0 ? 'eager' : 'lazy'}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-8 z-10">
        <Link to={`/news/${post._id}`} className="block group">
          {/* Category Badge */}
          <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-white mb-1.5 sm:mb-3 ${CATEGORY_COLORS[post.category] || 'bg-gray-600'}`}>
            {CATEGORY_ICONS[post.category]} {post.category}
          </span>

          {/* Text */}
          <p className="text-white text-sm sm:text-base md:text-xl font-semibold leading-snug sm:leading-relaxed mb-1 sm:mb-2 line-clamp-2 group-hover:text-palestine-green transition-colors">
            {truncate(post.message, typeof window !== 'undefined' && window.innerWidth < 640 ? 80 : 180)}
          </p>

          {/* Date */}
          <span className="text-gray-300 text-[10px] sm:text-xs md:text-sm">
            {formatDate(post.created_time)}
          </span>
        </Link>

        {/* Dots */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-4">
          {posts.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 rounded-full ${
                i === currentSlide
                  ? 'w-5 sm:w-8 h-1.5 sm:h-2 bg-palestine-green'
                  : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`خبر ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goPrev}
        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-sm"
        aria-label="الخبر السابق"
      >
        <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button
        onClick={goNext}
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center transition backdrop-blur-sm"
        aria-label="الخبر التالي"
      >
        <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Slide Counter */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs text-white">
        {currentSlide + 1} / {posts.length}
      </div>

      {/* View All News Link */}
      <Link
        to="/news"
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-palestine-green/80 backdrop-blur-sm hover:bg-palestine-green rounded-full px-2.5 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs text-white font-medium transition"
      >
        📰 جميع الأخبار
      </Link>
    </section>
  )
}

export default NewsHeroSlider

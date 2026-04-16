import React, { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
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

const FbNewsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState(null)

  const currentCategory = searchParams.get('category') || ''
  const currentPage = parseInt(searchParams.get('page'), 10) || 1
  const searchQuery = searchParams.get('q') || ''

  // Fetch stats on mount
  useEffect(() => {
    api.get('/fb-posts/stats').then(res => {
      if (res.data?.success) setStats(res.data.data)
    }).catch(() => {})
  }, [])

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const params = { page: currentPage, limit: 20 }
        if (currentCategory) params.category = currentCategory
        if (searchQuery) params.q = searchQuery
        const res = await api.get('/fb-posts', { params })
        if (res.data?.success) {
          setPosts(res.data.data.posts)
          setPagination(res.data.data.pagination)
          setCategories(res.data.data.categories)
        }
      } catch (err) {
        console.error('Error fetching posts:', err)
        setPosts([])
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentCategory, currentPage, searchQuery])

  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (v) newParams.set(k, v)
      else newParams.delete(k)
    })
    setSearchParams(newParams, { replace: true })
  }

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    } catch { return dateStr }
  }

  const truncateMessage = (msg, maxLen = 120) => {
    if (!msg) return 'بدون نص'
    return msg.length > maxLen ? msg.slice(0, maxLen) + '...' : msg
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-700 hover:text-palestine-green transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">العودة للرئيسية</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-800">📰 أخبار عائلة الشاعر</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        {stats && (
          <div className="bg-white rounded-2xl shadow-md p-4 mb-6 flex flex-wrap gap-3 justify-center">
            <span className="px-4 py-2 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
              إجمالي الأخبار: {stats.total.toLocaleString('ar-SA')}
            </span>
            {stats.categories.map(cat => (
              <span key={cat.name} className="px-3 py-2 bg-gray-50 rounded-full text-xs text-gray-600">
                {CATEGORY_ICONS[cat.name] || '📌'} {cat.name}: {cat.count.toLocaleString('ar-SA')}
              </span>
            ))}
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-8 flex flex-wrap gap-3 items-center">
          {/* Category Filter */}
          <button
            onClick={() => updateParams({ category: '', page: '' })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !currentCategory ? 'bg-palestine-green text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الكل
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => updateParams({ category: cat, page: '' })}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                currentCategory === cat ? 'bg-palestine-green text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {CATEGORY_ICONS[cat] || '📌'} {cat}
            </button>
          ))}

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="ابحث في الأخبار..."
              defaultValue={searchQuery}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateParams({ q: e.target.value, page: '' })
                }
              }}
              className="w-full px-4 py-2 rounded-full border border-gray-200 focus:border-palestine-green focus:ring-1 focus:ring-palestine-green outline-none text-sm"
            />
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد أخبار</h3>
            <p className="text-gray-500">جرب تغيير التصنيف أو البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map(post => (
              <Link
                key={post._id}
                to={`/news/${post._id}`}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
                      📰
                    </div>
                  )}
                  {/* Category Badge */}
                  <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white ${CATEGORY_COLORS[post.category] || 'bg-gray-600'}`}>
                    {CATEGORY_ICONS[post.category] || '📌'} {post.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-gray-800 text-sm leading-relaxed flex-1 line-clamp-3">
                    {truncateMessage(post.message, 150)}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>{formatDate(post.created_time)}</span>
                    <span className="text-palestine-green group-hover:underline">اقرأ المزيد ←</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              onClick={() => updateParams({ page: String(currentPage - 1) })}
              disabled={currentPage <= 1}
              className="px-4 py-2 rounded-lg bg-white shadow text-sm disabled:opacity-40 hover:bg-gray-50 transition"
            >
              ← السابق
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              let pageNum
              if (pagination.pages <= 7) {
                pageNum = i + 1
              } else if (currentPage <= 4) {
                pageNum = i + 1
              } else if (currentPage >= pagination.pages - 3) {
                pageNum = pagination.pages - 6 + i
              } else {
                pageNum = currentPage - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => updateParams({ page: String(pageNum) })}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                    pageNum === currentPage
                      ? 'bg-palestine-green text-white shadow-md'
                      : 'bg-white shadow hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => updateParams({ page: String(currentPage + 1) })}
              disabled={currentPage >= pagination.pages}
              className="px-4 py-2 rounded-lg bg-white shadow text-sm disabled:opacity-40 hover:bg-gray-50 transition"
            >
              التالي →
            </button>

            <span className="text-sm text-gray-400 mr-4">
              صفحة {currentPage} من {pagination.pages}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FbNewsPage

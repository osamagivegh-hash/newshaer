import React, { useEffect, useState } from 'react'
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
  'تعازي': 'from-gray-700 to-gray-800',
  'أفراح وزواجات': 'from-pink-500 to-pink-700',
  'صلح وجاهات واحتفالات وفعاليات': 'from-amber-500 to-amber-700',
  'مواليد': 'from-blue-400 to-blue-600',
  'إعلانات': 'from-purple-500 to-purple-700',
  'أخبار عامة': 'from-green-600 to-green-800'
}

const FbNewsSection = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/fb-posts', { params: { limit: 8, page: 1 } })
      .then(res => {
        if (res.data?.success) setPosts(res.data.data.posts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    } catch { return '' }
  }

  const truncate = (text, max = 100) => {
    if (!text) return 'بدون نص'
    return text.length > max ? text.slice(0, max) + '...' : text
  }

  if (loading) {
    return (
      <section id="news" className="py-20 bg-gradient-to-br from-gray-100 via-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-palestine-green mx-auto"></div>
        </div>
      </section>
    )
  }

  if (posts.length === 0) return null

  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <section id="news" className="bg-gradient-to-br from-gray-100 via-gray-50 to-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-gradient-to-r from-palestine-red to-red-600 text-white px-5 py-2 rounded-full text-sm font-semibold mb-4 shadow-lg">
            📰 الأخبار
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            آخر أخبار العائلة
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            تابع أحدث أخبار عائلة الشاعر من صفحة الفيسبوك
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-palestine-red to-red-600 mx-auto mt-6 rounded-full" />
        </div>

        {/* Featured Post */}
        <Link to={`/news/${featured._id}`} className="group block mb-12">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden md:flex md:flex-row-reverse">
            {featured.image_url ? (
              <div className="md:w-1/2 aspect-video md:aspect-auto overflow-hidden">
                <img
                  src={featured.image_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="md:w-1/2 bg-gray-100 flex items-center justify-center text-7xl text-gray-300 min-h-[250px]">
                📰
              </div>
            )}
            <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-palestine-red text-white px-3 py-1 rounded-full text-xs font-bold">🔥 خبر بارز</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${CATEGORY_COLORS[featured.category] || 'from-gray-500 to-gray-700'}`}>
                  {CATEGORY_ICONS[featured.category]} {featured.category}
                </span>
              </div>
              <p className="text-gray-800 text-lg leading-relaxed mb-4 line-clamp-4">
                {truncate(featured.message, 250)}
              </p>
              <span className="text-sm text-gray-400">{formatDate(featured.created_time)}</span>
            </div>
          </div>
        </Link>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rest.map(post => (
            <Link
              key={post._id}
              to={`/news/${post._id}`}
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">📰</div>
                )}
                <span className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${CATEGORY_COLORS[post.category] || 'from-gray-500 to-gray-700'}`}>
                  {CATEGORY_ICONS[post.category]} {post.category}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <p className="text-gray-800 text-sm leading-relaxed flex-1 line-clamp-3">
                  {truncate(post.message, 120)}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>{formatDate(post.created_time)}</span>
                  <span className="text-palestine-green group-hover:underline">اقرأ المزيد</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            to="/news"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-palestine-red to-red-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-palestine-red transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <span>تصفح جميع الأخبار</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default FbNewsSection

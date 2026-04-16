import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../utils/api'

const CATEGORY_ICONS = {
  'تعازي': '🕊️',
  'أفراح وزواجات': '💍',
  'صلح وجاهات واحتفالات وفعاليات': '🎉',
  'مواليد': '👶',
  'إعلانات': '📢',
  'أخبار عامة': '📰'
}

const FbNewsDetailPage = () => {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const fetchPost = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/fb-posts/${id}`)
        if (res.data?.success) {
          setPost(res.data.data)
        }
      } catch (err) {
        console.error('Error fetching post:', err)
        setPost(null)
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
  }, [id])

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return dateStr }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palestine-green mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الخبر...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">الخبر غير متوفر</h2>
          <p className="text-gray-500 mb-6">يبدو أن الخبر غير موجود أو تمت إزالته.</p>
          <Link to="/news" className="px-6 py-3 bg-palestine-green text-white rounded-lg hover:bg-green-800 transition">
            العودة للأخبار
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/news" className="flex items-center gap-2 text-gray-700 hover:text-palestine-green transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">العودة للأخبار</span>
          </Link>
          <span className="text-sm text-gray-500">{CATEGORY_ICONS[post.category]} {post.category}</span>
        </div>
      </header>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Image */}
          {post.image_url && (
            <div className="w-full">
              <img
                src={post.image_url}
                alt=""
                className="w-full max-h-[600px] object-contain bg-gray-100"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-500">
              <span className="px-3 py-1 bg-gray-100 rounded-full font-medium">
                {CATEGORY_ICONS[post.category]} {post.category}
              </span>
              <span>📅 {formatDate(post.created_time)}</span>
              {post.permalink_url && (
                <a
                  href={post.permalink_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  🔗 المنشور الأصلي
                </a>
              )}
            </div>

            {/* Message */}
            <div className="prose prose-lg max-w-none text-gray-800 leading-loose whitespace-pre-wrap text-right">
              {post.message || 'بدون نص'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mt-8">
          <Link
            to="/news"
            className="px-8 py-3 bg-palestine-green text-white rounded-xl font-medium hover:bg-green-800 transition shadow-md"
          >
            ← العودة لقائمة الأخبار
          </Link>
        </div>
      </article>
    </div>
  )
}

export default FbNewsDetailPage

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { adminNews } from '../../utils/adminApi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../LoadingSpinner'
import ImageUpload from './ImageUpload'
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { uploadEditorImage } from './EditorImageUploader';
import { NEWS_CATEGORY_OPTIONS, resolveNewsCategory, formatNewsCategory } from '../../constants/newsCategories'

const formatDateForInput = (value) => {
  if (!value) return new Date().toISOString().split('T')[0]
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0]
  }
  return date.toISOString().split('T')[0]
}

const AdminNews = () => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNews, setSelectedNews] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingNews, setEditingNews] = useState(null)
  const [showFbImport, setShowFbImport] = useState(false)
  const [fbPosts, setFbPosts] = useState([])
  const [selectedFbPosts, setSelectedFbPosts] = useState([])
  const [fbLoading, setFbLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: '',
    date: new Date().toISOString().split('T')[0],
    image: '',
    headline: '',
    summary: '',
    tags: [],
    category: 'General',
    isArchived: false
  })

  const editorRef = useRef(null)

  const imageLimit = 20
  const modules = useMemo(() => ({
    toolbar: {
      container: [[{ header: [1, 2, false] }], ['bold', 'italic'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'image'], ['clean']],
      handlers: {
        image: function () {
          const quill = this.quill
          const currentImages = quill?.root?.querySelectorAll('img')?.length || 0
          if (currentImages >= imageLimit) {
            toast.error('لا يمكن إضافة أكثر من 20 صورة داخل المحتوى.')
            return
          }

          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.click()
          input.onchange = async () => {
            const file = input.files && input.files[0]
            if (!file) return

            try {
              const url = await uploadEditorImage(file)
              const selection = quill.getSelection(true)
              const index = selection ? selection.index : quill.getLength()
              quill.insertEmbed(index, 'image', url)
              quill.setSelection(index + 1)
              quill.focus()
            } catch (error) {
              console.error('Image upload failed:', error)
              toast.error('فشل رفع الصورة. حاول مرة أخرى.')
            }
          }
        }
      }
    }
  }), [imageLimit])

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    try {
      const data = await adminNews.getAll()
      setNews(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error.message)
      setNews([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFbPosts = async () => {
    setFbLoading(true)
    try {
      const data = await adminNews.getFbPosts()
      setFbPosts(data.posts || [])
      setSelectedFbPosts([])
    } catch (error) {
      toast.error(error.message)
      setFbPosts([])
    } finally {
      setFbLoading(false)
    }
  }

  const handleOpenFbImport = () => {
    setShowFbImport(true)
    fetchFbPosts()
  }

  const handleImportFbPosts = async () => {
    if (selectedFbPosts.length === 0) {
      toast.error('يرجى اختيار منشورات للاستيراد')
      return
    }
    setFbLoading(true)
    try {
      const result = await adminNews.importFbPosts(selectedFbPosts)
      toast.success(result.message)
      setShowFbImport(false)
      setSelectedFbPosts([])
      fetchNews()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setFbLoading(false)
    }
  }

  const handleSelectAllFb = () => {
    if (selectedFbPosts.length === fbPosts.length) {
      setSelectedFbPosts([])
    } else {
      setSelectedFbPosts(fbPosts.map(p => p.fb_post_id))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingNews) {
        const newsId = editingNews.id || editingNews._id
        await adminNews.update(newsId, formData)
        toast.success('تم تحديث الخبر بنجاح')
      } else {
        await adminNews.create(formData)
        toast.success('تم إضافة الخبر بنجاح')
      }
      
      setShowForm(false)
      setEditingNews(null)
      setFormData({
        title: '',
        content: '',
        author: '',
        date: new Date().toISOString().split('T')[0],
        image: '',
        headline: '',
        summary: '',
        tags: [],
        category: 'General',
        isArchived: false
      })
      fetchNews()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (newsItem) => {
    setEditingNews(newsItem)
    setFormData({
      title: newsItem.title || '',
      content: newsItem.content || '',
      author: newsItem.author || newsItem.reporter || '',
      date: formatDateForInput(newsItem.date),
      image: newsItem.image || '',
      headline: newsItem.headline || newsItem.title || '',
      summary: newsItem.summary || '',
      tags: Array.isArray(newsItem.tags) ? newsItem.tags : [],
      category: resolveNewsCategory(newsItem.category) || 'General',
      isArchived: Boolean(newsItem.isArchived)
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return

    try {
      const newsId = typeof id === 'object' ? (id.id || id._id) : id
      await adminNews.delete(newsId)
      toast.success('تم حذف الخبر بنجاح')
      fetchNews()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedNews.length === 0) {
      toast.error('يرجى اختيار عناصر للحذف')
      return
    }

    if (!confirm(`هل أنت متأكد من حذف ${selectedNews.length} خبر؟`)) return

    try {
      await adminNews.bulkDelete(selectedNews)
      toast.success(`تم حذف ${selectedNews.length} خبر بنجاح`)
      setSelectedNews([])
      fetchNews()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleToggleArchive = async (newsItem) => {
    const newsId = newsItem.id || newsItem._id
    if (!newsId) return

    try {
      await adminNews.toggleArchive(newsId, !newsItem.isArchived)
      toast.success(!newsItem.isArchived ? 'تم نقل الخبر إلى الأرشيف' : 'تم استرجاع الخبر من الأرشيف')
      fetchNews()
    } catch (error) {
      toast.error(error.message || 'تعذر تحديث حالة الأرشفة')
    }
  }

  const handleSelectAll = () => {
    if (selectedNews.length === news.length) {
      setSelectedNews([])
    } else {
      setSelectedNews(news.map(item => item.id || item._id))
    }
  }

  if (loading && !showForm) {
    return <LoadingSpinner />
  }

  const contentImageCount = (formData.content.match(/<img/gi) || []).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-palestine-black">إدارة الأخبار</h1>
        <div className="flex gap-4">
          {selectedNews.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-palestine-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              حذف المحدد ({selectedNews.length})
            </button>
          )}
          <button
            onClick={handleOpenFbImport}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            📥 استيراد من فيسبوك
          </button>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingNews(null)
              setFormData({
                title: '',
                content: '',
                author: '',
                date: new Date().toISOString().split('T')[0],
                image: '',
                headline: '',
                summary: '',
                tags: [],
                category: 'General',
                isArchived: false
              })
            }}
            className="btn-primary"
          >
            إضافة خبر جديد
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-palestine-black">
                {editingNews ? 'تعديل الخبر' : 'إضافة خبر جديد'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-palestine-black mb-2">
                  عنوان الخبر *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="form-input"
                  placeholder="أدخل عنوان الخبر"
                />
              </div>

              {/* Image Upload */}
              <ImageUpload
                label="صورة الخبر"
                value={formData.image}
                onChange={(url) => setFormData({...formData, image: url})}
              />

              <div>
                <label className="block text-sm font-medium text-palestine-black mb-2">
                  تصنيف الخبر *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="form-input"
                >
                  <option value="">اختر التصنيف المناسب</option>
                  {NEWS_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div>
                  <p className="text-sm font-semibold text-palestine-black">حالة الأرشفة</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.isArchived
                      ? `هذا الخبر مؤرشف${editingNews?.archivedAt ? ` منذ ${new Date(editingNews.archivedAt).toLocaleDateString('ar-SA', { dateStyle: 'medium' })}` : ''}`
                      : 'هذا الخبر منشور حالياً على الموقع'}
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-palestine-black">
                  <input
                    type="checkbox"
                    className="h-5 w-5 text-palestine-green border-gray-300 rounded focus:ring-palestine-green"
                    checked={formData.isArchived}
                    onChange={(e) => setFormData({ ...formData, isArchived: e.target.checked })}
                  />
                  <span>أرشفة هذا الخبر</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-palestine-black mb-2">
                  عنوان مختصر (Headline)
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({...formData, headline: e.target.value})}
                  className="form-input"
                  placeholder="عنوان مختصر للعرض في القائمة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-palestine-black mb-2">
                  ملخص الخبر
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({...formData, summary: e.target.value})}
                  rows={3}
                  className="form-textarea"
                  placeholder="ملخص قصير للخبر"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-palestine-black mb-2">محتوى الخبر *</label>
                <ReactQuill
                  ref={editorRef}
                  className="rich-text-editor"
                  value={formData.content}
                  onChange={content => setFormData({...formData, content})}
                  modules={modules}
                  theme="snow"
                  placeholder="اكتب محتوى الخبر بالتفصيل ويمكنك إدراج الصور داخل النص..."
                />
                <div className="text-xs mt-1">عدد الصور المدرجة: {contentImageCount}/{imageLimit} (الحد الأقصى 20).</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-palestine-black mb-2">
                    الكاتب *
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    required
                    className="form-input"
                    placeholder="اسم كاتب الخبر"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-palestine-black mb-2">
                    التاريخ *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'جاري الحفظ...' : (editingNews ? 'تحديث' : 'إضافة')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facebook Import Modal */}
      {showFbImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold text-palestine-black">📥 استيراد من فيسبوك</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {fbPosts.length > 0 ? `${fbPosts.length} منشور متاح للاستيراد` : 'جاري التحميل...'}
                </p>
              </div>
              <button onClick={() => setShowFbImport(false)} className="text-gray-500 hover:text-gray-700">
                <span className="text-2xl">×</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {fbLoading ? (
                <div className="text-center py-12 text-gray-500">جاري تحميل منشورات فيسبوك...</div>
              ) : fbPosts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">لا توجد منشورات جديدة للاستيراد</p>
                  <p className="text-sm mt-2">جميع المنشورات مستوردة مسبقاً أو لا توجد منشورات على الصفحة</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFbPosts.length === fbPosts.length}
                        onChange={handleSelectAllFb}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700">تحديد الكل ({fbPosts.length})</span>
                    </label>
                    {selectedFbPosts.length > 0 && (
                      <span className="text-sm text-blue-600 font-medium">
                        تم تحديد {selectedFbPosts.length} منشور
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {fbPosts.map((post) => (
                      <div
                        key={post.fb_post_id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedFbPosts.includes(post.fb_post_id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedFbPosts(prev =>
                            prev.includes(post.fb_post_id)
                              ? prev.filter(id => id !== post.fb_post_id)
                              : [...prev, post.fb_post_id]
                          )
                        }}
                      >
                        <div className="flex gap-4">
                          <input
                            type="checkbox"
                            checked={selectedFbPosts.includes(post.fb_post_id)}
                            onChange={() => {}}
                            className="h-4 w-4 mt-1 flex-shrink-0"
                          />
                          {post.image_url && (
                            <img
                              src={post.image_url}
                              alt=""
                              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-palestine-black line-clamp-3" dir="rtl">
                              {(post.message || 'بدون نص').substring(0, 200)}
                              {(post.message || '').length > 200 ? '...' : ''}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              <span>{new Date(post.created_time).toLocaleDateString('ar-SA')}</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded">{post.category}</span>
                              {post.image_url && <span className="text-green-600">✓ صورة</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t flex justify-between items-center">
              <button
                onClick={() => setShowFbImport(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleImportFbPosts}
                disabled={selectedFbPosts.length === 0 || fbLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedFbPosts.length > 0 && !fbLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {fbLoading ? 'جاري الاستيراد...' : `استيراد ${selectedFbPosts.length} منشور`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News List */}
      <div className="bg-white rounded-lg shadow-md">
        {news.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedNews.length === news.length}
                onChange={handleSelectAll}
                className="ml-2"
              />
              <span className="text-sm text-gray-600">
                تحديد الكل ({news.length} خبر)
              </span>
            </label>
          </div>
        )}

        {news.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا توجد أخبار متاحة
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {news.map((newsItem) => {
              const itemId = newsItem.id || newsItem._id
              const isArchived = Boolean(newsItem.isArchived)

              return (
                <div
                  key={itemId}
                  className={`p-4 transition-colors duration-200 ${isArchived ? 'bg-gray-50 opacity-90' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedNews.includes(itemId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNews([...selectedNews, itemId])
                          } else {
                            setSelectedNews(selectedNews.filter(id => id !== itemId))
                          }
                        }}
                        className="ml-3"
                      />
                      {(newsItem.image || newsItem.coverImage) && (
                        <img
                          src={newsItem.image || newsItem.coverImage}
                          alt={newsItem.title}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-palestine-black">
                            {newsItem.title}
                          </h3>
                          {newsItem.fbPostId && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                              فيسبوك
                            </span>
                          )}
                          {isArchived && (
                            <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                              مؤرشف
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-palestine-green font-semibold mt-1">
                          {formatNewsCategory(newsItem.category) || 'غير مصنف'}
                        </p>
                        <p className="text-gray-600 mt-1">
                          {(newsItem.summary || newsItem.content || '').substring(0, 100)}...
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-500 flex-wrap gap-2">
                          <span>بواسطة: {newsItem.reporter || newsItem.author || 'غير محدد'}</span>
                          <span className="text-gray-400">•</span>
                          <span>{new Date(newsItem.date).toLocaleDateString('ar-SA')}</span>
                          {(newsItem.image || newsItem.coverImage) && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-palestine-green">✓ صورة</span>
                            </>
                          )}
                          {isArchived && newsItem.archivedAt && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">
                                مؤرشف منذ {new Date(newsItem.archivedAt).toLocaleDateString('ar-SA', { dateStyle: 'medium' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <button
                        onClick={() => handleToggleArchive(newsItem)}
                        className={`px-3 py-1 rounded text-sm transition-colors duration-200 ${isArchived ? 'bg-gray-300 text-gray-800 hover:bg-gray-400' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                      >
                        {isArchived ? 'استرجاع' : 'أرشفة'}
                      </button>
                      <button
                        onClick={() => handleEdit(newsItem)}
                        className="bg-palestine-green text-white px-3 py-1 rounded text-sm hover:bg-olive-700 transition-colors duration-200"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(itemId)}
                        className="bg-palestine-red text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors duration-200"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminNews

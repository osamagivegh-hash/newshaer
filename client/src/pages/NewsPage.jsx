import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import ArticleCard from '../components/common/ArticleCard'
import { fetchSectionData } from '../utils/api'
import { NEWS_CATEGORY_OPTIONS, NEWS_CATEGORY_LABELS, resolveNewsCategory, formatNewsCategory } from '../constants/newsCategories'

/**
 * صفحة الأخبار الداخلية
 * تعرض جميع الأخبار مع إمكانية التصفية حسب التصنيف
 */
const NewsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const initialCategory = searchParams.get('category') || 'All'

    const [category, setCategory] = useState(initialCategory)
    const [search, setSearch] = useState('')
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [])

    // Update URL when category changes
    useEffect(() => {
        if (category === 'All') {
            searchParams.delete('category')
        } else {
            searchParams.set('category', category)
        }
        setSearchParams(searchParams, { replace: true })
    }, [category, searchParams, setSearchParams])

    // Fetch news data
    useEffect(() => {
        const loadNews = async () => {
            setLoading(true)
            setError(null)

            try {
                const data = await fetchSectionData('news')
                // Sort by date, newest first
                const sortedData = Array.isArray(data)
                    ? [...data].sort((a, b) => new Date(b.date) - new Date(a.date))
                    : []
                setNews(sortedData)
            } catch (err) {
                console.error('Unable to load news:', err)
                setError(err.message || 'تعذر تحميل الأخبار')
                setNews([])
            } finally {
                setLoading(false)
            }
        }

        loadNews()
    }, [])

    // Filter news based on category and search
    const filteredNews = useMemo(() => {
        let result = [...news]

        // Filter by category
        if (category !== 'All') {
            result = result.filter(item => {
                const resolved = resolveNewsCategory(item.category)
                return resolved === category
            })
        }

        // Filter by search term
        const term = search.trim().toLowerCase()
        if (term) {
            result = result.filter(item => {
                const text = `${item.title || ''} ${item.headline || ''} ${item.summary || ''} ${formatNewsCategory(item.category) || ''}`.toLowerCase()
                return text.includes(term)
            })
        }

        return result
    }, [news, category, search])

    // Get category counts
    const categoryCounts = useMemo(() => {
        const counts = { All: news.length }
        NEWS_CATEGORY_OPTIONS.forEach(option => {
            counts[option.value] = news.filter(item =>
                resolveNewsCategory(item.category) === option.value
            ).length
        })
        return counts
    }, [news])

    const getNewsId = (item) =>
        item?.id ||
        (typeof item?._id === 'object' && item?._id?.toString ? item._id.toString() : item?._id) ||
        `${item?.title || 'news'}-${item?.date || Math.random()}`

    const getCategoryIcon = (categoryValue) => {
        const icons = {
            'General': '📰',
            'Obituaries': '🕊️',
            'Events': '🎉',
            'Celebrations': '🎈',
            'Other': '⚙️'
        }
        return icons[categoryValue] || '📰'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 rtl-content">
            {/* Header */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-palestine-red to-red-600 flex items-center justify-center text-white shadow-lg">
                            📰
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-palestine-black">الأخبار</h1>
                            <p className="text-sm text-gray-500">آخر أخبار ومستجدات العائلة</p>
                        </div>
                    </div>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-palestine-green hover:text-olive-700 font-medium text-sm transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        العودة للرئيسية
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
                {/* Filter Section */}
                <section className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setCategory('All')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${category === 'All'
                                    ? 'bg-gradient-to-r from-palestine-green to-olive-700 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            جميع الأخبار ({categoryCounts.All})
                        </button>
                        {NEWS_CATEGORY_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setCategory(option.value)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${category === option.value
                                        ? 'bg-gradient-to-r from-palestine-green to-olive-700 text-white shadow-lg'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    } ${categoryCounts[option.value] === 0 ? 'opacity-50' : ''}`}
                                disabled={categoryCounts[option.value] === 0}
                            >
                                {getCategoryIcon(option.value)} {NEWS_CATEGORY_LABELS[option.value]} ({categoryCounts[option.value]})
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="ابحث في الأخبار..."
                            className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-palestine-green focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                        />
                    </div>
                </section>

                {/* Results Info */}
                <div className="flex items-center justify-between">
                    <p className="text-gray-600">
                        {loading ? (
                            'جاري التحميل...'
                        ) : (
                            <>
                                عرض <span className="font-bold text-palestine-green">{filteredNews.length}</span> خبر
                                {category !== 'All' && (
                                    <span className="text-gray-500"> في تصنيف "{NEWS_CATEGORY_LABELS[category]}"</span>
                                )}
                            </>
                        )}
                    </p>
                    {!loading && filteredNews.length > 0 && (
                        <p className="text-sm text-gray-400">
                            مرتبة من الأحدث للأقدم
                        </p>
                    )}
                </div>

                {/* Content */}
                <section className="space-y-6">
                    {loading && (
                        <div className="flex justify-center py-20">
                            <LoadingSpinner />
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center">
                            <p className="font-medium mb-2">حدث خطأ</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {!loading && !error && filteredNews.length === 0 && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                            <div className="text-6xl mb-4">📭</div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد أخبار</h3>
                            <p className="text-gray-500 mb-6">
                                {search ? `لا توجد نتائج لـ "${search}"` : 'لا توجد أخبار في هذا التصنيف حالياً'}
                            </p>
                            {(search || category !== 'All') && (
                                <button
                                    onClick={() => {
                                        setSearch('')
                                        setCategory('All')
                                    }}
                                    className="inline-flex items-center gap-2 text-palestine-green hover:text-olive-700 font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    إعادة تعيين الفلاتر
                                </button>
                            )}
                        </div>
                    )}

                    {!loading && !error && filteredNews.length > 0 && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredNews.map((item) => (
                                <ArticleCard
                                    key={getNewsId(item)}
                                    id={getNewsId(item)}
                                    title={item.headline || item.title}
                                    summary={item.summary}
                                    content={item.content}
                                    image={item.image}
                                    author={item.reporter || 'فريق الأخبار'}
                                    date={item.date}
                                    category={NEWS_CATEGORY_LABELS[resolveNewsCategory(item.category)] || 'خبر'}
                                    categoryColor="palestine-green"
                                    tags={item.tags}
                                    linkPrefix="/news"
                                    variant="default"
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Back to Home */}
                <div className="text-center pt-8">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-palestine-green to-olive-700 text-white px-8 py-3 rounded-xl font-semibold hover:from-olive-700 hover:to-palestine-green transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        العودة إلى الصفحة الرئيسية
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-12 border-t bg-white py-6">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
                    © {new Date().getFullYear()} عائلة الشاعر - جميع الحقوق محفوظة.
                </div>
            </footer>
        </div>
    )
}

export default NewsPage

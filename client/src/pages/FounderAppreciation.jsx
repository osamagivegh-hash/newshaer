/**
 * Founder Appreciation Page
 * Section 1: Tribute to the Founder
 * Displays the founder's photo, family tree image, and tribute article
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

const FounderAppreciation = () => {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch(`${API_URL}/api/family-tree-content/appreciation`);
            const data = await res.json();

            if (data.success) {
                setContent(data.data);
            } else {
                setError('لا يوجد محتوى متاح حالياً');
            }
        } catch (err) {
            console.error('Error fetching appreciation content:', err);
            setError('خطأ في تحميل المحتوى');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-800 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 rtl-content" dir="rtl">
            {/* Header with Breadcrumb */}
            <header className="bg-gray-900 text-white shadow-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-sm">
                            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                                الرئيسية
                            </Link>
                            <span className="text-gray-600">/</span>
                            <Link to="/family-tree" className="text-gray-400 hover:text-white transition-colors">
                                شجرة العائلة
                            </Link>
                            <span className="text-gray-600">/</span>
                            <span className="text-white font-medium">تقدير ووفاء للمؤسس</span>
                        </nav>

                        {/* Back Button */}
                        <Link
                            to="/family-tree"
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>رجوع</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative bg-gray-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                    }}></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm mb-6">
                        <span className="text-2xl">🏆</span>
                        <span>تقدير ووفاء</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                        {content?.title || 'تقدير ووفاء لمؤسس شجرة العائلة'}
                    </h1>
                    {content?.summary && (
                        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            {content.summary}
                        </p>
                    )}
                </div>

                {/* Wave Separator */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
                {error || !content ? (
                    <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                        <div className="text-6xl mb-6">📝</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">لا يوجد محتوى متاح</h2>
                        <p className="text-gray-600 mb-8">لم يتم إضافة محتوى التقدير والوفاء بعد. سيتم إضافته قريباً.</p>
                        <Link
                            to="/family-tree"
                            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>العودة لشجرة العائلة</span>
                        </Link>
                    </div>
                ) : (
                    <article className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Images Section - Side by Side */}
                        {(content.founderImage || content.treeImage) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-gray-100">
                                {/* Founder Image */}
                                <div className="relative group">
                                    {content.founderImage ? (
                                        <>
                                            <img
                                                src={content.founderImage}
                                                alt="صورة المؤسس"
                                                className="w-full h-80 md:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                                            />

                                        </>
                                    ) : (
                                        <div className="h-80 md:h-96 bg-gray-100 flex items-center justify-center">
                                            <div className="text-center text-gray-400">
                                                <div className="text-6xl mb-2">👤</div>
                                                <p>صورة المؤسس</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tree Image */}
                                <div className="relative group">
                                    {content.treeImage ? (
                                        <>
                                            <img
                                                src={content.treeImage}
                                                alt="صورة شجرة العائلة"
                                                className="w-full h-80 md:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                                            />

                                        </>
                                    ) : (
                                        <div className="h-80 md:h-96 bg-gray-100 flex items-center justify-center">
                                            <div className="text-center text-gray-400">
                                                <div className="text-6xl mb-2">🌳</div>
                                                <p>صورة شجرة العائلة</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Article Content */}
                        <div className="p-8 md:p-12 lg:p-16">
                            {content.author && (
                                <div className="flex items-center gap-3 mb-8 pb-8 border-b border-gray-100">
                                    <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-bold">
                                        {content.author.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{content.author}</p>
                                        <p className="text-sm text-gray-500">كاتب المقال</p>
                                    </div>
                                </div>
                            )}

                            <div
                                className="prose prose-lg prose-arabic max-w-none"
                                dangerouslySetInnerHTML={{ __html: content.content }}
                            />
                        </div>
                    </article>
                )}
            </main>

            {/* Footer Navigation */}
            <footer className="bg-gray-900 text-white py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-gray-400">© {new Date().getFullYear()} عائلة الشاعر</p>
                        <div className="flex items-center gap-4">
                            <Link to="/family-tree" className="text-gray-400 hover:text-white transition-colors">
                                القائمة الرئيسية
                            </Link>
                            <span className="text-gray-600">|</span>
                            <Link to="/family-tree/tree" className="text-gray-400 hover:text-white transition-colors">
                                شجرة العائلة
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default FounderAppreciation;

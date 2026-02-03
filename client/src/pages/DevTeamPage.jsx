/**
 * Development Team Page
 * Enhanced with:
 * - Rich Alert Box at top for important announcements
 * - Rich-text posts with author info
 * - Contact form for messaging
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

// Message Categories
const CATEGORIES = [
    { value: 'suggestion', label: 'اقتراح', icon: '💡' },
    { value: 'bug', label: 'مشكلة تقنية', icon: '🐛' },
    { value: 'question', label: 'استفسار', icon: '❓' },
    { value: 'feedback', label: 'ملاحظات', icon: '📣' },
    { value: 'other', label: 'أخرى', icon: '📝' }
];

// Alert Box Component
const AlertBox = ({ alert, onDismiss }) => {
    const navigate = useNavigate();

    const alertStyles = {
        info: { bg: 'bg-teal-600', border: 'border-teal-400' },
        success: { bg: 'bg-green-600', border: 'border-green-400' },
        warning: { bg: 'bg-yellow-500', border: 'border-yellow-400' },
        danger: { bg: 'bg-red-600', border: 'border-red-400' },
        announcement: { bg: 'bg-purple-600', border: 'border-purple-400' }
    };

    const style = alertStyles[alert.alertType] || alertStyles.info;

    return (
        <div
            className={`${alert.isSticky ? 'sticky top-0 z-50' : ''} ${style.bg} border-b-4 ${style.border} shadow-xl`}
            style={{
                backgroundColor: alert.backgroundColor || undefined,
                color: alert.textColor || '#ffffff'
            }}
        >
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                        <span className="text-3xl flex-shrink-0">{alert.icon}</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{alert.title}</h3>
                            <div
                                className="text-sm opacity-90 prose-invert"
                                dangerouslySetInnerHTML={{ __html: alert.content }}
                            />
                            {alert.showButton && (
                                <button
                                    onClick={() => navigate(alert.buttonLink || '/family-tree/dev-team')}
                                    className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors text-sm inline-flex items-center gap-2"
                                >
                                    {alert.buttonText || 'عرض التفاصيل'}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                    {alert.isDismissible && (
                        <button
                            onClick={() => onDismiss(alert.id)}
                            className="text-white/70 hover:text-white text-2xl font-bold leading-none p-1"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Post/Article Component with Rich Text
const PostCard = ({ post }) => {
    // Articles start expanded by default, regular posts start collapsed
    const [expanded, setExpanded] = useState(post.isArticle || false);
    const [showCollapseButton, setShowCollapseButton] = useState(false);
    const contentRef = React.useRef(null);

    // Check if content exceeds max height for collapse button
    useEffect(() => {
        if (post.isArticle && contentRef.current && post.maxCollapsedHeight > 0) {
            const contentHeight = contentRef.current.scrollHeight;
            setShowCollapseButton(contentHeight > post.maxCollapsedHeight);
        }
    }, [post.isArticle, post.maxCollapsedHeight]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getPostTypeStyle = (type) => {
        switch (type) {
            case 'announcement': return 'bg-red-100 text-red-700';
            case 'update': return 'bg-blue-100 text-blue-700';
            case 'feature': return 'bg-green-100 text-green-700';
            case 'maintenance': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getPostTypeLabel = (type) => {
        switch (type) {
            case 'announcement': return 'إعلان';
            case 'update': return 'تحديث';
            case 'feature': return 'ميزة جديدة';
            case 'maintenance': return 'صيانة';
            default: return 'عام';
        }
    };

    const getSpacingClass = (spacing) => {
        switch (spacing) {
            case 'compact': return 'prose-p:mb-2 prose-p:mt-0 leading-snug';
            case 'spacious': return 'prose-p:mb-6 prose-p:mt-0 leading-loose';
            default: return 'prose-p:mb-4 prose-p:mt-0 leading-relaxed';
        }
    };

    const getAlignmentClass = (alignment) => {
        switch (alignment) {
            case 'center': return 'text-center';
            case 'justify': return 'text-justify';
            default: return 'text-right';
        }
    };

    // Article layout for isArticle posts
    if (post.isArticle) {
        return (
            <article className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${post.isFounderPost ? 'ring-4 ring-yellow-400 shadow-yellow-200' : post.isPinned ? 'ring-2 ring-teal-500' : ''}`}>
                {/* Special Post Banner - Subtle */}
                {post.isFounderPost && (
                    <div className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 py-1 px-4 flex items-center justify-center">
                        <span className="text-amber-600 text-sm">⭐</span>
                    </div>
                )}
                {/* Featured Image - Full width for articles */}
                {post.featuredImage && (
                    <div className="h-64 md:h-80 w-full overflow-hidden">
                        <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="p-8 md:p-10">
                    {/* Article Header with Author Info Prominently Displayed */}
                    <header className="mb-8 pb-6 border-b border-gray-200">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            {post.isFounderPost && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium" title="GS">⭐</span>
                            )}
                            <span className="text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-medium">📄 مقال</span>
                            {post.isPinned && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">📌 مثبت</span>
                            )}
                            <span className={`text-xs px-3 py-1 rounded-full ${getPostTypeStyle(post.postType)}`}>
                                {getPostTypeLabel(post.postType)}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>

                        {/* Author Info - Prominent */}
                        <div className="flex items-center gap-4">
                            {post.authorAvatar ? (
                                <img
                                    src={post.authorAvatar}
                                    alt={post.author}
                                    className="w-14 h-14 rounded-full object-cover ring-2 ring-teal-100"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                    {post.author?.charAt(0) || 'ف'}
                                </div>
                            )}
                            <div>
                                <p className="font-bold text-gray-900 text-lg">{post.author}</p>
                                <p className="text-teal-600 font-medium">{post.authorRole || 'فريق التطوير'}</p>
                                <p className="text-sm text-gray-500 mt-1">{formatDate(post.createdAt)}</p>
                            </div>
                        </div>
                    </header>

                    {/* Article Content - Full Rich Text */}
                    <div
                        ref={contentRef}
                        className={`prose prose-lg max-w-none text-gray-700 article-content ${getSpacingClass(post.paragraphSpacing)} ${getAlignmentClass(post.textAlignment)}`}
                        style={{
                            maxHeight: !expanded && post.maxCollapsedHeight > 0 ? `${post.maxCollapsedHeight}px` : 'none',
                            overflow: !expanded && post.maxCollapsedHeight > 0 ? 'hidden' : 'visible'
                        }}
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />

                    {/* Gradient overlay for collapsed long articles */}
                    {!expanded && showCollapseButton && (
                        <div className="relative">
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                        </div>
                    )}

                    {/* Read More / Show Less for long articles */}
                    {showCollapseButton && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-50 text-teal-700 rounded-full font-medium hover:bg-teal-100 transition-colors"
                            >
                                {expanded ? (
                                    <>
                                        <span>عرض أقل</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        <span>متابعة القراءة</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </article>
        );
    }

    // Regular Post Card Layout
    return (
        <article className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${post.isFounderPost ? 'ring-4 ring-yellow-400 shadow-yellow-200' : post.isPinned ? 'ring-2 ring-teal-500' : ''}`}>
            {/* Special Post Indicator - Subtle */}
            {post.isFounderPost && (
                <div className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 py-1 px-4 flex items-center justify-center">
                    <span className="text-amber-600 text-sm">⭐</span>
                </div>
            )}
            {/* Featured Image */}
            {post.featuredImage && (
                <div className="h-48 w-full overflow-hidden">
                    <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                </div>
            )}

            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-1">
                        <span className="text-3xl">{post.icon || '📢'}</span>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                {post.isFounderPost && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full" title="GS">⭐</span>
                                )}
                                {post.isPinned && (
                                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">📌 مثبت</span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getPostTypeStyle(post.postType)}`}>
                                    {getPostTypeLabel(post.postType)}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">{post.title}</h3>
                        </div>
                    </div>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(post.createdAt)}
                    </span>
                </div>

                {/* Summary (collapsed state) */}
                {post.summary && !expanded && (
                    <p className="text-gray-600 mb-4">{post.summary}</p>
                )}

                {/* Rich Content (expanded state) */}
                {expanded && (
                    <div
                        className={`prose prose-sm max-w-none text-gray-700 mb-4 ${getSpacingClass(post.paragraphSpacing)} ${getAlignmentClass(post.textAlignment)}`}
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                )}

                {/* Expand/Collapse Button */}
                {post.content && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1"
                    >
                        {expanded ? (
                            <>
                                <span>عرض أقل</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </>
                        ) : (
                            <>
                                <span>قراءة المزيد</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </>
                        )}
                    </button>
                )}

                {/* Author Info */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
                    {post.authorAvatar ? (
                        <img
                            src={post.authorAvatar}
                            alt={post.author}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                            {post.author?.charAt(0) || 'ف'}
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-gray-900">{post.author}</p>
                        <p className="text-sm text-gray-500">{post.authorRole || 'فريق التطوير'}</p>
                    </div>
                </div>
            </div>
        </article>
    );
};


// Contact Form Component
const ContactForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        senderName: '',
        senderEmail: '',
        senderPhone: '',
        subject: '',
        message: '',
        category: 'other'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/dev-team/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(true);
                setFormData({
                    senderName: '',
                    senderEmail: '',
                    senderPhone: '',
                    subject: '',
                    message: '',
                    category: 'other'
                });
                if (onSuccess) onSuccess();
            } else {
                setError(data.message || 'حدث خطأ في إرسال الرسالة');
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-green-800 mb-2">تم إرسال رسالتك بنجاح!</h3>
                <p className="text-green-700 mb-6">سيتواصل معك فريق التطوير في أقرب وقت ممكن.</p>
                <button
                    onClick={() => setSuccess(false)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    إرسال رسالة أخرى
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="senderName"
                        value={formData.senderName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        placeholder="أدخل اسمك الكامل"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        name="senderEmail"
                        value={formData.senderEmail}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        placeholder="example@email.com"
                        dir="ltr"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        رقم الهاتف (اختياري)
                    </label>
                    <input
                        type="tel"
                        name="senderPhone"
                        value={formData.senderPhone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        placeholder="+966..."
                        dir="ltr"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        نوع الرسالة
                    </label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    الموضوع <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="موضوع رسالتك"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    الرسالة <span className="text-red-500">*</span>
                </label>
                <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-y"
                    placeholder="اكتب رسالتك هنا..."
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-lg hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                        <span>جاري الإرسال...</span>
                    </>
                ) : (
                    <>
                        <span>📤</span>
                        <span>إرسال الرسالة</span>
                    </>
                )}
            </button>
        </form>
    );
};

// Main Component
const DevTeamPage = () => {
    const [alerts, setAlerts] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts');
    const [dismissedAlerts, setDismissedAlerts] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dismissedDevAlerts') || '[]');
        } catch {
            return [];
        }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            await Promise.all([fetchAlerts(), fetchPosts()]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/dev-team/alerts`);
            const data = await res.json();
            if (data.success) {
                setAlerts(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching alerts:', err);
        }
    };

    const fetchPosts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/dev-team/posts`);
            const data = await res.json();
            if (data.success) {
                setPosts(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching posts:', err);
        }
    };

    const handleDismissAlert = (alertId) => {
        const newDismissed = [...dismissedAlerts, alertId];
        setDismissedAlerts(newDismissed);
        localStorage.setItem('dismissedDevAlerts', JSON.stringify(newDismissed));
    };

    const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-gray-100 rtl-content" dir="rtl">
            {/* Alert Boxes */}
            {visibleAlerts.length > 0 && (
                <div className="space-y-0">
                    {visibleAlerts.map(alert => (
                        <AlertBox
                            key={alert.id}
                            alert={alert}
                            onDismiss={handleDismissAlert}
                        />
                    ))}
                </div>
            )}

            {/* Header */}
            <header className="bg-gradient-to-r from-teal-700 to-teal-600 text-white shadow-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-2 text-sm">
                            <Link to="/" className="text-teal-200 hover:text-white transition-colors">
                                الرئيسية
                            </Link>
                            <span className="text-teal-300">/</span>
                            <Link to="/family-tree" className="text-teal-200 hover:text-white transition-colors">
                                شجرة العائلة
                            </Link>
                            <span className="text-teal-300">/</span>
                            <span className="text-white font-medium">فريق التطوير</span>
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
            <section className="bg-gradient-to-r from-teal-700 to-teal-600 text-white pb-20 pt-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <span className="text-5xl mb-6 block">👨‍💻</span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">فريق التطوير</h1>
                    <p className="text-xl text-teal-100 max-w-2xl mx-auto">
                        تواصل معنا لمشاركة اقتراحاتك أو الإبلاغ عن مشكلة أو طرح أي استفسار
                    </p>

                    {/* Show dismissed alerts option */}
                    {dismissedAlerts.length > 0 && (
                        <button
                            onClick={() => {
                                setDismissedAlerts([]);
                                localStorage.removeItem('dismissedDevAlerts');
                            }}
                            className="mt-4 text-sm text-teal-200 hover:text-white underline"
                        >
                            عرض التنبيهات المخفية ({dismissedAlerts.length})
                        </button>
                    )}
                </div>
            </section>

            {/* Tab Navigation */}
            <div className="max-w-4xl mx-auto px-4 -mt-8">
                <div className="bg-white rounded-xl shadow-lg p-2 flex gap-2">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'posts'
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <span>📢</span>
                        <span>منشورات الفريق</span>
                        {posts.length > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'posts' ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {posts.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('contact')}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'contact'
                            ? 'bg-teal-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <span>✉️</span>
                        <span>تواصل معنا</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                {activeTab === 'posts' ? (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
                                <p className="text-gray-600">جاري التحميل...</p>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
                                <div className="text-6xl mb-6">📭</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد منشورات</h3>
                                <p className="text-gray-600">سيتم نشر التحديثات والإعلانات هنا قريباً</p>
                            </div>
                        ) : (
                            posts.map(post => (
                                <PostCard key={post.id || post._id} post={post} />
                            ))
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">أرسل لنا رسالة</h2>
                            <p className="text-gray-600">نحن هنا للاستماع إليك والرد على استفساراتك</p>
                        </div>
                        <ContactForm />
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-teal-900 text-white py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-teal-200">© {new Date().getFullYear()} عائلة الشاعر - فريق التطوير</p>
                        <div className="flex items-center gap-4 text-sm">
                            <Link to="/family-tree/appreciation" className="text-teal-200 hover:text-white transition-colors">
                                تقدير المؤسس
                            </Link>
                            <span className="text-teal-400">|</span>
                            <Link to="/family-tree/tree" className="text-teal-200 hover:text-white transition-colors">
                                شجرة العائلة
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DevTeamPage;

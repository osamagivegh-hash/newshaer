/**
 * Admin Development Team Management
 * Enhanced with:
 * - Rich-text editor for posts
 * - Author info editing
 * - Alert box management
 * - Styling controls
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

// Simple Rich Text Editor Component
const RichTextEditor = ({ value, onChange, placeholder }) => {
    const editorRef = useRef(null);

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertImage = () => {
        const url = prompt('أدخل رابط الصورة:');
        if (url) {
            execCommand('insertImage', url);
        }
    };

    const insertLink = () => {
        const url = prompt('أدخل الرابط:');
        if (url) {
            execCommand('createLink', url);
        }
    };

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, []);

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="bg-gray-100 border-b border-gray-300 p-2 flex flex-wrap gap-1">
                {/* Text Style */}
                <div className="flex gap-1 border-l border-gray-300 pl-2 ml-2">
                    <button type="button" onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-200 rounded" title="غامق">
                        <strong>B</strong>
                    </button>
                    <button type="button" onClick={() => execCommand('italic')} className="p-2 hover:bg-gray-200 rounded" title="مائل">
                        <em>I</em>
                    </button>
                    <button type="button" onClick={() => execCommand('underline')} className="p-2 hover:bg-gray-200 rounded" title="تسطير">
                        <u>U</u>
                    </button>
                </div>

                {/* Headings */}
                <div className="flex gap-1 border-l border-gray-300 pl-2 ml-2">
                    <select
                        onChange={(e) => execCommand('formatBlock', e.target.value)}
                        className="p-1 border border-gray-300 rounded text-sm"
                    >
                        <option value="p">فقرة</option>
                        <option value="h1">عنوان 1</option>
                        <option value="h2">عنوان 2</option>
                        <option value="h3">عنوان 3</option>
                    </select>
                </div>

                {/* Lists */}
                <div className="flex gap-1 border-l border-gray-300 pl-2 ml-2">
                    <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-gray-200 rounded" title="قائمة نقطية">
                        •
                    </button>
                    <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-2 hover:bg-gray-200 rounded" title="قائمة مرقمة">
                        1.
                    </button>
                </div>

                {/* Alignment */}
                <div className="flex gap-1 border-l border-gray-300 pl-2 ml-2">
                    <button type="button" onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-gray-200 rounded" title="محاذاة يمين">
                        ▶
                    </button>
                    <button type="button" onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-gray-200 rounded" title="توسيط">
                        ◼
                    </button>
                    <button type="button" onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-gray-200 rounded" title="محاذاة يسار">
                        ◀
                    </button>
                </div>

                {/* Insert */}
                <div className="flex gap-1">
                    <button type="button" onClick={insertLink} className="p-2 hover:bg-gray-200 rounded" title="إدراج رابط">
                        🔗
                    </button>
                    <button type="button" onClick={insertImage} className="p-2 hover:bg-gray-200 rounded" title="إدراج صورة">
                        🖼️
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none"
                dir="rtl"
                style={{ direction: 'rtl' }}
                data-placeholder={placeholder}
            />
        </div>
    );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
    const styles = {
        new: 'bg-red-100 text-red-700',
        read: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-yellow-100 text-yellow-700',
        resolved: 'bg-green-100 text-green-700',
        archived: 'bg-gray-100 text-gray-600'
    };

    const labels = {
        new: 'جديد',
        read: 'مقروء',
        in_progress: 'قيد المعالجة',
        resolved: 'تم الحل',
        archived: 'مؤرشف'
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.new}`}>
            {labels[status] || status}
        </span>
    );
};

// Message Detail Modal
const MessageDetailModal = ({ message, onClose, onUpdate }) => {
    const [response, setResponse] = useState(message.response || '');
    const [status, setStatus] = useState(message.status);
    const [priority, setPriority] = useState(message.priority || 'medium');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/dev-team/admin/messages/${message.id || message._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ status, response, priority })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('تم تحديث الرسالة بنجاح');
                onUpdate(data.data);
                onClose();
            } else {
                toast.error(data.message || 'خطأ في التحديث');
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error('خطأ في الاتصال');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-6 rounded-t-2xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-2">{message.subject}</h2>
                            <p className="text-sm text-teal-100">من: {message.senderName}</p>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">×</button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-700 mb-3">معلومات المرسل</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-gray-500">الاسم:</span> <span className="font-medium">{message.senderName}</span></div>
                            <div><span className="text-gray-500">البريد:</span> <a href={`mailto:${message.senderEmail}`} className="text-teal-600">{message.senderEmail}</a></div>
                            {message.senderPhone && <div><span className="text-gray-500">الهاتف:</span> {message.senderPhone}</div>}
                            <div><span className="text-gray-500">التاريخ:</span> {formatDate(message.createdAt)}</div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-medium text-gray-700 mb-2">الرسالة</h3>
                        <div className="bg-gray-50 rounded-lg p-4 text-gray-800 whitespace-pre-wrap">{message.message}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="new">جديد</option>
                                <option value="read">مقروء</option>
                                <option value="in_progress">قيد المعالجة</option>
                                <option value="resolved">تم الحل</option>
                                <option value="archived">مؤرشف</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
                            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="low">منخفضة</option>
                                <option value="medium">متوسطة</option>
                                <option value="high">عالية</option>
                                <option value="urgent">عاجلة</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الرد</label>
                        <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-y" placeholder="اكتب ردك هنا..." />
                    </div>
                </div>

                <div className="border-t p-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">إغلاق</button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Post Form Modal with Rich Text
const PostFormModal = ({ post, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: post?.title || '',
        content: post?.content || '',
        summary: post?.summary || '',
        postType: post?.postType || 'general',
        icon: post?.icon || '📢',
        author: post?.author || '',
        authorRole: post?.authorRole || 'مطور',
        authorAvatar: post?.authorAvatar || '',
        featuredImage: post?.featuredImage || '',
        isPublished: post?.isPublished ?? true,
        isPinned: post?.isPinned || false,
        isFounderPost: post?.isFounderPost || false,
        paragraphSpacing: post?.paragraphSpacing || 'normal',
        textAlignment: post?.textAlignment || 'right',
        isArticle: post?.isArticle || false,
        maxCollapsedHeight: post?.maxCollapsedHeight || 0
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            toast.error('العنوان والمحتوى مطلوبان');
            return;
        }
        setSaving(true);

        try {
            const url = post
                ? `${API_URL}/api/dev-team/admin/posts/${post.id || post._id}`
                : `${API_URL}/api/dev-team/admin/posts`;

            const res = await fetch(url, {
                method: post ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                toast.success(post ? 'تم تحديث المنشور' : 'تم إنشاء المنشور');
                onSave(data.data);
                onClose();
            } else {
                toast.error(data.message || 'حدث خطأ');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('خطأ في الحفظ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b sticky top-0 bg-white z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">{post ? 'تعديل المنشور' : 'إنشاء منشور جديد'}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Title & Icon */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">العنوان *</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">الأيقونة</label>
                            <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-2xl text-center" />
                        </div>
                    </div>

                    {/* Author Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">اسم الكاتب</label>
                            <input type="text" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="فريق التطوير" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">المسمى الوظيفي</label>
                            <input type="text" value={formData.authorRole} onChange={(e) => setFormData({ ...formData, authorRole: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="مطور" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">صورة الكاتب (URL)</label>
                            <input type="url" value={formData.authorAvatar} onChange={(e) => setFormData({ ...formData, authorAvatar: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" dir="ltr" />
                        </div>
                    </div>

                    {/* Post Type & Featured Image */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">نوع المنشور</label>
                            <select value={formData.postType} onChange={(e) => setFormData({ ...formData, postType: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="general">عام</option>
                                <option value="announcement">إعلان</option>
                                <option value="update">تحديث</option>
                                <option value="feature">ميزة جديدة</option>
                                <option value="maintenance">صيانة</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">صورة المنشور (URL)</label>
                            <input type="url" value={formData.featuredImage} onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" dir="ltr" />
                        </div>
                    </div>

                    {/* Summary */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ملخص</label>
                        <input type="text" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="ملخص قصير يظهر قبل التوسيع..." />
                    </div>

                    {/* Rich Content Editor */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">المحتوى *</label>
                        <RichTextEditor value={formData.content} onChange={(content) => setFormData({ ...formData, content })} placeholder="اكتب محتوى المنشور هنا..." />
                    </div>

                    {/* Styling Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">المسافات بين الفقرات</label>
                            <select value={formData.paragraphSpacing} onChange={(e) => setFormData({ ...formData, paragraphSpacing: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="compact">مضغوط</option>
                                <option value="normal">عادي</option>
                                <option value="spacious">واسع</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">محاذاة النص</label>
                            <select value={formData.textAlignment} onChange={(e) => setFormData({ ...formData, textAlignment: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="right">يمين</option>
                                <option value="center">وسط</option>
                                <option value="justify">ضبط</option>
                            </select>
                        </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <span>نشر المنشور</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.isPinned} onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <span>تثبيت في الأعلى</span>
                        </label>
                    </div>

                    {/* Priority Post Section - Subtle GS Badge */}
                    <div className={`border rounded-xl p-4 space-y-4 ${formData.isFounderPost ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⭐</span>
                            <div>
                                <h4 className={`font-bold ${formData.isFounderPost ? 'text-amber-800' : 'text-gray-700'}`}>تثبيت أولوية عالية <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded ml-2">GS</span></h4>
                                <p className={`text-sm ${formData.isFounderPost ? 'text-amber-700' : 'text-gray-500'}`}>سيظهر هذا المنشور في أعلى القائمة قبل جميع المنشورات الأخرى</p>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isFounderPost}
                                onChange={(e) => setFormData({ ...formData, isFounderPost: e.target.checked })}
                                className="w-5 h-5 rounded text-amber-600 accent-amber-500"
                            />
                            <span className={`font-medium ${formData.isFounderPost ? 'text-amber-800' : 'text-gray-700'}`}>
                                تفعيل الأولوية العالية (GS)
                            </span>
                        </label>
                        {formData.isFounderPost && (
                            <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                <strong>⭐</strong> هذا المنشور سيظهر قبل جميع المنشورات الأخرى بما في ذلك المنشورات المثبتة
                            </div>
                        )}
                    </div>

                    {/* Article Mode Section */}
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📄</span>
                            <div>
                                <h4 className="font-bold text-teal-900">وضع المقال</h4>
                                <p className="text-sm text-teal-700">عرض المحتوى الكامل مباشرة عند فتح الصفحة</p>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.isArticle} onChange={(e) => setFormData({ ...formData, isArticle: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <span className="font-medium">نشر كمقال (عرض كامل افتراضياً)</span>
                        </label>
                        {formData.isArticle && (
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    الحد الأقصى للارتفاع قبل "قراءة المزيد" (بالبكسل)
                                    <span className="text-gray-500 text-xs mr-2">(اتركه 0 لعرض المحتوى كاملاً)</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.maxCollapsedHeight}
                                    onChange={(e) => setFormData({ ...formData, maxCollapsedHeight: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    min="0"
                                    step="50"
                                    placeholder="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">القيم الموصى بها: 500 للمقالات القصيرة، 800 للمتوسطة، 0 لعرض كل شيء</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">إلغاء</button>
                        <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                            {saving ? 'جاري الحفظ...' : (post ? 'تحديث' : 'إنشاء')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Alert Form Modal
const AlertFormModal = ({ alert, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        title: alert?.title || '',
        content: alert?.content || '',
        alertType: alert?.alertType || 'info',
        backgroundColor: alert?.backgroundColor || '#0d9488',
        textColor: alert?.textColor || '#ffffff',
        icon: alert?.icon || '📢',
        showButton: alert?.showButton ?? true,
        buttonText: alert?.buttonText || 'عرض التفاصيل',
        buttonLink: alert?.buttonLink || '/family-tree/dev-team',
        isActive: alert?.isActive ?? true,
        isDismissible: alert?.isDismissible ?? true,
        isSticky: alert?.isSticky || false,
        order: alert?.order || 0,
        startDate: alert?.startDate ? new Date(alert.startDate).toISOString().slice(0, 16) : '',
        endDate: alert?.endDate ? new Date(alert.endDate).toISOString().slice(0, 16) : ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            toast.error('العنوان والمحتوى مطلوبان');
            return;
        }
        setSaving(true);

        try {
            const url = alert
                ? `${API_URL}/api/dev-team/admin/alerts/${alert.id || alert._id}`
                : `${API_URL}/api/dev-team/admin/alerts`;

            const res = await fetch(url, {
                method: alert ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                toast.success(alert ? 'تم تحديث التنبيه' : 'تم إنشاء التنبيه');
                onSave(data.data);
                onClose();
            } else {
                toast.error(data.message || 'حدث خطأ');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('خطأ في الحفظ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">{alert ? 'تعديل التنبيه' : 'إنشاء تنبيه جديد'}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Title & Icon */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">العنوان *</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">الأيقونة</label>
                            <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-2xl text-center" />
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">المحتوى *</label>
                        <RichTextEditor value={formData.content} onChange={(content) => setFormData({ ...formData, content })} placeholder="محتوى التنبيه..." />
                    </div>

                    {/* Type & Colors */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">نوع التنبيه</label>
                            <select value={formData.alertType} onChange={(e) => setFormData({ ...formData, alertType: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="info">معلومات</option>
                                <option value="success">نجاح</option>
                                <option value="warning">تحذير</option>
                                <option value="danger">خطر</option>
                                <option value="announcement">إعلان</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">لون الخلفية</label>
                            <input type="color" value={formData.backgroundColor} onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })} className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">لون النص</label>
                            <input type="color" value={formData.textColor} onChange={(e) => setFormData({ ...formData, textColor: e.target.value })} className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer" />
                        </div>
                    </div>

                    {/* Button Options */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="flex items-center gap-2 mb-2">
                                <input type="checkbox" checked={formData.showButton} onChange={(e) => setFormData({ ...formData, showButton: e.target.checked })} className="w-4 h-4" />
                                <span className="text-sm font-medium text-gray-700">إظهار زر</span>
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">نص الزر</label>
                            <input type="text" value={formData.buttonText} onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">رابط الزر</label>
                            <input type="text" value={formData.buttonLink} onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>

                    {/* Scheduling */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">الترتيب</label>
                            <input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" min="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البدء</label>
                            <input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ الانتهاء</label>
                            <input type="datetime-local" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                        </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <span>نشط</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.isDismissible} onChange={(e) => setFormData({ ...formData, isDismissible: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <span>قابل للإخفاء</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.isSticky} onChange={(e) => setFormData({ ...formData, isSticky: e.target.checked })} className="w-5 h-5 rounded text-teal-600" />
                            <span>ثابت (sticky)</span>
                        </label>
                    </div>

                    {/* Preview */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: formData.backgroundColor, color: formData.textColor }}>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{formData.icon}</span>
                            <div>
                                <h4 className="font-bold">{formData.title || 'عنوان التنبيه'}</h4>
                                <p className="text-sm opacity-80">{formData.content ? 'محتوى التنبيه...' : 'سيظهر المحتوى هنا'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">إلغاء</button>
                        <button type="submit" disabled={saving} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
                            {saving ? 'جاري الحفظ...' : (alert ? 'تحديث' : 'إنشاء')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Component
const AdminDevTeamMessages = () => {
    const [activeTab, setActiveTab] = useState('messages');
    const [messages, setMessages] = useState([]);
    const [posts, setPosts] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showPostForm, setShowPostForm] = useState(false);
    const [showAlertForm, setShowAlertForm] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [editingAlert, setEditingAlert] = useState(null);
    const [filter, setFilter] = useState({ status: '', category: '' });

    useEffect(() => {
        fetchData();
    }, [filter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchMessages(), fetchPosts(), fetchAlerts(), fetchStats()]);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            let url = `${API_URL}/api/dev-team/admin/messages?`;
            if (filter.status) url += `status=${filter.status}&`;
            if (filter.category) url += `category=${filter.category}&`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) setMessages(data.data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchPosts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/dev-team/admin/posts`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) setPosts(data.data || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    };

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/dev-team/admin/alerts`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) setAlerts(data.data || []);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/dev-team/admin/messages/stats`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) setStats(data.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const deleteMessage = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
        try {
            const res = await fetch(`${API_URL}/api/dev-team/admin/messages/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('تم حذف الرسالة');
                fetchMessages();
                fetchStats();
            }
        } catch (error) {
            toast.error('خطأ في الحذف');
        }
    };

    const deletePost = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
        try {
            const res = await fetch(`${API_URL}/api/dev-team/admin/posts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('تم حذف المنشور');
                fetchPosts();
            }
        } catch (error) {
            toast.error('خطأ في الحذف');
        }
    };

    const deleteAlert = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا التنبيه؟')) return;
        try {
            const res = await fetch(`${API_URL}/api/dev-team/admin/alerts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('تم حذف التنبيه');
                fetchAlerts();
            }
        } catch (error) {
            toast.error('خطأ في الحذف');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-6 text-white">
                <h1 className="text-2xl font-bold mb-2">👨‍💻 إدارة فريق التطوير</h1>
                <p className="text-teal-100">إدارة الرسائل والمنشورات والتنبيهات</p>

                {stats && (
                    <div className="flex flex-wrap gap-4 mt-4">
                        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <span className="text-sm text-teal-100">رسائل جديدة:</span>
                            <span className="mr-2 font-bold">{stats.new}</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <span className="text-sm text-teal-100">منشورات:</span>
                            <span className="mr-2 font-bold">{posts.length}</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <span className="text-sm text-teal-100">تنبيهات نشطة:</span>
                            <span className="mr-2 font-bold">{alerts.filter(a => a.isActive).length}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-3 flex-wrap">
                <button onClick={() => setActiveTab('messages')} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'messages' ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    <span>✉️</span><span>الرسائل</span>
                    {stats?.new > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.new}</span>}
                </button>
                <button onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'posts' ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    <span>📢</span><span>المنشورات</span>
                </button>
                <button onClick={() => setActiveTab('alerts')} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'alerts' ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    <span>🔔</span><span>التنبيهات</span>
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                {activeTab === 'messages' && (
                    <>
                        <div className="flex gap-4 mb-6">
                            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">جميع الحالات</option>
                                <option value="new">جديد</option>
                                <option value="read">مقروء</option>
                                <option value="in_progress">قيد المعالجة</option>
                                <option value="resolved">تم الحل</option>
                                <option value="archived">مؤرشف</option>
                            </select>
                            <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg">
                                <option value="">جميع الأنواع</option>
                                <option value="suggestion">اقتراح</option>
                                <option value="bug">مشكلة تقنية</option>
                                <option value="question">استفسار</option>
                                <option value="feedback">ملاحظات</option>
                                <option value="other">أخرى</option>
                            </select>
                        </div>

                        {messages.length === 0 ? (
                            <div className="text-center py-12 text-gray-500"><div className="text-5xl mb-4">📭</div><p>لا توجد رسائل</p></div>
                        ) : (
                            <div className="space-y-3">
                                {messages.map((msg) => (
                                    <div key={msg.id || msg._id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${msg.status === 'new' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`} onClick={() => setSelectedMessage(msg)}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <StatusBadge status={msg.status} />
                                                </div>
                                                <h3 className="font-bold text-gray-900 mb-1">{msg.subject}</h3>
                                                <p className="text-sm text-gray-600">من: {msg.senderName} ({msg.senderEmail})</p>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(msg.createdAt)}</p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id || msg._id); }} className="p-2 text-red-600 hover:bg-red-100 rounded-lg">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'posts' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">منشورات الفريق</h2>
                            <button onClick={() => { setEditingPost(null); setShowPostForm(true); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2">
                                <span>+</span><span>منشور جديد</span>
                            </button>
                        </div>

                        {posts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500"><div className="text-5xl mb-4">📝</div><p>لا توجد منشورات</p></div>
                        ) : (
                            <div className="space-y-3">
                                {posts.map((post) => (
                                    <div key={post.id || post._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xl">{post.icon}</span>
                                                    <h3 className="font-bold text-gray-900">{post.title}</h3>
                                                    {post.isArticle && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📄 مقال</span>}
                                                    {post.isPinned && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">📌 مثبت</span>}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${post.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {post.isPublished ? 'منشور' : 'مسودة'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">الكاتب: {post.author} - {post.authorRole}</p>
                                                <p className="text-xs text-gray-500 mt-1">{formatDate(post.createdAt)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => { setEditingPost(post); setShowPostForm(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">✏️</button>
                                                <button onClick={() => deletePost(post.id || post._id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg">🗑️</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'alerts' && (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">تنبيهات المطورين</h2>
                            <button onClick={() => { setEditingAlert(null); setShowAlertForm(true); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2">
                                <span>+</span><span>تنبيه جديد</span>
                            </button>
                        </div>

                        {alerts.length === 0 ? (
                            <div className="text-center py-12 text-gray-500"><div className="text-5xl mb-4">🔔</div><p>لا توجد تنبيهات</p></div>
                        ) : (
                            <div className="space-y-3">
                                {alerts.map((alert) => (
                                    <div key={alert.id || alert._id} className="rounded-lg p-4 flex items-start justify-between gap-4" style={{ backgroundColor: alert.backgroundColor + '20', borderLeft: `4px solid ${alert.backgroundColor}` }}>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl">{alert.icon}</span>
                                                <h3 className="font-bold text-gray-900">{alert.title}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${alert.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {alert.isActive ? 'نشط' : 'غير نشط'}
                                                </span>
                                                {alert.isSticky && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">ثابت</span>}
                                            </div>
                                            <p className="text-sm text-gray-600">الترتيب: {alert.order}</p>
                                            <p className="text-xs text-gray-500 mt-1">{formatDate(alert.createdAt)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => { setEditingAlert(alert); setShowAlertForm(true); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">✏️</button>
                                            <button onClick={() => deleteAlert(alert.id || alert._id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {selectedMessage && <MessageDetailModal message={selectedMessage} onClose={() => setSelectedMessage(null)} onUpdate={(updated) => { setMessages(messages.map(m => (m.id || m._id) === (updated.id || updated._id) ? updated : m)); fetchStats(); }} />}
            {showPostForm && <PostFormModal post={editingPost} onClose={() => { setShowPostForm(false); setEditingPost(null); }} onSave={() => fetchPosts()} />}
            {showAlertForm && <AlertFormModal alert={editingAlert} onClose={() => { setShowAlertForm(false); setEditingAlert(null); }} onSave={() => fetchAlerts()} />}
        </div>
    );
};

export default AdminDevTeamMessages;

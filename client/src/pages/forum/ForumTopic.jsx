import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useForumAuth } from '../../contexts/ForumAuthContext';

const ForumTopic = () => {
    const { id } = useParams();
    const [topic, setTopic] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyContent, setReplyContent] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);
    const [error, setError] = useState('');

    // Edit/Delete States
    const [editingTopic, setEditingTopic] = useState(false);
    const [editTopicContent, setEditTopicContent] = useState('');
    const [editingPostId, setEditingPostId] = useState(null);
    const [editPostContent, setEditPostContent] = useState('');

    const { forumUser } = useForumAuth();

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'clean']
        ],
    };

    const fetchTopicData = async () => {
        try {
            const [topicRes, postsRes] = await Promise.all([
                axios.get(`/api/forum/topics/${id}`),
                axios.get(`/api/forum/topics/${id}/posts`)
            ]);

            if (topicRes.data.success) {
                setTopic(topicRes.data.topic);
            }
            if (postsRes.data.success) {
                setPosts(postsRes.data.posts);
            }
        } catch (err) {
            setError('خطأ في تحميل الموضوع أو المشاركات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTopicData();
    }, [id]);

    const handleReply = async (e) => {
        e.preventDefault();

        if (!replyContent || replyContent.replace(/<[^>]*>?/gm, '').trim().length < 2) {
            alert('المشاركة قصيرة جداً');
            return;
        }

        setReplyLoading(true);
        try {
            const token = localStorage.getItem('forumToken');
            const res = await axios.post(
                `/api/forum/topics/${id}/posts`,
                { content: replyContent },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setReplyContent('');
                setPosts([...posts, res.data.post]);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'فشل إضافة الرد');
        } finally {
            setReplyLoading(false);
        }
    };

    const handleDeleteTopic = async () => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الموضوع؟ الرجاء العلم أن الحذف لا يمكن التراجع عنه.')) return;
        try {
            const token = localStorage.getItem('forumToken');
            // If admin/mod, use admin route, else use normal route
            const route = (forumUser.role === 'admin' || forumUser.role === 'moderator')
                ? `/api/forum-admin/topics/${id}`
                : `/api/forum/topics/${id}`;
            await axios.delete(route, { headers: { Authorization: `Bearer ${token}` } });
            window.location.href = `/family-tree/forum/category/${topic.category._id}`;
        } catch (err) {
            alert(err.response?.data?.message || 'فشل حذف الموضوع');
        }
    };

    const handleEditTopicSubmit = async () => {
        try {
            const token = localStorage.getItem('forumToken');
            const res = await axios.put(`/api/forum/topics/${id}`,
                { title: topic.title, content: editTopicContent },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                setTopic({ ...topic, content: editTopicContent });
                setEditingTopic(false);
                setEditTopicContent('');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'فشل تعديل الموضوع');
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('هل أنت متأكد من حذف هذه المشاركة؟')) return;
        try {
            const token = localStorage.getItem('forumToken');
            const route = (forumUser.role === 'admin' || forumUser.role === 'moderator')
                ? `/api/forum-admin/posts/${postId}`
                : `/api/forum/posts/${postId}`;
            await axios.delete(route, { headers: { Authorization: `Bearer ${token}` } });
            setPosts(posts.filter(p => p._id !== postId));
        } catch (err) {
            alert(err.response?.data?.message || 'فشل حذف المشاركة');
        }
    };

    const handleEditPostSubmit = async (postId) => {
        try {
            const token = localStorage.getItem('forumToken');
            const res = await axios.put(`/api/forum/posts/${postId}`,
                { content: editPostContent },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
                setPosts(posts.map(p => p._id === postId ? { ...p, content: editPostContent } : p));
                setEditingPostId(null);
                setEditPostContent('');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'فشل تعديل المشاركة');
        }
    };

    const renderPostContent = (htmlContent) => {
        return { __html: DOMPurify.sanitize(htmlContent) };
    };

    if (loading) return <div className="text-center py-10">جاري التحميل...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
    if (!topic) return <div className="text-center py-10 text-gray-500">الموضوع غير موجود!</div>;

    return (
        <div className="space-y-6" dir="rtl">
            <div className="text-sm breadcrumbs mb-4 flex gap-2 text-gray-500">
                <Link to="/family-tree/forum" className="hover:text-palestine-green font-bold">المنتدى</Link> &gt;
                <Link to={`/family-tree/forum/category/${topic.category._id}`} className="hover:text-palestine-green font-bold">{topic.category.title}</Link> &gt;
                <span className="text-gray-800 font-bold">{topic.title}</span>
            </div>

            {/* Main Topic (First Post) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y">

                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-palestine-blue">
                        {topic.isPinned && <span className="text-red-500" title="مثبت">📌</span>}
                        {topic.isLocked && <span className="text-gray-500" title="مغلق">🔒</span>}
                        {topic.title}
                    </h1>
                </div>

                <div className="p-6">
                    {/* Header: Author & Dates */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                        {/* Author Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-palestine-green/20 text-palestine-green flex justify-center items-center text-xl font-bold border border-gray-200 shadow-sm shrink-0">
                                {topic.author.avatar ? (
                                    <img src={topic.author.avatar} alt={topic.author.username} className="w-full h-full object-cover" />
                                ) : (
                                    topic.author.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-palestine-green text-lg leading-tight">{topic.author.username}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {topic.author.role === 'admin' ? 'Admin' : topic.author.role === 'moderator' ? 'مشرف' : 'عضو'}
                                </p>
                            </div>
                        </div>
                        {/* Time & Actions */}
                        <div className="text-left text-sm text-gray-400 flex flex-col items-end gap-2">
                            <span>{new Date(topic.createdAt).toLocaleString('ar-EG')}</span>
                            {forumUser && (forumUser._id === topic.author._id || forumUser.role === 'admin' || forumUser.role === 'moderator') && (
                                <div className="flex gap-3 mt-1">
                                    {forumUser._id === topic.author._id && !topic.isLocked && (
                                        <button
                                            onClick={() => {
                                                setEditingTopic(!editingTopic);
                                                setEditTopicContent(topic.content);
                                            }}
                                            className="text-blue-500 hover:underline text-xs bg-blue-50 px-2 py-1 rounded"
                                        >
                                            {editingTopic ? 'إلغاء التعديل' : 'تعديل'}
                                        </button>
                                    )}
                                    <button onClick={handleDeleteTopic} className="text-red-500 hover:underline text-xs bg-red-50 px-2 py-1 rounded">حذف</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content block */}
                    <div>
                        {editingTopic ? (
                            <div className="space-y-4">
                                <ReactQuill
                                    theme="snow"
                                    modules={modules}
                                    value={editTopicContent}
                                    onChange={setEditTopicContent}
                                />
                                <button
                                    onClick={handleEditTopicSubmit}
                                    className="bg-palestine-green text-white px-4 py-2 rounded font-bold"
                                >
                                    حفظ التعديل
                                </button>
                            </div>
                        ) : (
                            <div className="prose max-w-none text-gray-800 leading-relaxed ql-editor px-0"
                                dangerouslySetInnerHTML={renderPostContent(topic.content)}>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Replies List */}
            {posts.map(post => (
                <div key={post._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 mb-4">
                    {/* Header: Author & Dates */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                        {/* Author Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-palestine-blue/20 text-palestine-blue flex justify-center items-center text-lg font-bold border border-gray-200 shadow-sm shrink-0">
                                {post.author.avatar ? (
                                    <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
                                ) : (
                                    post.author.username.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-palestine-blue text-base leading-tight">{post.author.username}</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {post.author.role === 'admin' ? 'Admin' : post.author.role === 'moderator' ? 'مشرف' : 'عضو'}
                                </p>
                            </div>
                        </div>
                        {/* Time & Actions */}
                        <div className="text-left text-sm text-gray-400 flex flex-col items-end gap-2">
                            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ar })}</span>
                            {forumUser && (forumUser._id === post.author._id || forumUser.role === 'admin' || forumUser.role === 'moderator') && (
                                <div className="flex gap-3 mt-1">
                                    {forumUser._id === post.author._id && !topic.isLocked && (
                                        <button
                                            onClick={() => {
                                                if (editingPostId === post._id) {
                                                    setEditingPostId(null);
                                                } else {
                                                    setEditingPostId(post._id);
                                                    setEditPostContent(post.content);
                                                }
                                            }}
                                            className="text-blue-500 hover:underline text-xs bg-blue-50 px-2 py-1 rounded"
                                        >
                                            {editingPostId === post._id ? 'إلغاء' : 'تعديل'}
                                        </button>
                                    )}
                                    <button onClick={() => handleDeletePost(post._id)} className="text-red-500 hover:underline text-xs bg-red-50 px-2 py-1 rounded">حذف</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        {editingPostId === post._id ? (
                            <div className="space-y-4">
                                <ReactQuill
                                    theme="snow"
                                    modules={modules}
                                    value={editPostContent}
                                    onChange={setEditPostContent}
                                />
                                <button
                                    onClick={() => handleEditPostSubmit(post._id)}
                                    className="bg-palestine-blue text-white px-4 py-2 rounded font-bold"
                                >
                                    حفظ التعديل
                                </button>
                            </div>
                        ) : (
                            <div className="prose max-w-none text-gray-800 leading-relaxed ql-editor px-0"
                                dangerouslySetInnerHTML={renderPostContent(post.content)}>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Create Reply Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                {!forumUser ? (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-4">يجب تسجيل الدخول لإضافة مشاركة.</p>
                        <Link to="/family-tree/forum/login" className="bg-palestine-green text-white font-bold py-2 px-6 rounded-lg">
                            تسجيل الدخول
                        </Link>
                    </div>
                ) : topic.isLocked && forumUser.role === 'user' ? (
                    <div className="text-center p-8 bg-gray-50 rounded-lg text-red-500 font-bold">
                        الموضوع مغلق ولاتقبل ردود جديدة.
                    </div>
                ) : (
                    <form onSubmit={handleReply} className="space-y-4">
                        <h3 className="font-bold text-lg text-palestine-green">أضف رداً</h3>
                        <div className="bg-white">
                            <ReactQuill
                                theme="snow"
                                modules={modules}
                                value={replyContent}
                                onChange={setReplyContent}
                                placeholder="اكتب مشاركتك هنا..."
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={replyLoading}
                                className="bg-palestine-green hover:bg-green-700 text-white font-bold py-2 px-8 rounded-lg transition disabled:opacity-50"
                            >
                                {replyLoading ? 'جاري الإضافة...' : 'إضافة الرد'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForumTopic;

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useForumAuth } from '../../../contexts/ForumAuthContext';

const ForumTopic = () => {
    const { id } = useParams();
    const [topic, setTopic] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyContent, setReplyContent] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);
    const [error, setError] = useState('');
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

                <div className="grid grid-cols-1 md:grid-cols-4 min-h-[250px] p-6 gap-6">
                    {/* Author block (Side) */}
                    <div className="md:col-span-1 border-b md:border-b-0 md:border-l border-gray-100 pb-4 md:pb-0 text-center md:text-right flex flex-col items-center gap-2">
                        <div className="w-20 h-20 rounded-full bg-palestine-green/20 text-palestine-green flex justify-center items-center text-3xl font-bold">
                            {topic.author.username.charAt(0)}
                        </div>
                        <h3 className="font-bold text-lg text-palestine-green">{topic.author.username}</h3>
                        <p className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-max">
                            {topic.author.role === 'admin' ? 'مدير' : topic.author.role === 'moderator' ? 'مشرف' : 'عضو'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            انضم: {new Date(topic.author.joinDate || Date.now()).toLocaleDateString('ar-EG')}
                        </p>
                    </div>
                    {/* Content block */}
                    <div className="md:col-span-3">
                        <div className="text-sm text-gray-400 mb-6 flex justify-between">
                            <span>{new Date(topic.createdAt).toLocaleString('ar-EG')}</span>
                        </div>
                        <div className="prose max-w-none text-gray-800 leading-relaxed ql-editor px-0"
                            dangerouslySetInnerHTML={renderPostContent(topic.content)}>
                        </div>
                    </div>
                </div>
            </div>

            {/* Replies List */}
            {posts.map(post => (
                <div key={post._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[200px] grid grid-cols-1 md:grid-cols-4 p-6 gap-6">
                    {/* Reply Author */}
                    <div className="md:col-span-1 border-b md:border-b-0 md:border-l border-gray-100 pb-4 md:pb-0 text-center md:text-right flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full bg-palestine-blue/20 text-palestine-blue flex justify-center items-center text-2xl font-bold">
                            {post.author.username.charAt(0)}
                        </div>
                        <h3 className="font-bold text-palestine-blue">{post.author.username}</h3>
                        <p className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full w-max">
                            {post.author.role === 'admin' ? 'مدير' : post.author.role === 'moderator' ? 'مشرف' : 'عضو'}
                        </p>
                    </div>
                    {/* Reply Content */}
                    <div className="md:col-span-3">
                        <div className="text-sm text-gray-400 mb-6 flex justify-between">
                            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ar })}</span>
                        </div>
                        <div className="prose max-w-none text-gray-800 leading-relaxed ql-editor px-0"
                            dangerouslySetInnerHTML={renderPostContent(post.content)}>
                        </div>
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

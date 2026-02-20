import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useForumAuth } from '../../contexts/ForumAuthContext';

const ForumCategory = () => {
    const { id } = useParams();
    const [category, setCategory] = useState(null);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { forumUser } = useForumAuth();

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await axios.get(`/api/forum/categories/${id}/topics`);
                if (res.data.success) {
                    setCategory(res.data.category);
                    setTopics(res.data.topics);
                }
            } catch (err) {
                setError('حدث خطأ أثناء تحميل المواضيع');
            } finally {
                setLoading(false);
            }
        };

        fetchTopics();
    }, [id]);

    if (loading) return <div className="text-center py-10">جاري التحميل...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <span>{category.icon}</span>
                        {category.title}
                    </h1>
                    <p className="text-gray-600 mt-2">{category.description}</p>
                </div>
                {forumUser ? (
                    <Link
                        to={`/family-tree/forum/category/${id}/new`}
                        className="bg-palestine-green hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow transition"
                    >
                        + موضوع جديد
                    </Link>
                ) : (
                    <Link to="/family-tree/forum/login" className="text-palestine-blue font-bold px-4 py-2 border rounded-lg hover:bg-gray-50">
                        تسجيل الدخول للمشاركة
                    </Link>
                )}
            </div>

            {/* Topics List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 p-4 border-b text-gray-500 font-bold hidden md:grid">
                    <div className="col-span-7">الموضوع / المؤلف</div>
                    <div className="col-span-2 text-center">الردود & المشاهدات</div>
                    <div className="col-span-3 text-left">آخر نشاط</div>
                </div>

                {topics.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">لا توجد مواضيع في هذا القسم حتى الآن. كن أول من يكتب!</div>
                ) : (
                    topics.map(topic => (
                        <div key={topic._id} className="grid grid-cols-1 md:grid-cols-12 p-4 border-b hover:bg-gray-50 transition items-center gap-4">
                            <div className="md:col-span-7 flex flex-col justify-center">
                                <Link to={`/family-tree/forum/topic/${topic._id}`}>
                                    <h3 className="text-lg font-bold text-palestine-blue hover:text-palestine-green transition flex items-center gap-2">
                                        {topic.isPinned && <span className="text-red-500" title="مثبت">📌</span>}
                                        {topic.isLocked && <span className="text-gray-500" title="مغلق">🔒</span>}
                                        {topic.title}
                                    </h3>
                                </Link>
                                <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                    <Link to={`/family-tree/forum/user/${topic.author._id}`} className="font-semibold text-gray-700 hover:text-palestine-green transition">
                                        {topic.author.username}
                                    </Link>
                                    <span>•</span>
                                    <span>{new Date(topic.createdAt).toLocaleDateString('ar-EG')}</span>
                                </div>
                            </div>
                            <div className="md:col-span-2 text-sm text-gray-500 md:text-center grid grid-cols-2 md:block">
                                <div><span className="md:hidden">الردود: </span>{topic.replyCount}</div>
                                <div className="mt-1"><span className="md:hidden">المشاهدات: </span>{topic.views}</div>
                            </div>
                            <div className="md:col-span-3 text-sm text-gray-400 md:text-left">
                                {formatDistanceToNow(new Date(topic.lastActivity), { addSuffix: true, locale: ar })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ForumCategory;

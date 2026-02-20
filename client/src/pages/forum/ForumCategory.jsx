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
            <div className="flex flex-col md:flex-row justify-between items-center md:items-center bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="text-center md:text-right w-full md:w-auto">
                    <h1 className="text-2xl md:text-3xl font-bold flex justify-center md:justify-start items-center gap-2 md:gap-3">
                        <span>{category.icon}</span>
                        {category.title}
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 mt-2">{category.description}</p>
                </div>
                <div className="w-full md:w-auto flex justify-center md:justify-end">
                    {forumUser ? (
                        <Link
                            to={`/family-tree/forum/category/${id}/new`}
                            className="bg-palestine-green hover:bg-green-700 w-full sm:w-auto text-center text-white font-bold py-2 px-6 rounded-lg shadow transition"
                        >
                            + موضوع جديد
                        </Link>
                    ) : (
                        <Link to="/family-tree/forum/login" className="text-palestine-blue w-full sm:w-auto text-center font-bold px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm md:text-base">
                            تسجيل الدخول للمشاركة
                        </Link>
                    )}
                </div>
            </div>

            {/* Topics List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-12 bg-gray-50 p-4 border-b text-gray-500 font-bold hidden md:grid">
                    <div className="col-span-7">الموضوع / المؤلف</div>
                    <div className="col-span-2 text-center">الردود & المشاهدات</div>
                    <div className="col-span-3 text-left">آخر نشاط</div>
                </div>

                {topics.length === 0 ? (
                    <div className="p-6 md:p-8 text-center text-gray-500 text-sm md:text-base">لا توجد مواضيع في هذا القسم حتى الآن. كن أول من يكتب!</div>
                ) : (
                    topics.map(topic => (
                        <div key={topic._id} className="flex flex-col md:grid md:grid-cols-12 p-3 md:p-4 border-b hover:bg-gray-50 transition md:items-center gap-2 md:gap-4">
                            <div className="md:col-span-7 flex flex-col justify-center">
                                <Link to={`/family-tree/forum/topic/${topic._id}`}>
                                    <h3 className="text-base md:text-lg font-bold text-palestine-blue hover:text-palestine-green transition flex items-start md:items-center gap-2">
                                        {topic.isPinned && <span className="text-red-500 text-sm" title="مثبت">📌</span>}
                                        {topic.isLocked && <span className="text-gray-500 text-sm" title="مغلق">🔒</span>}
                                        <span className="leading-tight">{topic.title}</span>
                                    </h3>
                                </Link>
                                <div className="text-xs md:text-sm text-gray-500 mt-1 flex items-center gap-2">
                                    <Link to={`/family-tree/forum/user/${topic.author._id}`} className="font-semibold text-gray-700 hover:text-palestine-green transition">
                                        {topic.author.username}
                                    </Link>
                                    <span>•</span>
                                    <span>{new Date(topic.createdAt).toLocaleDateString('ar-EG')}</span>
                                </div>
                            </div>
                            <div className="md:col-span-2 text-xs md:text-sm text-gray-500 md:text-center flex md:block gap-4 mt-1 md:mt-0 bg-gray-50 md:bg-transparent p-2 md:p-0 rounded">
                                <div><span className="md:hidden font-bold">الردود: </span>{topic.replyCount}</div>
                                <div className="md:mt-1 border-r md:border-none pr-4 md:pr-0 border-gray-300"><span className="md:hidden font-bold">المشاهدات: </span>{topic.views}</div>
                            </div>
                            <div className="md:col-span-3 text-xs md:text-sm text-gray-400 md:text-left mt-1 md:mt-0">
                                <span className="md:hidden font-semibold text-gray-500">آخر نشاط: </span>
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

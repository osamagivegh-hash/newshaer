import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ForumUserProfile = () => {
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await axios.get(`/api/forum/users/${id}`);
                if (res.data.success) {
                    setUser(res.data.user);
                    setStats(res.data.stats);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل بيانات العضو');
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [id]);

    if (loading) return <div className="text-center py-10">جاري التحميل...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
    if (!user) return <div className="text-center py-10 text-gray-500">العضو غير موجود!</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6" dir="rtl">
            {/* Breadcrumb */}
            <div className="text-sm breadcrumbs mb-4 flex gap-2 text-gray-500">
                <Link to="/family-tree/forum" className="hover:text-palestine-green font-bold">المنتدى</Link> &gt;
                <span className="text-gray-800 font-bold">ملف {user.username}</span>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Avatar */}
                <div className="w-32 h-32 rounded-full bg-palestine-blue/20 text-palestine-blue flex justify-center items-center text-5xl font-bold overflow-hidden border-4 border-palestine-green shadow-md shrink-0">
                    {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                        user.username.charAt(0).toUpperCase()
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-right w-full">
                    <h1 className="text-3xl font-bold text-palestine-blue">{user.username}</h1>
                    <div className="mt-2 inline-block bg-gray-100 px-4 py-1 rounded-full text-sm text-gray-700 font-medium">
                        {user.role === 'admin' ? 'Admin' : user.role === 'moderator' ? 'مشرف' : 'عضو'}
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-bold text-gray-700 mb-2">نبذة:</h3>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-600 min-h-[80px]">
                            {user.bio ? user.bio : 'هذا العضو لم يكتب نبذة تعريفية.'}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-palestine-green">{stats.topicCount}</span>
                            <span className="text-sm text-gray-500">المواضيع</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl font-bold text-palestine-blue">{stats.postCount}</span>
                            <span className="text-sm text-gray-500">المشاركات</span>
                        </div>
                        <div className="text-center col-span-2 md:col-span-2 flex flex-col justify-center items-center text-sm text-gray-500">
                            <span>تاريخ الانضمام:</span>
                            <span className="font-bold">{new Date(user.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForumUserProfile;

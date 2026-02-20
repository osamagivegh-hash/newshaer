import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForumAuth } from '../../contexts/ForumAuthContext';

const ForumProfile = () => {
    const { forumUser, checkAuthStatus } = useForumAuth();
    const [bio, setBio] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (forumUser) {
            setBio(forumUser.bio || '');
            setAvatarPreview(forumUser.avatar || '');
        }
    }, [forumUser]);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let avatarUrl = forumUser.avatar;

            // 1. Upload new avatar if selected
            if (avatarFile) {
                const formData = new FormData();
                formData.append('image', avatarFile);

                const uploadRes = await axios.post('/api/upload/single-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadRes.data && uploadRes.data.url) {
                    avatarUrl = uploadRes.data.url;
                }
            }

            // 2. Update profile
            const token = localStorage.getItem('forumToken');
            const res = await axios.patch('/api/forum-auth/profile',
                { bio, avatar: avatarUrl },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setMessage('تم تحديث الملف الشخصي بنجاح!');
                // Refresh contextual user data
                checkAuthStatus();
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!forumUser) return <div className="text-center py-10">الرجاء تسجيل الدخول أولاً</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-2xl font-bold text-palestine-blue mb-6">الملف الشخصي</h1>

                {message && (
                    <div className={`p-4 mb-6 rounded-lg ${message.includes('بنجاح') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-palestine-blue/20 text-palestine-blue flex justify-center items-center text-3xl font-bold overflow-hidden border-2 border-palestine-green">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                forumUser.username.charAt(0).toUpperCase()
                            )}
                        </div>

                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition text-sm">
                            تغيير الصورة الرمزية
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                        </label>
                    </div>

                    {/* Username & Email (Read Only) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">اسم المستخدم</label>
                            <input
                                type="text"
                                value={forumUser.username}
                                disabled
                                className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">البريد الإلكتروني</label>
                            <input
                                type="email"
                                value={forumUser.email}
                                disabled
                                className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">نبذة عنك</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-palestine-green h-24"
                            placeholder="اكتب شيئاً عن نفسك للتعريف بك في المنتدى..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-palestine-green hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
                    >
                        {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForumProfile;

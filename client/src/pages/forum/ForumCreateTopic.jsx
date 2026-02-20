import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import RichTextEditor from '../../components/Forum/RichTextEditor';
import { useForumAuth } from '../../contexts/ForumAuthContext';

const ForumCreateTopic = () => {
    const { categoryId } = useParams();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { forumUser } = useForumAuth();
    const navigate = useNavigate();



    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title || !content || content.replace(/<[^>]*>?/gm, '').trim().length < 5) {
            setError('الرجاء كتابة عنوان ومحتوى مناسب للموضوع');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('forumToken');
            const res = await axios.post(`/api/forum/categories/${categoryId}/topics`,
                { title, content },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                navigate(`/family-tree/forum/topic/${res.data.topic._id}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'خطأ أثناء إنشاء الموضوع');
        } finally {
            setLoading(false);
        }
    };

    if (!forumUser) {
        return <div className="text-center py-10 mt-10">يجب تسجيل الدخول لإضافة موضوع</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
            <h1 className="text-3xl font-bold text-palestine-green mb-6">إنشاء موضوع جديد</h1>

            {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div>
                    <label className="block text-gray-700 font-bold mb-2">عنوان الموضوع</label>
                    <input
                        type="text"
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-palestine-green outline-none"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="أدخل عنواناً واضحاً لموضوعك..."
                    />
                </div>

                <div>
                    <label className="block text-gray-700 font-bold mb-2">محتوى الموضوع</label>
                    <div className="bg-white" style={{ minHeight: '300px' }}>
                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                            placeholder="اكتب رسالتك هنا..."
                            style={{ height: '250px' }}
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition text-gray-600 font-bold"
                    >
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2 bg-palestine-green text-white font-bold rounded-lg hover:bg-green-700 transition shadow disabled:opacity-50"
                    >
                        {loading ? 'جاري النشر...' : 'نشر الموضوع'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ForumCreateTopic;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useForumAuth } from '../../contexts/ForumAuthContext';

const ForumLogin = () => {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { forumLogin } = useForumAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await axios.post('/api/forum-auth/login', credentials);
            if (res.data.success) {
                forumLogin(res.data.user, res.data.token);
                navigate('/family-tree/forum');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'فشل تسجيل الدخول');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-8 mt-10" dir="rtl">
            <h2 className="text-2xl font-bold text-center text-palestine-green mb-6">دخول المنتدى</h2>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-gray-700 mb-2">اسم المستخدم أو البريد الإلكتروني</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-palestine-green outline-none"
                        value={credentials.email}
                        onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-gray-700 mb-2">كلمة المرور</label>
                    <input
                        type="password"
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-palestine-green outline-none"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-palestine-green hover:bg-green-700 text-white font-bold py-2 rounded transition disabled:opacity-50"
                >
                    {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                </button>
            </form>
            <p className="mt-4 text-center text-gray-600">
                ليس لديك حساب؟ <Link to="/family-tree/forum/register" className="text-palestine-blue font-bold">سجل الآن</Link>
            </p>
        </div>
    );
};

export default ForumLogin;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForumAuth } from '../../contexts/ForumAuthContext';

const ForumAdminDashboard = () => {
    const { forumUser } = useForumAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('forumToken');
            const res = await axios.get('/api/forum-admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setUsers(res.data.users);
            }
        } catch (err) {
            setError('خطأ في جلب بيانات الأعضاء');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const token = localStorage.getItem('forumToken');
            const res = await axios.put(`/api/forum-admin/users/${userId}/role`, { role: newRole }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
                alert('تم تحديث الصلاحية بنجاح');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'خطأ في تحديث الصلاحية');
        }
    };

    const toggleUserStatus = async (userId) => {
        if (!window.confirm('هل أنت متأكد من تغيير حالة هذا العضو؟')) return;

        try {
            const token = localStorage.getItem('forumToken');
            const res = await axios.delete(`/api/forum-admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setUsers(users.map(u => u._id === userId ? { ...u, isActive: !u.isActive } : u));
                alert(res.data.message);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'خطأ في تغيير الحالة');
        }
    };

    if (loading) return <div className="text-center py-10">جاري تحميل لوحة التحكم...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

    if (!forumUser || (forumUser.role !== 'admin' && forumUser.role !== 'moderator')) {
        return <div className="text-center py-10 font-bold text-red-500">غير مصرح لك بالدخول إلى هذه الصفحة</div>;
    }

    return (
        <div className="space-y-6" dir="rtl">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-palestine-red mb-2">إدارة المنتدى</h1>
                    <p className="text-gray-600">إدارة الأعضاء والصلاحيات والمشاركات</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 font-bold text-lg text-palestine-blue">
                    إدارة الأعضاء ({users.length})
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-4">العضو</th>
                                <th className="p-4">البريد الإلكتروني</th>
                                <th className="p-4">تاريخ الانضمام</th>
                                <th className="p-4">الصلاحية</th>
                                <th className="p-4">الحالة</th>
                                <th className="p-4">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-bold">{user.username}</td>
                                    <td className="p-4 text-gray-600">{user.email}</td>
                                    <td className="p-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString('ar-EG')}</td>
                                    <td className="p-4">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                            disabled={forumUser.role !== 'admin' || user._id === forumUser._id}
                                            className="p-1 border rounded"
                                        >
                                            <option value="user">عضو</option>
                                            <option value="moderator">مشرف</option>
                                            {forumUser.role === 'admin' && <option value="admin">مدير</option>}
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs text-white ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {user.isActive ? 'نشط' : 'محظور'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleUserStatus(user._id)}
                                            disabled={user._id === forumUser._id}
                                            className={`px-3 py-1 rounded text-white text-sm ${user.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} disabled:opacity-50`}
                                        >
                                            {user.isActive ? 'حظر' : 'تفعيل'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Can expand later to show reported topics/posts */}
        </div>
    );
};

export default ForumAdminDashboard;

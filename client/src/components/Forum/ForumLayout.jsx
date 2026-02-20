import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useForumAuth } from '../../contexts/ForumAuthContext';

const ForumLayout = () => {
    const { forumUser, forumLogout } = useForumAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        forumLogout();
        navigate('/family-tree/forum');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-cairo" dir="rtl">
            <header className="bg-palestine-green text-white shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link to="/family-tree/forum" className="text-2xl font-bold flex items-center gap-2">
                        <span>🏛️</span>
                        <span>منتدى شجرة العائلة</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link to="/family-tree" className="text-white/80 hover:text-white transition">
                            العودة للشجرة
                        </Link>
                        {forumUser ? (
                            <div className="flex items-center gap-4 border-r border-white/20 pr-4">
                                {(forumUser.role === 'admin' || forumUser.role === 'moderator') && (
                                    <Link to="/family-tree/forum/admin" className="text-sm bg-palestine-red/20 text-white font-bold hover:bg-palestine-red/40 px-3 py-1 rounded">
                                        إدارة المنتدى
                                    </Link>
                                )}
                                <Link to="/family-tree/forum/profile" className="flex items-center gap-2 hover:text-gray-200">
                                    <div className="w-8 h-8 rounded-full bg-palestine-red flex items-center justify-center font-bold">
                                        {forumUser.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{forumUser.username}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded"
                                >
                                    تسجيل خروج
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 border-r border-white/20 pr-4">
                                <Link
                                    to="/family-tree/forum/login"
                                    className="px-4 py-1.5 rounded bg-white text-palestine-green font-semibold hover:bg-gray-100 transition"
                                >
                                    دخول
                                </Link>
                                <Link
                                    to="/family-tree/forum/register"
                                    className="px-4 py-1.5 rounded border border-white hover:bg-white/10 transition"
                                >
                                    تسجيل
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-4 py-8">
                <Outlet />
            </main>

            <footer className="bg-gray-900 text-white py-6 text-center">
                <p>منتدى شجرة عائلة الشاعر &copy; {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
};

export default ForumLayout;

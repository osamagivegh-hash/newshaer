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
                <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex justify-between w-full md:w-auto items-center">
                        <Link to="/family-tree/forum" className="text-xl md:text-2xl font-bold flex items-center gap-2">
                            <span>🏛️</span>
                            <span>منتدى شجرة العائلة</span>
                        </Link>
                        <Link to="/family-tree" className="text-white/80 hover:text-white transition md:hidden text-sm">
                            العودة للشجرة
                        </Link>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link to="/family-tree" className="text-white/80 hover:text-white transition hidden md:block">
                            العودة للشجرة
                        </Link>
                        {forumUser ? (
                            <div className="flex flex-wrap items-center justify-center gap-3 md:border-r border-white/20 md:pr-4">
                                {(forumUser.role === 'admin' || forumUser.role === 'moderator') && (
                                    <Link to="/family-tree/forum/admin" className="text-xs md:text-sm bg-palestine-red/20 text-white font-bold hover:bg-palestine-red/40 px-2 py-1 rounded">
                                        إدارة المنتدى
                                    </Link>
                                )}
                                <Link to="/family-tree/forum/profile" className="flex items-center gap-2 hover:text-gray-200">
                                    <div className="w-8 h-8 md:w-8 md:h-8 w-7 h-7 rounded-full bg-palestine-red flex items-center justify-center font-bold overflow-hidden border border-white">
                                        {forumUser.avatar ? (
                                            <img src={forumUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            forumUser.username.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <span className="text-sm md:text-base">{forumUser.username}</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs md:text-sm bg-white/10 hover:bg-white/20 px-2 py-1 rounded"
                                >
                                    خروج
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 md:border-r border-white/20 md:pr-4">
                                <Link
                                    to="/family-tree/forum/login"
                                    className="px-3 md:px-4 py-1.5 rounded bg-white text-palestine-green text-sm md:text-base font-semibold hover:bg-gray-100 transition"
                                >
                                    دخول
                                </Link>
                                <Link
                                    to="/family-tree/forum/register"
                                    className="px-3 md:px-4 py-1.5 text-sm md:text-base rounded border border-white hover:bg-white/10 transition"
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

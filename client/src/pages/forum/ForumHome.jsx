import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ForumHome = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/forum/categories');
                if (res.data.success) {
                    setCategories(res.data.categories);
                }
            } catch (err) {
                setError('حدث خطأ أثناء تحميل الأقسام');
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    if (loading) return <div className="text-center py-10">جاري التحميل...</div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-2xl md:text-3xl font-bold text-palestine-green mb-2">منتدى شجرة العائلة</h1>
                <p className="text-sm md:text-base text-gray-600">أهلاً بكم في منتدى شجرة العائلة، المساحة المخصصة للتواصل وتبادل الأخبار والمشاركات بين أفراد العائلة.</p>
            </div>

            <div className="grid gap-4">
                {categories.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm">لا توجد أقسام حالياً.</div>
                ) : (
                    categories.map(category => (
                        <div key={category._id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-palestine-green/50 transition p-4 md:p-6 flex flex-col sm:flex-row items-start gap-4">
                            <div className="text-3xl md:text-4xl hidden sm:block">{category.icon || '💬'}</div>
                            <div className="flex-grow w-full">
                                <Link to={`/family-tree/forum/category/${category._id}`} className="flex items-center gap-2">
                                    <span className="sm:hidden text-2xl">{category.icon || '💬'}</span>
                                    <h2 className="text-lg md:text-xl font-bold text-palestine-blue hover:text-palestine-green transition">{category.title}</h2>
                                </Link>
                                <p className="text-sm md:text-base text-gray-600 mt-1">{category.description}</p>

                                <div className="mt-3 flex gap-4 text-xs sm:hidden border-t pt-2 border-gray-50 text-gray-500">
                                    <div><span className="font-bold text-gray-800">{category.topicCount}</span> مواضيع</div>
                                    <div><span className="font-bold text-gray-800">{category.postCount}</span> مشاركات</div>
                                </div>
                            </div>
                            <div className="text-center text-sm text-gray-500 hidden sm:block border-r pr-4 border-gray-100">
                                <div><span className="font-bold text-gray-800">{category.topicCount}</span> مواضيع</div>
                                <div><span className="font-bold text-gray-800">{category.postCount}</span> مشاركات</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ForumHome;

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
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-palestine-green mb-2">منتدى شجرة العائلة</h1>
                <p className="text-gray-600">أهلاً بكم في منتدى شجرة العائلة، المساحة المخصصة للتواصل وتبادل الأخبار والمشاركات بين أفراد العائلة.</p>
            </div>

            <div className="grid gap-4">
                {categories.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 bg-white rounded-xl shadow-sm">لا توجد أقسام حالياً.</div>
                ) : (
                    categories.map(category => (
                        <div key={category._id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-palestine-green/50 transition p-6 flex items-start gap-4">
                            <div className="text-4xl">{category.icon || '💬'}</div>
                            <div className="flex-grow">
                                <Link to={`/family-tree/forum/category/${category._id}`}>
                                    <h2 className="text-xl font-bold text-palestine-blue hover:text-palestine-green transition">{category.title}</h2>
                                </Link>
                                <p className="text-gray-600 mt-1">{category.description}</p>
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

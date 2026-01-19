/**
 * صفحة الشجرة الكاملة - غصن الزيتون
 * Full Organic Olive Tree Page
 * تعرض شجرة العائلة بالكامل في عرض دائري واحد
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OrganicOliveTree from '../components/FamilyTree/OrganicOliveTree';
import { fetchTreeWithCache } from '../utils/familyTreeCache';

const API_URL = import.meta.env.VITE_API_URL || '';

const FullOrganicTreePage = () => {
    const [fullTreeData, setFullTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch the FULL tree
            const { data } = await fetchTreeWithCache(API_URL);
            if (data) {
                setFullTreeData(data);
            } else {
                setError('فشل تحميل بيانات الشجرة');
            }
        } catch (err) {
            console.error(err);
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F9F0]">
                <div className="w-16 h-16 border-4 border-[#558B2F] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[#5D4037] font-bold text-lg">جاري تحميل الشجرة الكاملة...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9F9F0]">
                <div className="text-center p-8 bg-white shadow-xl rounded-xl border border-red-200">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-red-600 mb-2">{error}</h3>
                    <button
                        onClick={fetchData}
                        className="mt-4 px-6 py-2 bg-[#558B2F] text-white rounded-lg hover:bg-[#33691E] transition"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden flex flex-col bg-[#F9F9F0] font-[Cairo]">
            {/* Header with Export Controls */}
            <div className="bg-[#558B2F] text-white px-6 py-4 shadow-md flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/family-tree/organic-olive" className="hover:bg-white/20 p-2 rounded-full transition">
                        <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <div>
                        <h1 className="font-bold text-xl">أداة تصدير الشجرة الكاملة</h1>
                        <p className="text-xs text-green-100 opacity-80">صورة واحدة عالية الدقة لكافة أفراد العائلة</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleDownload('png')}
                        className="flex items-center gap-2 bg-white text-[#558B2F] px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span>تحميل صورة (PNG)</span>
                    </button>
                    <button
                        onClick={() => handleDownload('svg')}
                        className="flex items-center gap-2 bg-[#33691E] text-white px-4 py-2 rounded-lg hover:bg-[#1B5E20] transition shadow-sm border border-white/20"
                    >
                        <span>ملف فيكتور (SVG)</span>
                    </button>
                </div>
            </div>

            {/* Tree Area - Container specifically marked for export */}
            <div className="flex-1 relative overflow-hidden bg-[#F9F9F0] tree-export-container">
                {fullTreeData && (
                    <OrganicOliveTree
                        data={fullTreeData}
                        style={{ width: '100%', height: '100%' }}
                        isFullTreeMode={true} // New prop to optimize for static export
                    />
                )}
            </div>
        </div>
    );
};

export default FullOrganicTreePage;

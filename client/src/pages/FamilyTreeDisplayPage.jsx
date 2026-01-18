/**
 * Family Tree Display Page
 * Section 3: The Family Tree
 * Displays the interactive family tree with customizable display modes
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TreeVisualization, OliveTreeVisualization, PersonModal } from '../components/FamilyTree';
import { fetchTreeWithCache } from '../utils/familyTreeCache';

const API_URL = import.meta.env.VITE_API_URL || '';

const FamilyTreeDisplayPage = () => {
    const [searchParams] = useSearchParams();
    const [tree, setTree] = useState(null);
    const [stats, setStats] = useState(null);
    const [displaySettings, setDisplaySettings] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [activeTab, setActiveTab] = useState(searchParams.get('branch') || 'general');

    const activeTreeData = useMemo(() => {
        if (!tree) return null;
        if (activeTab === 'general') return tree;

        // Handle Zahar Sub-branches
        if (activeTab.startsWith('zahar_')) {
            const zaharBranch = tree.children?.find(child => child.fullName.includes('زهار'));
            if (!zaharBranch) return null;

            let subName = '';
            switch (activeTab) {
                case 'zahar_othman': subName = 'عثمان'; break;
                case 'zahar_beshiti': subName = 'البشيتي'; break;
                case 'zahar_barham': subName = 'برهم'; break;
                case 'zahar_dawood': subName = 'داوود'; break;
                case 'zahar_awad': subName = 'عواد'; break;
                default: return zaharBranch;
            }

            if (subName) {
                // Search in Zahar's children
                const subBranch = zaharBranch.children?.find(child => child.fullName.includes(subName));
                return subBranch || zaharBranch; // Fallback to Zahar if specific sub-branch not found
            }
            return zaharBranch;
        }

        // Handle Saleh Sub-branches
        if (activeTab.startsWith('saleh_')) {
            const salehBranch = tree.children?.find(child => child.fullName.includes('صالح'));
            if (!salehBranch) return null;

            // Direct children of Saleh
            if (activeTab === 'saleh_ibrahim') {
                return salehBranch.children?.find(child => child.fullName.includes('براهيم')) || salehBranch;
            }
            if (activeTab === 'saleh_salman') {
                return salehBranch.children?.find(child => child.fullName.includes('سلمان')) || salehBranch;
            }

            // Children of Salman (Grandchildren of Saleh)
            if (activeTab.startsWith('saleh_salman_')) {
                const salmanBranch = salehBranch.children?.find(child => child.fullName.includes('سلمان'));
                if (!salmanBranch) return salehBranch;

                let subName = '';
                switch (activeTab) {
                    case 'saleh_salman_eid': subName = 'عيد'; break;
                    case 'saleh_salman_muhammad': subName = 'محمد'; break;
                    case 'saleh_salman_ibrahim': subName = 'براهيم'; break;
                    default: return salmanBranch;
                }

                if (subName) {
                    const subBranch = salmanBranch.children?.find(child => child.fullName.includes(subName));
                    return subBranch || salmanBranch;
                }
                return salmanBranch;
            }

            return salehBranch;
        }

        let searchName = '';
        if (activeTab === 'zahar') searchName = 'زهار';
        if (activeTab === 'saleh') searchName = 'صالح';
        if (activeTab === 'ibrahim') searchName = 'براهيم'; // Matches both ابراهيم and إبراهيم

        if (!searchName) return tree;

        // Find the specific branch in the root's children
        const branch = tree.children?.find(child => child.fullName.includes(searchName));
        return branch || null;
    }, [tree, activeTab]);

    useEffect(() => {
        const branch = searchParams.get('branch');
        if (branch) {
            setActiveTab(branch);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Use cached tree data
            const [treeResult, statsRes, displayRes] = await Promise.all([
                fetchTreeWithCache(API_URL),
                fetch(`${API_URL}/api/persons/stats`),
                fetch(`${API_URL}/api/family-tree-content/tree-display`)
            ]);

            const [statsData, displayData] = await Promise.all([
                statsRes.json(),
                displayRes.json()
            ]);

            // Tree data comes from cache utility
            if (treeResult.data) {
                setTree(treeResult.data);
                if (treeResult.fromCache) {
                    console.log('[FamilyTreeDisplayPage] Tree loaded from cache!');
                }
            }
            if (statsData.success) {
                setStats(statsData.data);
            }
            if (displayData.success && displayData.data) {
                setDisplaySettings(displayData.data);
            }
        } catch (err) {
            console.error('Error fetching tree data:', err);
            setError('خطأ في تحميل شجرة العائلة');
        } finally {
            setLoading(false);
        }
    };

    const handleNodeClick = async (node) => {
        try {
            const res = await fetch(`${API_URL}/api/persons/${node._id}`);
            const data = await res.json();
            if (data.success) {
                setSelectedPerson(data.data);
            }
        } catch (err) {
            console.error('Error fetching person details:', err);
        }
    };

    const zoomIn = () => setZoom(prev => Math.min(2, prev + 0.1));
    const zoomOut = () => setZoom(prev => Math.max(0.3, prev - 0.1));
    const resetZoom = () => setZoom(1);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-palestine-green border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري تحميل شجرة العائلة...</p>
                </div>
            </div>
        );
    }

    const displayMode = displaySettings?.displayMode || 'visual';

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-green-100 rtl-content" dir="rtl">
            {/* Header */}
            <header className="bg-gradient-to-r from-palestine-green to-green-700 text-white shadow-xl sticky top-0 z-50">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Breadcrumb & Title */}
                        <div className="flex items-center gap-6">
                            <nav className="flex items-center gap-2 text-sm">
                                <Link to="/" className="text-green-200 hover:text-white transition-colors">
                                    الرئيسية
                                </Link>
                                <span className="text-green-300">/</span>
                                <Link to="/family-tree" className="text-green-200 hover:text-white transition-colors">
                                    شجرة العائلة
                                </Link>
                                <span className="text-green-300">/</span>
                                <span className="text-white font-medium">عرض الشجرة</span>
                            </nav>
                        </div>

                        {/* Stats & Controls */}
                        <div className="flex items-center gap-4">
                            {stats && (
                                <div className="hidden md:flex gap-4 text-sm">
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                        👤 {stats.totalPersons} فرد
                                    </span>
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                        📊 {stats.totalGenerations} جيل
                                    </span>
                                </div>
                            )}

                            {/* Zoom Controls */}
                            {displayMode === 'visual' && (
                                <div className="flex bg-white/20 backdrop-blur-sm rounded-lg p-1" dir="ltr">
                                    <button
                                        onClick={zoomOut}
                                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                        title="تصغير"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                        </svg>
                                    </button>
                                    <span className="px-2 py-1 text-sm font-medium w-14 text-center select-none">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        onClick={zoomIn}
                                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                        title="تكبير"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={resetZoom}
                                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                                        title="إعادة تعيين"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            {/* Back Button */}
                            <Link
                                to="/family-tree/tree"
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="hidden sm:inline">تغيير القسم</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Intro Text */}
            {displaySettings?.introText && (
                <div className="bg-white border-b border-green-100 px-4 py-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="text-gray-700 leading-relaxed">{displaySettings.introText}</p>
                    </div>
                </div>
            )}

            {/* Main Tree Area */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                {error && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
                            <div className="text-6xl mb-6">🌳</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
                            <button
                                onClick={fetchData}
                                className="inline-flex items-center gap-2 bg-palestine-green text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>إعادة المحاولة</span>
                            </button>
                        </div>
                    </div>
                )}

                {!error && (
                    <>
                        {/* Visual Tree Mode */}
                        {displayMode === 'visual' && (
                            <div className="flex-1 relative w-full h-full">
                                {activeTreeData ? (
                                    <TreeVisualization
                                        data={activeTreeData}
                                        onNodeClick={handleNodeClick}
                                        zoom={zoom}
                                        className="rounded-none bg-transparent border-none h-full"
                                        style={{ maxHeight: 'none', height: '100%' }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="bg-white/80 p-8 rounded-2xl text-center backdrop-blur">
                                            <p className="text-xl text-gray-600 font-medium">عذراً، هذا الفرع غير متوفر حالياً في الشجرة</p>
                                            <button
                                                onClick={() => setActiveTab('general')}
                                                className="mt-4 text-palestine-green hover:underline"
                                            >
                                                العودة للشجرة العامة
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Static Image Mode */}
                        {displayMode === 'static' && (
                            <div className="flex-1 flex items-center justify-center p-8">
                                {displaySettings?.staticTreeImage ? (
                                    <img
                                        src={displaySettings.staticTreeImage}
                                        alt="شجرة العائلة"
                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                    />
                                ) : (
                                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                                        <div className="text-6xl mb-4">🖼️</div>
                                        <p className="text-gray-500">لم يتم تحميل صورة الشجرة بعد</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Embedded Mode */}
                        {displayMode === 'embedded' && (
                            <div className="flex-1 p-8">
                                {displaySettings?.embeddedContent ? (
                                    <div
                                        className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: displaySettings.embeddedContent }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                                            <div className="text-6xl mb-4">📦</div>
                                            <p className="text-gray-500">لم يتم إضافة محتوى مضمن بعد</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Footer Text */}
            {displaySettings?.footerText && (
                <div className="bg-white border-t border-green-100 px-4 py-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <p className="text-gray-600 text-sm leading-relaxed">{displaySettings.footerText}</p>
                    </div>
                </div>
            )}

            {/* Footer Navigation */}
            <footer className="bg-green-900 text-white py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-green-200 text-sm">© {new Date().getFullYear()} عائلة الشاعر</p>
                        <div className="flex items-center gap-4 text-sm">
                            <Link to="/family-tree/appreciation" className="text-green-200 hover:text-white transition-colors">
                                تقدير المؤسس
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Person Modal */}
            {selectedPerson && (
                <PersonModal
                    person={selectedPerson}
                    onClose={() => setSelectedPerson(null)}
                />
            )}

            {/* Custom Styles from Display Settings */}
            {displaySettings?.customStyles && (
                <style dangerouslySetInnerHTML={{ __html: displaySettings.customStyles }} />
            )}
        </div>
    );
};

export default FamilyTreeDisplayPage;

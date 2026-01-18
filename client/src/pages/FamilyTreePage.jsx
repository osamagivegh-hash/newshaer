import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TreeVisualization, PersonModal } from '../components/FamilyTree';
import { fetchTreeWithCache } from '../utils/familyTreeCache';

const API_URL = import.meta.env.VITE_API_URL || '';

const FamilyTreePage = () => {
    const [tree, setTree] = useState(null);
    const [stats, setStats] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        fetchTreeData();
    }, []);

    const fetchTreeData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [treeResult, statsRes] = await Promise.all([
                fetchTreeWithCache(API_URL),
                fetch(`${API_URL}/api/persons/stats`)
            ]);

            const statsData = await statsRes.json();

            if (treeResult.data) {
                setTree(treeResult.data);
                if (treeResult.fromCache) {
                    console.log('[FamilyTreePage] Tree loaded from cache!');
                }
            }
            if (statsData.success) {
                setStats(statsData.data);
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-palestine-green"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                    <p>{error}</p>
                    <button
                        onClick={fetchTreeData}
                        className="mt-4 px-4 py-2 bg-palestine-green text-white rounded-lg hover:bg-opacity-90"
                    >
                        إعادة المحاولة
                    </button>
                    <Link to="/" className="block mt-4 text-palestine-green hover:underline">
                        العودة للصفحة الرئيسية
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden" dir="rtl">
            {/* Header */}
            <header className="bg-white border-b px-4 py-3 flex items-center justify-between z-50 shadow-sm shrink-0 relative">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-palestine-black">🌳 شجرة العائلة</h1>
                    {stats && (
                        <div className="hidden md:flex gap-4 text-sm text-gray-600">
                            <span className="bg-gray-100 px-2 py-1 rounded">👤 {stats.totalPersons} فرد</span>
                            <span className="bg-gray-100 px-2 py-1 rounded">📊 {stats.totalGenerations} جيل</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1" dir="ltr">
                        <button onClick={zoomOut} className="p-1 hover:bg-white rounded transition-colors" title="تصغير">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                        </button>
                        <span className="px-2 py-1 text-sm font-medium w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
                        <button onClick={zoomIn} className="p-1 hover:bg-white rounded transition-colors" title="تكبير">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        <button onClick={resetZoom} className="p-1 hover:bg-white rounded transition-colors" title="إعادة تعيين">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v16H4z" /></svg>
                        </button>
                    </div>
                    <Link
                        to="/"
                        className="px-4 py-2 bg-palestine-black text-white rounded-lg hover:bg-opacity-90 text-sm font-medium transition-colors"
                    >
                        الرئيسية
                    </Link>
                </div>
            </header>

            {/* Main Tree Area */}
            <main className="flex-1 relative overflow-auto bg-gray-50">
                <div className="w-full h-full" style={{ minHeight: 'calc(100vh - 80px)' }}>
                    {/* We need to ensure TreeVisualization takes full size available */}
                    <TreeVisualization
                        data={tree}
                        onNodeClick={handleNodeClick}
                        zoom={zoom}
                        className="rounded-none bg-gray-50 border-none h-full"
                        style={{ maxHeight: 'none', height: '100%' }}
                    />
                </div>
            </main>

            {/* Person Modal */}
            {selectedPerson && (
                <PersonModal
                    person={selectedPerson}
                    onClose={() => setSelectedPerson(null)}
                />
            )}
        </div>
    );
};

export default FamilyTreePage;

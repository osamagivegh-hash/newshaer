/**
 * Olive Tree Page
 * Section: Organic Family Tree
 * Displays the interactive organic olive tree visualization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { OliveTreeVisualization, PersonModal } from '../components/FamilyTree';
import { fetchTreeWithCache } from '../utils/familyTreeCache';

const API_URL = import.meta.env.VITE_API_URL || '';

const OliveTreePage = () => {
    const [tree, setTree] = useState(null);
    const [stats, setStats] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
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
                    console.log('[OliveTreePage] Tree loaded from cache!');
                }
            }
            if (statsData.success) setStats(statsData.data);

        } catch (err) {
            console.error('Error fetching tree data:', err);
            setError('خطأ في تحميل شجرة العائلة');
        } finally {
            setLoading(false);
        }
    };

    // Handle node click - INSTANT using local data
    const handleNodeClick = (node) => {
        // Use node data directly for instant display
        setSelectedPerson({
            ...node,
            children: node.children || []
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2e1a] to-[#2c3e50]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-olive-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-olive-200">جاري زراعة شجرة العائلة...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#f0f4f0]" dir="rtl">
            {/* Header */}
            <header className="bg-[#2c3e2c] text-white shadow-xl sticky top-0 z-50 shrink-0">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Breadcrumb & Title */}
                        <div className="flex items-center gap-6">
                            <nav className="flex items-center gap-2 text-sm">
                                <Link to="/" className="text-olive-200 hover:text-white transition-colors">
                                    الرئيسية
                                </Link>
                                <span className="text-olive-400">/</span>
                                <Link to="/family-tree" className="text-olive-200 hover:text-white transition-colors">
                                    شجرة العائلة
                                </Link>
                                <span className="text-olive-400">/</span>
                                <span className="text-white font-medium">غصن الزيتون</span>
                            </nav>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4">
                            {stats && (
                                <div className="hidden md:flex gap-4 text-sm bg-black/20 rounded-full px-4 py-1">
                                    <span>
                                        🌳 {stats.totalPersons} غصن
                                    </span>
                                </div>
                            )}

                            {/* Back Button */}
                            <Link
                                to="/family-tree"
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>العودة</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Tree Area */}
            <main className="flex-1 relative overflow-auto" style={{ minHeight: '80vh' }}>
                {error ? (
                    <div className="flex-1 flex items-center justify-center h-full">
                        <div className="text-red-500 font-bold bg-white/80 p-6 rounded-lg">{error}</div>
                    </div>
                ) : tree ? (
                    <OliveTreeVisualization
                        data={tree}
                        onNodeClick={handleNodeClick}
                        style={{ height: '100%', minHeight: '80vh' }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">لا توجد بيانات</p>
                    </div>
                )}
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

export default OliveTreePage;

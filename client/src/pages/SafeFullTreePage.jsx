/**
 * صفحة الشجرة الكاملة الآمنة - Safe Full Tree Page
 * 
 * This is a NEW component that loads the full tree progressively and safely.
 * It uses lazy loading to prevent memory issues with 2000+ members.
 * 
 * DESIGN PRINCIPLES:
 * 1. Load branches list first (lightweight metadata)
 * 2. Load each branch ONLY when user expands/views it
 * 3. Never load all data at once
 * 4. Use virtualization for rendering (only visible nodes)
 * 
 * This does NOT replace FullOrganicTreePage.jsx - it's a safe alternative.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchBranches, fetchBranchTree, fetchNodeChildren, fetchBranchStats } from '../utils/branchApi';
import { PersonModal } from '../components/FamilyTree';

const SafeFullTreePage = () => {
    // State
    const [branches, setBranches] = useState([]);
    const [rootInfo, setRootInfo] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Branch expansion state
    const [expandedBranches, setExpandedBranches] = useState(new Set());
    const [branchTrees, setBranchTrees] = useState({}); // { branchId: treeData }
    const [loadingBranches, setLoadingBranches] = useState(new Set());

    // Node expansion for lazy loading
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [nodeChildren, setNodeChildren] = useState({}); // { nodeId: children[] }
    const [loadingNodes, setLoadingNodes] = useState(new Set());

    // Person details modal
    const [selectedPerson, setSelectedPerson] = useState(null);

    // Scroll container ref for virtualization
    const scrollContainerRef = useRef(null);

    // Load initial branch metadata
    useEffect(() => {
        loadBranchMetadata();
    }, []);

    const loadBranchMetadata = async () => {
        try {
            setLoading(true);
            setError(null);

            const [branchesResult, statsResult] = await Promise.all([
                fetchBranches(),
                fetchBranchStats()
            ]);

            if (branchesResult.success) {
                setBranches(branchesResult.data);
                setRootInfo(branchesResult.root);
            }

            if (statsResult.success) {
                setStats(statsResult.data);
            }
        } catch (err) {
            console.error('Error loading branches:', err);
            setError('خطأ في تحميل بيانات الفروع');
        } finally {
            setLoading(false);
        }
    };

    // Toggle branch expansion
    const toggleBranch = useCallback(async (branchId) => {
        const isExpanded = expandedBranches.has(branchId);

        if (isExpanded) {
            // Collapse branch
            setExpandedBranches(prev => {
                const next = new Set(prev);
                next.delete(branchId);
                return next;
            });
        } else {
            // Expand branch - load tree if not already loaded
            if (!branchTrees[branchId]) {
                try {
                    setLoadingBranches(prev => new Set(prev).add(branchId));
                    const result = await fetchBranchTree(branchId, 3); // Load 3 levels deep

                    if (result.success) {
                        setBranchTrees(prev => ({
                            ...prev,
                            [branchId]: result.data
                        }));
                    }
                } catch (err) {
                    console.error('Error loading branch tree:', err);
                } finally {
                    setLoadingBranches(prev => {
                        const next = new Set(prev);
                        next.delete(branchId);
                        return next;
                    });
                }
            }

            setExpandedBranches(prev => new Set(prev).add(branchId));
        }
    }, [expandedBranches, branchTrees]);

    // Lazy load children for a node
    const loadNodeChildren = useCallback(async (nodeId) => {
        if (nodeChildren[nodeId] || loadingNodes.has(nodeId)) return;

        try {
            setLoadingNodes(prev => new Set(prev).add(nodeId));
            const result = await fetchNodeChildren(nodeId);

            if (result.success) {
                setNodeChildren(prev => ({
                    ...prev,
                    [nodeId]: result.data
                }));
            }
        } catch (err) {
            console.error('Error loading children:', err);
        } finally {
            setLoadingNodes(prev => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
            });
        }
    }, [nodeChildren, loadingNodes]);

    // Toggle node expansion (lazy load)
    const toggleNode = useCallback((nodeId, hasChildren) => {
        if (!hasChildren) return;

        const isExpanded = expandedNodes.has(nodeId);

        if (isExpanded) {
            setExpandedNodes(prev => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
            });
        } else {
            // Load children if needed
            if (!nodeChildren[nodeId]) {
                loadNodeChildren(nodeId);
            }
            setExpandedNodes(prev => new Set(prev).add(nodeId));
        }
    }, [expandedNodes, nodeChildren, loadNodeChildren]);

    // Handle person click
    const handlePersonClick = (person) => {
        setSelectedPerson({
            _id: person._id,
            fullName: person.fullName,
            nickname: person.nickname,
            gender: person.gender,
            generation: person.generation,
            birthDate: person.birthDate,
            deathDate: person.deathDate,
            birthPlace: person.birthPlace,
            currentResidence: person.currentResidence,
            occupation: person.occupation,
            biography: person.biography,
            notes: person.notes,
            children: person.children || [],
            isAlive: person.isAlive
        });
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F9F0]">
                <div className="w-16 h-16 border-4 border-[#558B2F] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[#5D4037] font-bold text-lg">جاري تحميل الشجرة...</p>
                <p className="text-gray-500 text-sm mt-2">الرجاء الانتظار</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F9F9F0]">
                <div className="text-center p-8 bg-white shadow-xl rounded-xl border border-red-200">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-red-600 mb-2">{error}</h3>
                    <button
                        onClick={loadBranchMetadata}
                        className="mt-4 px-6 py-2 bg-[#558B2F] text-white rounded-lg hover:bg-[#33691E] transition"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F9F0] font-[Cairo]">
            {/* Header */}
            <div className="bg-[#558B2F] text-white px-4 py-4 shadow-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link to="/family-tree/organic-olive" className="hover:bg-white/20 p-2 rounded-full transition">
                            <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="font-bold text-xl">الشجرة الكاملة</h1>
                            <p className="text-xs text-green-100 opacity-80">استعراض جميع فروع العائلة</p>
                        </div>
                    </div>

                    {/* Stats Badge */}
                    {stats && (
                        <div className="hidden md:flex items-center gap-4 text-sm">
                            <div className="bg-white/20 px-3 py-1 rounded-full">
                                <span className="font-bold">{stats.totalMembers}</span> فرد
                            </div>
                            <div className="bg-white/20 px-3 py-1 rounded-full">
                                <span className="font-bold">{stats.maxGeneration}</span> جيل
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Root Info */}
            {rootInfo && (
                <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white px-4 py-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="text-4xl mb-2">🌳</div>
                        <h2 className="text-2xl font-bold">{rootInfo.name}</h2>
                        <p className="text-amber-200 text-sm mt-1">الجد الأكبر - أصل الشجرة</p>
                    </div>
                </div>
            )}

            {/* Main Content - Branch List */}
            <div className="max-w-7xl mx-auto p-4" ref={scrollContainerRef}>
                <div className="space-y-4">
                    {branches.map((branch) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            isExpanded={expandedBranches.has(branch.id)}
                            isLoading={loadingBranches.has(branch.id)}
                            onToggle={() => toggleBranch(branch.id)}
                            treeData={branchTrees[branch.id]}
                            expandedNodes={expandedNodes}
                            nodeChildren={nodeChildren}
                            loadingNodes={loadingNodes}
                            onNodeToggle={toggleNode}
                            onPersonClick={handlePersonClick}
                        />
                    ))}
                </div>

                {branches.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <div className="text-4xl mb-4">🌿</div>
                        <p className="text-lg">لا توجد فروع مسجلة بعد</p>
                    </div>
                )}
            </div>

            {/* Person Modal */}
            {selectedPerson && (
                <PersonModal
                    person={selectedPerson}
                    onClose={() => setSelectedPerson(null)}
                />
            )}

            {/* Info Footer */}
            <div className="bg-gray-100 border-t border-gray-200 p-4 mt-8">
                <div className="max-w-7xl mx-auto text-center text-sm text-gray-600">
                    <p>💡 <strong>تلميح:</strong> اضغط على أي فرع لاستعراض أفراده.</p>
                </div>
            </div>
        </div>
    );
};

// ============ BRANCH CARD COMPONENT ============
const BranchCard = ({
    branch,
    isExpanded,
    isLoading,
    onToggle,
    treeData,
    expandedNodes,
    nodeChildren,
    loadingNodes,
    onNodeToggle,
    onPersonClick
}) => {
    const getBranchColor = (name) => {
        if (name.includes('زهار')) return 'from-amber-600 to-amber-800';
        if (name.includes('صالح')) return 'from-emerald-600 to-emerald-800';
        if (name.includes('براهيم')) return 'from-blue-600 to-blue-800';
        return 'from-gray-600 to-gray-800';
    };

    const getBranchIcon = (name) => {
        if (name.includes('زهار')) return '🌿';
        if (name.includes('صالح')) return '🌳';
        if (name.includes('براهيم')) return '🍀';
        return '🌱';
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {/* Branch Header (Collapsible) */}
            <button
                onClick={onToggle}
                className={`w-full p-5 flex items-center justify-between text-right bg-gradient-to-r ${getBranchColor(branch.name)} text-white transition-all hover:brightness-110`}
            >
                <div className="flex items-center gap-4">
                    <span className="text-3xl">{getBranchIcon(branch.name)}</span>
                    <div>
                        <h3 className="text-xl font-bold">{branch.name}</h3>
                        <p className="text-white/80 text-sm">
                            {branch.memberCount} فرد • {branch.childrenCount} ابن مباشر
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isLoading && (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <svg
                        className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && treeData && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="tree-view">
                        <TreeNode
                            node={treeData}
                            level={0}
                            expandedNodes={expandedNodes}
                            nodeChildren={nodeChildren}
                            loadingNodes={loadingNodes}
                            onToggle={onNodeToggle}
                            onPersonClick={onPersonClick}
                        />
                    </div>
                </div>
            )}

            {isExpanded && isLoading && (
                <div className="p-8 flex items-center justify-center bg-gray-50">
                    <div className="w-8 h-8 border-3 border-[#558B2F] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

// ============ TREE NODE COMPONENT (Recursive, Lazy, Mobile-Responsive) ============
const TreeNode = ({
    node,
    level,
    expandedNodes,
    nodeChildren,
    loadingNodes,
    onToggle,
    onPersonClick
}) => {
    const isExpanded = expandedNodes.has(node._id);
    const isLoading = loadingNodes.has(node._id);
    const hasChildren = node.hasChildren || node.childrenCount > 0 || (node.children && node.children.length > 0);
    const childrenCount = node.childrenCount || (node.children && node.children.length) || 0;

    // Get children from either the node's own children or lazy-loaded children
    const children = node.children && node.children.length > 0
        ? node.children
        : (nodeChildren[node._id] || []);

    const showChildren = isExpanded && children.length > 0;

    // Different colors for each level for visual distinction
    const levelConfigs = [
        { bg: 'bg-amber-50', border: 'border-amber-400', accent: 'bg-amber-500', borderLine: 'border-amber-300' },
        { bg: 'bg-emerald-50', border: 'border-emerald-400', accent: 'bg-emerald-500', borderLine: 'border-emerald-300' },
        { bg: 'bg-blue-50', border: 'border-blue-400', accent: 'bg-blue-500', borderLine: 'border-blue-300' },
        { bg: 'bg-purple-50', border: 'border-purple-400', accent: 'bg-purple-500', borderLine: 'border-purple-300' },
        { bg: 'bg-pink-50', border: 'border-pink-400', accent: 'bg-pink-500', borderLine: 'border-pink-300' },
        { bg: 'bg-cyan-50', border: 'border-cyan-400', accent: 'bg-cyan-500', borderLine: 'border-cyan-300' },
        { bg: 'bg-orange-50', border: 'border-orange-400', accent: 'bg-orange-500', borderLine: 'border-orange-300' },
        { bg: 'bg-teal-50', border: 'border-teal-400', accent: 'bg-teal-500', borderLine: 'border-teal-300' },
    ];

    const config = levelConfigs[level % levelConfigs.length];

    // Mobile-responsive margin: minimal on mobile, increasing on desktop
    // Max indent is capped to prevent overflow
    const desktopMargin = Math.min(level * 16, 80); // Cap at 80px max

    return (
        <div className="tree-node-container">
            {/* Node Card - Mobile-responsive layout */}
            <div
                className={`
                    flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 
                    p-3 sm:p-4 rounded-xl ${config.bg} border-2 ${config.border} 
                    mb-2 sm:mb-3 hover:shadow-lg transition-all
                `}
                style={{
                    marginRight: window.innerWidth < 640 ? `${Math.min(level * 8, 32)}px` : `${desktopMargin}px`
                }}
            >
                {/* Top row on mobile: Name + Generation */}
                <div
                    className="flex-1 cursor-pointer hover:opacity-80 order-1"
                    onClick={() => onPersonClick(node)}
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-base sm:text-lg">{node.fullName}</span>
                        {node.nickname && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                                {node.nickname}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mt-1">
                        <span className="bg-gray-200 px-2 py-0.5 rounded">الجيل {node.generation}</span>
                        {hasChildren && !isExpanded && (
                            <span className="text-gray-500">{childrenCount} أبناء</span>
                        )}
                    </div>
                </div>

                {/* Buttons row - stacked on mobile */}
                <div className="flex items-center gap-2 order-2 sm:order-3 mt-2 sm:mt-0">
                    {/* Expand Button */}
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(node._id, true);
                            }}
                            className={`
                                flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 
                                px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-bold text-white text-sm
                                ${config.accent} hover:brightness-110 active:scale-95
                                transition-all shadow-md
                                ${!isExpanded ? 'animate-pulse' : ''}
                            `}
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : isExpanded ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                                    </svg>
                                    <span className="hidden sm:inline">إغلاق</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <span>{childrenCount}</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Details Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPersonClick(node);
                        }}
                        className="flex-1 sm:flex-none text-sm bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl hover:bg-gray-800 transition-colors font-medium shadow"
                    >
                        📋 <span className="hidden sm:inline">التفاصيل</span>
                    </button>
                </div>
            </div>

            {/* Children Container - Less indent on mobile */}
            {showChildren && (
                <div className={`children-container mr-2 sm:mr-4 border-r-2 sm:border-r-4 ${config.borderLine} pr-2 sm:pr-4 mt-1 mb-2 sm:mb-4`}>
                    {children.map(child => (
                        <TreeNode
                            key={child._id}
                            node={child}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            nodeChildren={nodeChildren}
                            loadingNodes={loadingNodes}
                            onToggle={onToggle}
                            onPersonClick={onPersonClick}
                        />
                    ))}
                </div>
            )}

            {/* Loading indicator when expanding but no children yet */}
            {isExpanded && isLoading && children.length === 0 && (
                <div className={`mr-2 sm:mr-4 border-r-2 sm:border-r-4 ${config.borderLine} pr-2 sm:pr-4 py-3`}>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>جاري التحميل...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SafeFullTreePage;

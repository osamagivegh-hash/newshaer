/**
 * صفحة غصن الزيتون - Olive Branch Page
 * كل ورقة تمثل فرداً من العائلة
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OrganicOliveTree from '../components/FamilyTree/OrganicOliveTree';
import { PersonModal } from '../components/FamilyTree';
import { fetchTreeWithCache, clearTreeCache } from '../utils/familyTreeCache';

const API_URL = import.meta.env.VITE_API_URL || '';

const OrganicOliveTreePage = () => {
    const [fullTreeData, setFullTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadedFromCache, setLoadedFromCache] = useState(false);

    // Navigation State
    // MAIN_SELECTION -> SUB_SELECTION (or IBRAHIM_SELECTION for Ibrahim) -> TREE_VIEW
    const [viewStep, setViewStep] = useState('MAIN_SELECTION');
    const [selectedMainBranch, setSelectedMainBranch] = useState(null);
    const [selectedIbrahimSubBranch, setSelectedIbrahimSubBranch] = useState(null); // Special for Ibrahim branch
    const [selectedSubTreeNode, setSelectedSubTreeNode] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);

    // Ibrahim branch special sub-branches names (to find them in the tree)
    const IBRAHIM_SUB_BRANCHES = {
        ibrahim: 'إبراهيم بن سلمان',
        sulaiman: 'سليمان بن سلمان'
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            const { data, fromCache } = await fetchTreeWithCache(API_URL, forceRefresh);

            setFullTreeData(data);
            setLoadedFromCache(fromCache);

            if (fromCache) {
                console.log('[OrganicOliveTreePage] Loaded from cache - instant!');
            }
        } catch (err) {
            console.error(err);
            setError('خطأ في الاتصال بالخادم');
            // Try to clear cache on error and retry once
            if (!forceRefresh) {
                clearTreeCache();
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper function to find a node by name recursively in the tree
    const findNodeByName = (node, namePart) => {
        if (!node) return null;
        // Normalize strings for comparison (remove extra spaces)
        const nodeName = (node.fullName || "").trim();
        const searchName = namePart.trim();

        if (nodeName.includes(searchName)) return node;

        if (node.children) {
            for (const child of node.children) {
                const found = findNodeByName(child, namePart);
                if (found) return found;
            }
        }
        return null;
    };

    const handleMainBranchSelect = (branchNamePart) => {
        if (!fullTreeData || !fullTreeData.children) return;
        const node = fullTreeData.children.find(c => c.fullName.includes(branchNamePart));
        if (node) {
            setSelectedMainBranch(node);
            // Special handling for Ibrahim branch - show special selection screen
            if (branchNamePart === 'براهيم') {
                setViewStep('IBRAHIM_SELECTION');
            } else {
                setViewStep('SUB_SELECTION');
            }
        }
    };

    // Handle Ibrahim sub-branch selection via strict lineage and name start
    const handleIbrahimSubBranchSelect = (subBranchKey) => {
        if (!selectedMainBranch) return;

        // 1. First, find "Salman" (the father) anywhere within the main branch
        const salmanNode = findNodeByName(selectedMainBranch, 'سلمان');

        if (!salmanNode) {
            alert('عذراً، لم يتم العثور على "سلمان" (والد الفرعين) في الشجرة، يرجى التأكد من البيانات.');
            return;
        }

        const targetName = subBranchKey === 'ibrahim' ? 'إبراهيم' : 'سليمان';
        let targetNode = null;

        // 2. Strict Search: Check DIRECT children first finding name STARTING with target
        if (salmanNode.children) {
            // Find direct child whose name STARTS with targetName (e.g. "Ibrahim...")
            // We verify the name starts with the target to avoid matching "Mohammad bin Ibrahim"
            targetNode = salmanNode.children.find(child =>
                (child.fullName || "").trim().startsWith(targetName)
            );
        }

        // 3. Fallback: If not found in direct children, search deeper but strictly by Name Start
        if (!targetNode && salmanNode.children) {
            const findStrictRecursive = (nodes) => {
                for (const node of nodes) {
                    // Check if name strictly starts with target
                    if ((node.fullName || "").trim().startsWith(targetName)) return node;
                    if (node.children) {
                        const found = findStrictRecursive(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            targetNode = findStrictRecursive(salmanNode.children);
        }

        if (targetNode) {
            setSelectedIbrahimSubBranch(targetNode);
            // DIRECTLY go to TREE_VIEW as requested by user
            setSelectedSubTreeNode(targetNode);
            setViewStep('TREE_VIEW');
        } else {
            const fullName = subBranchKey === 'ibrahim' ? 'إبراهيم بن سلمان' : 'سليمان بن سلمان';
            alert(`عذراً، لم يتم العثور على "${targetName}" كابن أو حفيد لـ سلمان.\nالرجاء التأكد من البيانات.`);
        }
    };

    const handleSubBranchSelect = (node) => {
        setSelectedSubTreeNode(node);
        setViewStep('TREE_VIEW');
    };

    const goBack = () => {
        if (viewStep === 'TREE_VIEW') {
            setViewStep('SUB_SELECTION');
            setSelectedSubTreeNode(null);
        } else if (viewStep === 'SUB_SELECTION') {
            // If we came from Ibrahim special selection, go back to it
            if (selectedIbrahimSubBranch) {
                setViewStep('IBRAHIM_SELECTION');
                setSelectedIbrahimSubBranch(null);
            } else {
                setViewStep('MAIN_SELECTION');
                setSelectedMainBranch(null);
            }
        } else if (viewStep === 'IBRAHIM_SELECTION') {
            setViewStep('MAIN_SELECTION');
            setSelectedMainBranch(null);
            setSelectedIbrahimSubBranch(null);
        }
    };

    // Handle node click to show person details - INSTANT using local data
    const handleNodeClick = (node) => {
        // Use node data directly for instant display
        // The node already contains all the basic info we need
        const personData = {
            _id: node._id,
            fullName: node.fullName,
            nickname: node.nickname,
            gender: node.gender,
            generation: node.generation,
            birthDate: node.birthDate,
            deathDate: node.deathDate,
            birthPlace: node.birthPlace,
            currentResidence: node.currentResidence,
            occupation: node.occupation,
            biography: node.biography,
            notes: node.notes,
            isAlive: node.isAlive,
            showStatus: node.showStatus,
            isRoot: node.isRoot,
            fullLineageName: node.fullLineageName,
            // Use parentNode (father) info from tree hierarchy
            fatherId: node.parentNode ? {
                _id: node.parentNode._id,
                fullName: node.parentNode.fullName
            } : null,
            // Build children info from node's children array
            children: node.children ? node.children.map(c => ({
                _id: c._id,
                fullName: c.fullName,
                gender: c.gender
            })) : [],
            // Full lineage chain (سلسلة النسب)
            ancestors: node.ancestors || []
        };

        setSelectedPerson(personData);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9F9F0]">
                <div className="w-16 h-16 border-4 border-[#558B2F] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[#5D4037] font-bold text-lg">جاري تحميل شجرة العائلة...</p>
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
                        onClick={() => fetchData(true)}
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
            {/* Header */}
            <div className="bg-[#558B2F] text-white px-4 py-3 shadow-md flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-2">
                    {viewStep === 'MAIN_SELECTION' ? (
                        <Link to="/family-tree" className="hover:bg-white/20 p-2 rounded-full transition">
                            <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </Link>
                    ) : (
                        <button onClick={goBack} className="hover:bg-white/20 p-2 rounded-full transition cursor-pointer">
                            <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    )}
                    <span className="font-bold text-lg">
                        {viewStep === 'MAIN_SELECTION' && 'اختر الفرع الرئيسي'}
                        {viewStep === 'IBRAHIM_SELECTION' && 'اختر فرع آل إبراهيم'}
                        {viewStep === 'SUB_SELECTION' && `فروع عائلة ${selectedIbrahimSubBranch?.fullName || selectedMainBranch?.fullName}`}
                        {viewStep === 'TREE_VIEW' && `شجرة ${selectedSubTreeNode?.fullName}`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            clearTreeCache();
                            fetchData(true);
                        }}
                        title="تحديث بيانات الشجرة من الخادم"
                        className="hover:bg-white/20 p-2 rounded-full transition cursor-pointer"
                        disabled={loading}
                    >
                        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <div className="text-sm bg-white/20 px-3 py-1 rounded-full hidden sm:block">
                        غصن الزيتون {loadedFromCache && <span className="opacity-70 text-xs">• كاش</span>}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4">

                {/* STEP 1: Main Branch Selection */}
                {viewStep === 'MAIN_SELECTION' && (
                    <div className="w-full max-w-lg md:max-w-6xl px-4 animate-fade-in-up">
                        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-8 justify-items-center w-full">
                            {/* Zahar */}
                            <BranchCard
                                title="آل زهار"
                                color="from-amber-700 to-amber-900"
                                onClick={() => handleMainBranchSelect('زهار')}
                                icon="🌿"
                                className="w-full"
                            />

                            {/* Saleh */}
                            <BranchCard
                                title="آل صالح"
                                color="from-emerald-700 to-emerald-900"
                                onClick={() => handleMainBranchSelect('صالح')}
                                icon="🌳"
                                className="w-full"
                            />

                            {/* Ibrahim */}
                            <BranchCard
                                title="آل إبراهيم"
                                color="from-blue-700 to-blue-900"
                                onClick={() => handleMainBranchSelect('براهيم')}
                                icon="🍀"
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                {/* STEP 1.5: Ibrahim Special Sub-Branch Selection */}
                {viewStep === 'IBRAHIM_SELECTION' && selectedMainBranch && (
                    <div className="w-full max-w-4xl px-4 animate-fade-in-up">
                        <h2 className="text-3xl font-bold text-[#5D4037] mb-8 text-center">اختر فرع آل إبراهيم</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {/* إبراهيم بن سلمان بن إبراهيم */}
                            <button
                                onClick={() => handleIbrahimSubBranchSelect('ibrahim')}
                                className="group relative overflow-hidden rounded-3xl p-8 h-64 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white flex flex-col items-center justify-center text-center"
                            >
                                <div className="absolute top-0 left-0 w-full h-full bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">🌿</div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-2">إبراهيم بن سلمان</h3>
                                <p className="text-white/80 text-sm">بن إبراهيم</p>
                            </button>

                            {/* سليمان بن سلمان بن إبراهيم */}
                            <button
                                onClick={() => handleIbrahimSubBranchSelect('sulaiman')}
                                className="group relative overflow-hidden rounded-3xl p-8 h-64 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-purple-600 to-purple-900 text-white flex flex-col items-center justify-center text-center"
                            >
                                <div className="absolute top-0 left-0 w-full h-full bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">🍃</div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-2">سليمان بن سلمان</h3>
                                <p className="text-white/80 text-sm">بن إبراهيم</p>
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Sub-Branch Selection */}
                {viewStep === 'SUB_SELECTION' && (selectedMainBranch || selectedIbrahimSubBranch) && (
                    <div className="flex flex-col items-center w-full max-w-6xl h-full overflow-y-auto py-10">
                        <h2 className="text-3xl font-bold text-[#5D4037] mb-8">اختر فرع العائلة</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full px-4">
                            {/* Show children from Ibrahim sub-branch if selected, otherwise from main branch */}
                            {(selectedIbrahimSubBranch?.children || selectedMainBranch?.children || []).map((child, idx) => (
                                <SubBranchCard
                                    key={child._id || idx}
                                    node={child}
                                    onClick={() => handleSubBranchSelect(child)}
                                />
                            ))}
                        </div>
                        {(!(selectedIbrahimSubBranch?.children || selectedMainBranch?.children) ||
                            (selectedIbrahimSubBranch?.children || selectedMainBranch?.children || []).length === 0) && (
                                <div className="text-gray-500 text-xl mt-10">لا توجد فروع مسجلة لهذا الجد بعد.</div>
                            )}
                    </div>
                )}

                {/* STEP 3: Tree View */}
                {viewStep === 'TREE_VIEW' && selectedSubTreeNode && (
                    <div className="w-full h-full animate-fade-in">
                        <OrganicOliveTree
                            data={selectedSubTreeNode}
                            onNodeClick={handleNodeClick}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                )}

                {/* Person Modal */}
                {selectedPerson && (
                    <PersonModal
                        person={selectedPerson}
                        onClose={() => setSelectedPerson(null)}
                    />
                )}

            </div>
        </div>
    );
};

// Helper Components
const BranchCard = ({ title, color, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`group relative overflow-hidden rounded-3xl p-6 h-40 w-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br ${color} text-white flex flex-row items-center justify-between px-8 text-right`}
    >
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>

        <div className="z-10 flex flex-col items-start">
            <h3 className="text-3xl font-bold mb-1 shadow-sm">{title}</h3>
            <p className="text-white/90 text-sm font-medium">اضغط لاستعراض الفروع</p>
        </div>

        <div className="text-5xl transform group-hover:scale-110 transition-transform z-10 opacity-90">{icon}</div>
    </button>
);

// Family sub-names mapping for specific branches
const FAMILY_SUB_NAMES = {
    'إبراهيم': ['الدجان', 'مقلد', 'أبو عيد'],
    'سلمان': ['الزقامطه', 'المحامده', 'العرادات', 'العوايضه', 'القريدات', 'أبو مدلله', 'أبو مهاوش']
};

const SubBranchCard = ({ node, onClick }) => {
    // Check if this node has sub-family names
    const firstName = node.fullName.split(' ')[0];
    const subFamilyNames = FAMILY_SUB_NAMES[firstName] || [];

    return (
        <button
            onClick={onClick}
            className="bg-white p-6 rounded-2xl shadow-md border border-[#CCD5AE] hover:border-[#558B2F] hover:shadow-xl hover:bg-[#FEFAE0] transition-all duration-300 flex flex-col items-center text-center group min-h-[200px]"
        >
            <div className="w-16 h-16 rounded-full bg-[#E9EDC9] text-[#558B2F] flex items-center justify-center text-2xl font-bold mb-3 group-hover:bg-[#558B2F] group-hover:text-white transition-colors">
                {firstName[0]}
            </div>
            <h4 className="text-xl font-bold text-[#5D4037] mb-1">{node.fullName}</h4>
            <span className="text-sm text-gray-500 mb-3">
                {node.children ? node.children.length : 0} أحفاد
            </span>

            {/* Sub-family names */}
            {subFamilyNames.length > 0 && (
                <div className="mt-auto pt-3 border-t border-[#E9EDC9] w-full">
                    <p className="text-xs text-[#558B2F] font-semibold mb-2">العائلات الفرعية:</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                        {subFamilyNames.map((name, idx) => (
                            <span
                                key={idx}
                                className="inline-block px-2.5 py-1 text-[11px] font-medium rounded-full bg-gradient-to-r from-[#E9EDC9] to-[#D4E8BE] text-[#3E5A23] shadow-sm border border-[#CCD5AE]/50 hover:from-[#558B2F] hover:to-[#6B9B3C] hover:text-white hover:border-[#558B2F] transition-all duration-200"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </button>
    );
};

export default OrganicOliveTreePage;

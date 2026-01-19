/**
 * صفحة غصن الزيتون العضوي - Organic Olive Branch Page
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
    const [viewStep, setViewStep] = useState('MAIN_SELECTION'); // MAIN_SELECTION, SUB_SELECTION, TREE_VIEW
    const [selectedMainBranch, setSelectedMainBranch] = useState(null);
    const [selectedSubTreeNode, setSelectedSubTreeNode] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);

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

    const handleMainBranchSelect = (branchNamePart) => {
        if (!fullTreeData || !fullTreeData.children) return;
        const node = fullTreeData.children.find(c => c.fullName.includes(branchNamePart));
        if (node) {
            setSelectedMainBranch(node);
            setViewStep('SUB_SELECTION');
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
            setViewStep('MAIN_SELECTION');
            setSelectedMainBranch(null);
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
            fatherId: node.fatherId,
            // Build children info from node's children array
            children: node.children ? node.children.map(c => ({
                _id: c._id,
                fullName: c.fullName,
                gender: c.gender
            })) : []
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
                        {viewStep === 'SUB_SELECTION' && `فروع عائلة ${selectedMainBranch?.fullName}`}
                        {viewStep === 'TREE_VIEW' && `شجرة ${selectedSubTreeNode?.fullName}`}
                    </span>
                </div>
                <div className="text-sm bg-white/20 px-3 py-1 rounded-full hidden sm:block">
                    غصن الزيتون العضوي
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4">

                {/* STEP 1: Main Branch Selection */}
                {viewStep === 'MAIN_SELECTION' && (
                    <div className="w-full max-w-4xl px-4 animate-fade-in-up">
                        <div className="grid grid-cols-2 gap-4 md:gap-8 justify-items-center">
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

                            {/* Ibrahim - Centered in the next row if grid-cols-2 */}
                            <div className="col-span-2 w-full md:w-1/2 mt-4">
                                <BranchCard
                                    title="آل إبراهيم"
                                    color="from-blue-700 to-blue-900"
                                    onClick={() => handleMainBranchSelect('براهيم')}
                                    icon="🍀"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Sub-Branch Selection */}
                {viewStep === 'SUB_SELECTION' && selectedMainBranch && (
                    <div className="flex flex-col items-center w-full max-w-6xl h-full overflow-y-auto py-10">
                        <h2 className="text-3xl font-bold text-[#5D4037] mb-8">اختر فرع العائلة</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full px-4">
                            {selectedMainBranch.children && selectedMainBranch.children.map((child, idx) => (
                                <SubBranchCard
                                    key={child._id || idx}
                                    node={child}
                                    onClick={() => handleSubBranchSelect(child)}
                                />
                            ))}
                        </div>
                        {(!selectedMainBranch.children || selectedMainBranch.children.length === 0) && (
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
        className={`group relative overflow-hidden rounded-3xl p-8 h-64 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br ${color} text-white flex flex-col items-center justify-center text-center`}
    >
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-0 group-hover:opacity-10 transition-opacity"></div>
        <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">{icon}</div>
        <h3 className="text-4xl font-bold mb-2 shadow-sm">{title}</h3>
        <p className="text-white/90 mt-2 font-medium">اضغط لاستعراض الفروع</p>
    </button>
);

const SubBranchCard = ({ node, onClick }) => (
    <button
        onClick={onClick}
        className="bg-white p-6 rounded-2xl shadow-md border border-[#CCD5AE] hover:border-[#558B2F] hover:shadow-xl hover:bg-[#FEFAE0] transition-all duration-300 flex flex-col items-center text-center group"
    >
        <div className="w-16 h-16 rounded-full bg-[#E9EDC9] text-[#558B2F] flex items-center justify-center text-2xl font-bold mb-3 group-hover:bg-[#558B2F] group-hover:text-white transition-colors">
            {node.fullName.split(' ')[0][0]}
        </div>
        <h4 className="text-xl font-bold text-[#5D4037] mb-1">{node.fullName}</h4>
        <span className="text-sm text-gray-500">
            {node.children ? node.children.length : 0} أحفاد
        </span>
    </button>
);

export default OrganicOliveTreePage;

/**
 * Person Lineage Page
 * Shows the full ancestry of a person from bottom to top
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PersonModal } from '../components/FamilyTree';

const API_URL = import.meta.env.VITE_API_URL || '';

const PersonLineagePage = () => {
    const { personId } = useParams();
    const navigate = useNavigate();

    const [person, setPerson] = useState(null);
    const [lineage, setLineage] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPerson, setSelectedPerson] = useState(null);

    useEffect(() => {
        if (personId) {
            fetchLineage();
        }
    }, [personId]);

    const fetchLineage = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/api/branches/lineage/${personId}`);
            const data = await response.json();

            if (data.success) {
                setPerson(data.person);
                setLineage(data.lineage);
            } else {
                setError(data.error || 'حدث خطأ');
            }
        } catch (err) {
            console.error('Error fetching lineage:', err);
            setError('خطأ في جلب البيانات');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-green-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-green-800 font-bold">جاري تحميل النسب...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-green-50">
                <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-red-600 mb-4">{error}</h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                        العودة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-green-50" dir="rtl">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-700 to-green-900 text-white px-4 py-6 shadow-lg">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-white/20 rounded-full transition"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">سلسلة النسب</h1>
                            <p className="text-green-200 text-sm">شجرة نسب العائلة</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Person Info Card */}
            {person && (
                <div className="max-w-3xl mx-auto px-4 -mt-4">
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-amber-400 p-6">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <span className="text-4xl">👤</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">{person.fullName}</h2>
                            {person.nickname && (
                                <p className="text-amber-600 font-medium mb-2">"{person.nickname}"</p>
                            )}
                            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                                    الجيل {person.generation}
                                </span>
                                {person.isAlive !== undefined && (
                                    <span className={`px-3 py-1 rounded-full font-bold ${person.isAlive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {person.isAlive ? 'على قيد الحياة' : 'متوفى رحمه الله'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lineage Chain */}
            <div className="max-w-3xl mx-auto px-4 py-8">
                <h3 className="text-xl font-bold text-gray-700 mb-6 text-center flex items-center justify-center gap-2">
                    <span>🌳</span>
                    <span>سلسلة النسب من الابن إلى الجد الأكبر</span>
                </h3>

                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute right-8 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-green-500 to-green-700"></div>

                    {/* Lineage Items */}
                    <div className="space-y-4">
                        {lineage.map((ancestor, index) => (
                            <div
                                key={ancestor._id}
                                className="relative flex items-center gap-4 cursor-pointer group"
                                onClick={() => setSelectedPerson(ancestor)}
                            >
                                {/* Circle Marker */}
                                <div className={`
                                    w-16 h-16 rounded-full flex items-center justify-center z-10 shrink-0
                                    shadow-lg border-4 transition-transform group-hover:scale-110
                                    ${index === 0
                                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300'
                                        : index === lineage.length - 1
                                            ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400'
                                            : 'bg-white border-green-400'
                                    }
                                `}>
                                    {index === 0 ? (
                                        <span className="text-2xl">👤</span>
                                    ) : index === lineage.length - 1 ? (
                                        <span className="text-2xl">🌳</span>
                                    ) : (
                                        <span className={`font-bold text-lg ${index === 0 ? 'text-white' : 'text-green-700'}`}>
                                            {index + 1}
                                        </span>
                                    )}
                                </div>

                                {/* Info Card */}
                                <div className={`
                                    flex-1 p-4 rounded-xl shadow-md transition-all group-hover:shadow-lg group-hover:-translate-x-1
                                    ${index === 0
                                        ? 'bg-gradient-to-l from-amber-100 to-amber-50 border-2 border-amber-300'
                                        : index === lineage.length - 1
                                            ? 'bg-gradient-to-l from-green-100 to-green-50 border-2 border-green-400'
                                            : 'bg-white border border-gray-200'
                                    }
                                `}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-gray-800 text-lg">{ancestor.fullName}</div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {index === 0 ? (
                                                    <span className="text-amber-600 font-medium">الشخص المبحوث عنه</span>
                                                ) : index === lineage.length - 1 ? (
                                                    <span className="text-green-700 font-medium">الجد الأكبر - أصل الشجرة</span>
                                                ) : (
                                                    <span>الجيل {ancestor.generation}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-gray-400 group-hover:text-green-600 transition-colors">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Connection Label */}
                                {index < lineage.length - 1 && (
                                    <div className="absolute -bottom-2 right-5 text-xs text-gray-400 bg-white px-2 rounded z-20">
                                        ابن ↑
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Full Lineage Text */}
                <div className="mt-10 bg-white rounded-xl shadow-lg p-6 border-2 border-dashed border-green-300">
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span>📜</span>
                        <span>النسب الكامل:</span>
                    </h4>
                    <p className="text-lg text-gray-800 leading-relaxed font-medium text-center">
                        {lineage.map(a => a.fullName.split(' ')[0]).join(' بن ')}
                    </p>
                </div>

                {/* Back Button */}
                <div className="mt-8 text-center">
                    <Link
                        to="/family-tree/safe-full-tree"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-lg"
                    >
                        <span>🌲</span>
                        <span>العودة للشجرة الكاملة</span>
                    </Link>
                </div>
            </div>

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

export default PersonLineagePage;

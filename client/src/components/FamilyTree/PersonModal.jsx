/**
 * Person Modal Component
 * Shows detailed information about a person in the family tree
 */

import React from 'react';

const PersonModal = ({ person, onClose, onViewFullTree }) => {
    if (!person) return null;

    const getStatusColor = () => {
        if (person.isRoot) return 'bg-yellow-500';
        if (person.gender === 'female') return 'bg-palestine-red';
        return 'bg-palestine-green';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`${getStatusColor()} p-6 text-white text-center rounded-t-2xl relative`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 left-4 text-white hover:text-gray-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Avatar */}
                    <div className="w-20 h-20 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold">
                        {person.fullName?.charAt(0) || '?'}
                    </div>

                    <h2 className="text-2xl font-bold mb-1">{person.fullName}</h2>
                    {person.nickname && (
                        <p className="text-white text-opacity-80">({person.nickname})</p>
                    )}
                    <div className="mt-2 inline-block bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
                        الجيل {person.generation}
                        {person.isRoot && ' - الجد الأكبر 👑'}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4" dir="rtl">
                    {/* Father */}
                    {(person.fatherId || person.fatherName) && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-palestine-green text-xl">👨</span>
                            <div>
                                <p className="text-xs text-gray-500">الأب</p>
                                <p className="font-medium">
                                    {person.fatherName || person.fatherId?.fullName || 'غير محدد'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Birth Info */}
                    {(person.birthDate || person.birthPlace) && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-blue-500 text-xl">📅</span>
                            <div>
                                <p className="text-xs text-gray-500">الميلاد</p>
                                <p className="font-medium">
                                    {person.birthDate && <span>{person.birthDate}</span>}
                                    {person.birthDate && person.birthPlace && <span> - </span>}
                                    {person.birthPlace && <span>{person.birthPlace}</span>}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Occupation */}
                    {person.occupation && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-purple-500 text-xl">💼</span>
                            <div>
                                <p className="text-xs text-gray-500">المهنة</p>
                                <p className="font-medium">{person.occupation}</p>
                            </div>
                        </div>
                    )}

                    {/* Current Residence */}
                    {person.currentResidence && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <span className="text-teal-500 text-xl">🏠</span>
                            <div>
                                <p className="text-xs text-gray-500">مكان الإقامة</p>
                                <p className="font-medium">{person.currentResidence}</p>
                            </div>
                        </div>
                    )}

                    {/* Status */}


                    {/* Children */}
                    {person.children && person.children.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-2">الأبناء ({person.children.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {person.children.map((child, index) => (
                                    <span
                                        key={child._id || index}
                                        className="inline-flex items-center px-3 py-1 bg-white rounded-full text-sm border"
                                    >
                                        {child.fullName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {person.notes && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                            <p className="text-sm text-gray-700">{person.notes}</p>
                        </div>
                    )}

                    {/* Biography */}
                    {person.biography && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">السيرة الذاتية</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{person.biography}</p>
                        </div>
                    )}

                    {/* Ancestors */}
                    {person.ancestors && person.ancestors.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-2">سلسلة النسب</p>
                            <div className="flex flex-wrap items-center gap-1 text-sm">
                                {person.ancestors.map((ancestor, index) => (
                                    <React.Fragment key={ancestor._id}>
                                        <span className="text-palestine-green font-medium">{ancestor.fullName}</span>
                                        {index < person.ancestors.length - 1 && (
                                            <span className="text-gray-400">←</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                        إغلاق
                    </button>
                    {onViewFullTree && (
                        <button
                            onClick={() => onViewFullTree(person._id)}
                            className="flex-1 px-4 py-2 bg-palestine-green text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
                        >
                            عرض الفرع
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PersonModal;

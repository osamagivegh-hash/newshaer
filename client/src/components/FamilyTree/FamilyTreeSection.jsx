/**
 * Family Tree Section Component
 * Call to Action for the family tree page
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

const FamilyTreeSection = () => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/persons/stats`);
            const data = await res.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (err) {
            console.error('Error fetching tree stats:', err);
        }
    };

    return (
        <section className="py-20 bg-gradient-to-b from-white to-green-50" id="family-tree">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <div className="mb-12 relative z-10">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-50 rounded-full filter blur-3xl opacity-50 -z-10"></div>

                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-palestine-green text-sm font-bold mb-6 border border-green-50">
                        <span className="text-xl">🌳</span>
                        <span>تراثنا فخرنا</span>
                    </span>

                    <h2 className="text-4xl md:text-5xl font-extrabold text-palestine-black mb-2 tracking-tight">
                        شجرة عائلة الشاعر
                    </h2>

                    <h3 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-palestine-green to-emerald-700 mb-6 font-kufi">
                        المنصه الرقميه لشجرة عائلة الشاعر
                    </h3>

                    <div className="h-1.5 w-32 bg-gradient-to-r from-palestine-red via-white to-palestine-green mx-auto rounded-full shadow-sm mb-8"></div>

                    <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-loose font-medium">
                        اكتشف تاريخ ونسب عائلة الشاعر العريقة. تصفح شجرة العائلة التفاعلية، وتعرف على الأجداد والأحفاد، وتواصل مع جذورك عبر منصتنا الرقمية الحديثة التي تجمع الماضي بالحاضر.
                    </p>
                </div>

                {stats && (
                    <div className="flex flex-wrap justify-center gap-8 mb-10">
                        <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-green-100 transform hover:scale-105 transition-transform duration-300">
                            <p className="text-4xl font-bold text-palestine-green mb-1">{stats.totalPersons}</p>
                            <p className="text-gray-500 font-medium">فرد في العائلة</p>
                        </div>
                        <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-green-100 transform hover:scale-105 transition-transform duration-300">
                            <p className="text-4xl font-bold text-palestine-green mb-1">{stats.totalGenerations}</p>
                            <p className="text-gray-500 font-medium">جيل موثق</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <Link
                        to="/family-tree"
                        className="inline-flex items-center gap-3 bg-palestine-black text-white px-10 py-5 rounded-xl text-xl font-bold hover:bg-palestine-green transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto justify-center"
                    >
                        <span>تصفح شجرة العائلة</span>
                        <svg className="w-6 h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>

                    <Link
                        to="/family-tree/forum"
                        className="inline-flex items-center gap-3 bg-white text-palestine-green border-2 border-palestine-green px-10 py-4 rounded-xl text-xl font-bold hover:bg-palestine-green hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full sm:w-auto justify-center"
                    >
                        <span>🏛️ منتدى العائلة</span>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default FamilyTreeSection;

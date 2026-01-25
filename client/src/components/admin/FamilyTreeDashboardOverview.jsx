import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilyTreeAuth } from '../../contexts/FamilyTreeAuthContext'
import { familyTreeDashboardApi, familyTreeBackupApi } from '../../utils/familyTreeApi'
import toast from 'react-hot-toast'

/**
 * Family Tree Dashboard Overview
 * 
 * Main landing page for the isolated Family Tree Dashboard.
 * Shows statistics, recent backups, and quick actions.
 */
const FamilyTreeDashboardOverview = () => {
    const { isFTSuperAdmin } = useFamilyTreeAuth()
    const [stats, setStats] = useState(null)
    const [latestAdditions, setLatestAdditions] = useState([])
    const [loading, setLoading] = useState(true)
    const [creatingBackup, setCreatingBackup] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch stats and latest additions in parallel
            const [statsResponse, additionsResponse] = await Promise.all([
                familyTreeDashboardApi.getStats(),
                familyTreeDashboardApi.getLatestAdditions().catch(() => ({ data: [] }))
            ])

            setStats(statsResponse.data)
            setLatestAdditions(additionsResponse.data || [])
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateBackup = async () => {
        if (creatingBackup) return
        try {
            setCreatingBackup(true)
            await familyTreeBackupApi.createBackup()
            toast.success('تم إنشاء النسخة الاحتياطية بنجاح')
            fetchStats()
        } catch (error) {
            toast.error(error.message)
        } finally {
            setCreatingBackup(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'لا يوجد'
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin text-5xl mb-4">🌳</div>
                    <p className="text-emerald-600 font-medium">جاري تحميل البيانات...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">🌳 لوحة شجرة العائلة</h1>
                        <p className="text-emerald-100 text-lg">
                            إدارة بيانات أفراد العائلة وهيكل الشجرة والنسخ الاحتياطية
                        </p>
                    </div>
                    <button
                        onClick={handleCreateBackup}
                        disabled={creatingBackup}
                        className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl font-semibold flex items-center gap-2 transition-all border border-white/30"
                    >
                        {creatingBackup ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                جاري الإنشاء...
                            </>
                        ) : (
                            <>
                                <span>💾</span>
                                نسخ احتياطي الآن
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Persons */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">إجمالي أفراد العائلة</p>
                            <p className="text-4xl font-bold text-emerald-600">{stats?.totalPersons || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <span className="text-3xl">👥</span>
                        </div>
                    </div>
                </div>

                {/* Generations */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-teal-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">عدد الأجيال</p>
                            <p className="text-4xl font-bold text-teal-600">{stats?.totalGenerations || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center">
                            <span className="text-3xl">📊</span>
                        </div>
                    </div>
                </div>

                {/* Living Members */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-green-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">الأحياء</p>
                            <p className="text-4xl font-bold text-green-600">{stats?.livingMembers || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="text-3xl">💚</span>
                        </div>
                    </div>
                </div>

                {/* Deceased Members */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-1">المتوفون</p>
                            <p className="text-4xl font-bold text-gray-600">{stats?.deceasedMembers || 0}</p>
                        </div>
                        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                            <span className="text-3xl">🕊️</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Backup Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>⚡</span>
                        إجراءات سريعة
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <button
                            onClick={() => navigate('/family-dashboard/members')}
                            className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl hover:from-emerald-100 hover:to-emerald-200 transition-all text-right group"
                        >
                            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">👤</span>
                            <span className="font-semibold text-emerald-800">إضافة فرد جديد</span>
                        </button>
                        <button
                            onClick={() => navigate('/family-dashboard/tree')}
                            className="p-4 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl hover:from-teal-100 hover:to-teal-200 transition-all text-right group"
                        >
                            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">🌳</span>
                            <span className="font-semibold text-teal-800">عرض الشجرة</span>
                        </button>
                        <button
                            onClick={() => navigate('/family-dashboard/backups')}
                            className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all text-right group"
                        >
                            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">💾</span>
                            <span className="font-semibold text-blue-800">النسخ الاحتياطية</span>
                        </button>
                        <button
                            onClick={() => navigate('/family-dashboard/content')}
                            className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all text-right group"
                        >
                            <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">📄</span>
                            <span className="font-semibold text-purple-800">إدارة المحتوى</span>
                        </button>
                        {isFTSuperAdmin && (
                            <button
                                onClick={() => navigate('/family-dashboard/users')}
                                className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl hover:from-amber-100 hover:to-amber-200 transition-all text-right group"
                            >
                                <span className="text-3xl mb-2 block group-hover:scale-110 transition-transform">👥</span>
                                <span className="font-semibold text-amber-800">إدارة المستخدمين</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Backup Status */}
                <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>💾</span>
                        حالة النسخ الاحتياطية
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600">آخر نسخة احتياطية</p>
                                <p className="font-semibold text-emerald-700">
                                    {formatDate(stats?.backup?.lastBackup?.createdAt)}
                                </p>
                            </div>
                            <div className="text-3xl">✅</div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600">إجمالي النسخ الاحتياطية</p>
                                <p className="font-semibold text-blue-700">{stats?.backup?.totalBackups || 0} نسخة</p>
                            </div>
                            <div className="text-3xl">📦</div>
                        </div>

                        <button
                            onClick={() => navigate('/family-dashboard/backups')}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
                        >
                            إدارة النسخ الاحتياطية
                        </button>
                    </div>
                </div>
            </div>

            {/* Generations Breakdown */}
            {stats?.generationBreakdown && stats.generationBreakdown.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-lg border border-emerald-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>📈</span>
                        توزيع الأجيال
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {stats.generationBreakdown.map((gen) => (
                            <div
                                key={gen.generation}
                                className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl text-center border border-emerald-100"
                            >
                                <p className="text-sm text-gray-500 mb-1">الجيل {gen.generation}</p>
                                <p className="text-2xl font-bold text-emerald-600">{gen.count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Latest 50 Additions Table */}
            {latestAdditions.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-emerald-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>📝</span>
                            آخر 50 إضافة لشجرة العائلة
                        </h2>
                        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">
                            بأثر رجعي
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-sm">الاسم</th>
                                    <th className="px-4 py-3 font-semibold text-sm">النسب الكامل إلى الشاعر</th>
                                    <th className="px-4 py-3 font-semibold text-sm">أضيف بواسطة</th>
                                    <th className="px-4 py-3 font-semibold text-sm">التاريخ</th>
                                    <th className="px-4 py-3 font-semibold text-sm">الوقت</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {latestAdditions.map((person) => (
                                    <tr key={person.id} className="hover:bg-emerald-50/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-800 text-sm whitespace-nowrap">
                                            {person.shortName}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs leading-relaxed">
                                            {person.fullName}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${person.createdBy === 'System'
                                                    ? 'bg-gray-100 text-gray-600'
                                                    : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                {person.createdBy}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-sm font-medium whitespace-nowrap">
                                            {new Date(person.createdAt).toLocaleDateString('ar-SA')}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-sm font-mono whitespace-nowrap" dir="ltr">
                                            {new Date(person.createdAt).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FamilyTreeDashboardOverview

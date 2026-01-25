import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdmin } from '../../contexts/AdminContext'
import { adminDashboard } from '../../utils/adminApi'
import toast from 'react-hot-toast'
import LoadingSpinner from '../LoadingSpinner'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAdmin()

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    // Super-admin and admin have all permissions
    if (['super-admin', 'admin'].includes(user.role)) return true;
    // Check editor permissions
    return user.permissions && user.permissions.includes(permission);
  };

  // Check if user is admin or super-admin
  const isFullAdmin = user?.role === 'super-admin' || user?.role === 'admin';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminDashboard.getStats()
        setStats(data)
      } catch (error) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // All possible stat cards with their required permissions
  const allStatCards = [
    {
      title: 'زوار اليوم',
      value: stats?.visitorsToday || 0,
      icon: '👥',
      color: 'bg-indigo-600',
      path: '#',
      permission: 'news' // Visible to editors too
    },
    {
      title: 'الأخبار',
      value: stats?.news || 0,
      icon: '📰',
      color: 'bg-blue-500',
      path: '/admin/news',
      permission: 'news'
    },
    {
      title: 'الحوارات',
      value: stats?.conversations || 0,
      icon: '💬',
      color: 'bg-green-500',
      path: '/admin/conversations',
      permission: 'conversations'
    },
    {
      title: 'المقالات',
      value: stats?.articles || 0,
      icon: '📝',
      color: 'bg-purple-500',
      path: '/admin/articles',
      permission: 'articles'
    },
    {
      title: 'صور فلسطين',
      value: stats?.palestine || 0,
      icon: '🏛️',
      color: 'bg-red-500',
      path: '/admin/palestine',
      permission: 'palestine'
    },
    {
      title: 'معرض الصور',
      value: stats?.gallery || 0,
      icon: '🖼️',
      color: 'bg-yellow-500',
      path: '/admin/gallery',
      permission: 'gallery'
    },
    {
      title: 'شجرة العائلة',
      value: stats?.persons || 0,
      icon: '🌳',
      color: 'bg-emerald-600',
      path: '/admin/family-tree',
      permission: 'family-tree'
    },
    {
      title: 'الرسائل',
      value: stats?.contacts || 0,
      icon: '📧',
      color: 'bg-teal-500',
      path: '/admin/contacts',
      permission: 'contacts'
    },
    {
      title: 'رسائل جديدة',
      value: stats?.unreadContacts || 0,
      icon: '🔔',
      color: 'bg-orange-500',
      path: '/admin/contacts',
      permission: 'contacts'
    },
    {
      title: 'رسائل التطوير',
      value: stats?.devTeamMessages || 0,
      icon: '👨‍💻',
      color: 'bg-teal-600',
      path: '/admin/dev-team',
      permission: 'dev-team'
    }
  ]

  // All possible quick actions with their required permissions
  const allQuickActions = [
    {
      title: 'إضافة خبر جديد',
      description: 'أضف خبراً جديداً للعائلة',
      icon: '📰',
      color: 'bg-palestine-green',
      action: () => navigate('/admin/news/new'),
      permission: 'news'
    },
    {
      title: 'إضافة مقال',
      description: 'اكتب مقالاً جديداً',
      icon: '📝',
      color: 'bg-palestine-red',
      action: () => navigate('/admin/articles/new'),
      permission: 'articles'
    },
    {
      title: 'إضافة فرد للعائلة',
      description: 'أضف شخصاً لشجرة العائلة',
      icon: '🌳',
      color: 'bg-emerald-600',
      action: () => navigate('/admin/family-tree'),
      permission: 'family-tree'
    },
    {
      title: 'رفع صور جديدة',
      description: 'أضف صوراً لمعرض الصور',
      icon: '📷',
      color: 'bg-blue-600',
      action: () => navigate('/admin/gallery/new'),
      permission: 'gallery'
    },
    {
      title: 'رسائل فريق التطوير',
      description: 'إدارة رسائل ومنشورات الفريق',
      icon: '👨‍💻',
      color: 'bg-teal-600',
      action: () => navigate('/admin/dev-team'),
      permission: 'dev-team'
    }
  ]

  // Filter cards and actions based on user permissions
  const statCards = useMemo(() => {
    return allStatCards.filter(card => hasPermission(card.permission));
  }, [user, stats]);

  const quickActions = useMemo(() => {
    return allQuickActions.filter(action => hasPermission(action.permission));
  }, [user]);

  if (loading) {
    return <LoadingSpinner />
  }

  // Get welcome message based on role
  const getWelcomeMessage = () => {
    if (user?.role === 'super-admin') {
      return 'إدارة محتوى موقع عائلة الشاعر والتحكم في جميع الأقسام';
    } else if (user?.role === 'admin') {
      return 'إدارة محتوى موقع عائلة الشاعر';
    } else {
      const permissionLabels = {
        'family-tree': 'شجرة العائلة',
        'dev-team': 'فريق التطوير',
        'news': 'الأخبار',
        'articles': 'المقالات',
        'conversations': 'الحوارات',
        'gallery': 'المعرض',
        'contacts': 'الرسائل',
        'palestine': 'فلسطين'
      };
      const userPerms = (user?.permissions || []).map(p => permissionLabels[p] || p).join('، ');
      return `صلاحياتك: ${userPerms || 'لا توجد صلاحيات'}`;
    }
  };

  // Get role badge
  const getRoleBadge = () => {
    switch (user?.role) {
      case 'super-admin':
        return <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">مدير أعلى</span>;
      case 'admin':
        return <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">مدير</span>;
      case 'editor':
        return <span className="bg-teal-500 text-white px-3 py-1 rounded-full text-sm">محرر</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-palestine-green to-olive-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">مرحباً بك، {user?.displayName || user?.username}</h1>
          {getRoleBadge()}
        </div>
        <p className="text-palestine-white/90">
          {getWelcomeMessage()}
        </p>
      </div>

      {/* Statistics Cards */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                  <p className="text-3xl font-bold text-palestine-black mt-1">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <span className="text-2xl">{card.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-palestine-black mb-6">إجراءات سريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`${action.color} text-white p-4 rounded-lg hover:opacity-90 transition-opacity duration-200 text-right`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{action.icon}</span>
                </div>
                <h3 className="font-semibold mb-1">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity - Only show for full admins */}
      {isFullAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-palestine-black mb-4">حالة النظام</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full ml-3"></div>
                  <span className="text-green-800 font-medium">الخادم</span>
                </div>
                <span className="text-green-600 text-sm">يعمل بشكل طبيعي</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full ml-3"></div>
                  <span className="text-green-800 font-medium">قاعدة البيانات</span>
                </div>
                <span className="text-green-600 text-sm">متصلة</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full ml-3"></div>
                  <span className="text-green-800 font-medium">النسخ الاحتياطي</span>
                </div>
                <span className="text-green-600 text-sm">محدث</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-palestine-black mb-4">إحصائيات سريعة</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">إجمالي الزوار</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {stats?.visitorsTotal || 0}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">إجمالي المحتوى</span>
                <span className="text-2xl font-bold text-palestine-green">
                  {(stats?.news || 0) + (stats?.conversations || 0) + (stats?.articles || 0) + (stats?.palestine || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">الرسائل الجديدة</span>
                <span className="text-2xl font-bold text-palestine-red">
                  {stats?.unreadContacts || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Info Card */}
      {user?.role === 'editor' && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">📋</span>
            <div>
              <h3 className="font-bold text-teal-900 mb-2">معلومات المحرر</h3>
              <p className="text-teal-700 text-sm mb-2">
                أنت مسجل دخول كمحرر. يمكنك فقط الوصول إلى الأقسام المخصصة لك في القائمة الجانبية.
              </p>
              <p className="text-teal-600 text-xs">
                للحصول على صلاحيات إضافية، تواصل مع مدير النظام.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard

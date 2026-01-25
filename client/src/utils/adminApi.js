import axios from 'axios'

// Use relative URLs for both dev and production
// Vite proxy handles development routing
const ADMIN_API_BASE_URL = '/api/admin'

// Create axios instance for admin API
const adminApi = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000 // 30 second timeout
})

// Request interceptor to add auth token
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Don't override Content-Type for FormData (file uploads)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)

    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminUser')
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth functions
export const adminAuth = {
  login: async (credentials) => {
    try {
      const response = await adminApi.post('/login', credentials)
      if (response.data.token) {
        localStorage.setItem('adminToken', response.data.token)
        localStorage.setItem('adminUser', JSON.stringify(response.data.user))
      }
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تسجيل الدخول')
    }
  },

  logout: () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    window.location.href = '/admin/login'
  },

  verifyToken: async () => {
    try {
      const response = await adminApi.get('/verify')
      return response.data
    } catch (error) {
      throw new Error('رمز الوصول غير صالح')
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await adminApi.post('/change-password', passwordData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تغيير كلمة المرور')
    }
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('adminUser')
    return user ? JSON.parse(user) : null
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('adminToken')
  }
}

// Dashboard functions
export const adminDashboard = {
  getStats: async () => {
    try {
      const response = await adminApi.get('/stats')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب الإحصائيات')
    }
  }
}

// Generic CRUD functions
const createCRUDFunctions = (endpoint) => ({
  getAll: async () => {
    try {
      const response = await adminApi.get(`/${endpoint}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || `خطأ في جلب ${endpoint}`)
    }
  },

  getById: async (id) => {
    try {
      const response = await adminApi.get(`/${endpoint}/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || `خطأ في جلب ${endpoint}`)
    }
  },

  create: async (data) => {
    try {
      const response = await adminApi.post(`/${endpoint}`, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || `خطأ في إضافة ${endpoint}`)
    }
  },

  update: async (id, data) => {
    try {
      const response = await adminApi.put(`/${endpoint}/${id}`, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || `خطأ في تحديث ${endpoint}`)
    }
  },

  delete: async (id) => {
    try {
      const response = await adminApi.delete(`/${endpoint}/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || `خطأ في حذف ${endpoint}`)
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await adminApi.post(`/bulk-delete/${endpoint}`, { ids })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || `خطأ في الحذف المجمع`)
    }
  }
})

// Section-specific APIs
export const adminNews = createCRUDFunctions('news')
adminNews.toggleArchive = async (id, isArchived) => {
  try {
    const response = await adminApi.patch(`/news/${id}/archive`, { isArchived })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || 'خطأ في تحديث حالة الأرشفة')
  }
}
export const adminConversations = createCRUDFunctions('conversations')
export const adminArticles = createCRUDFunctions('articles')
export const adminPalestine = createCRUDFunctions('palestine')
export const adminGallery = createCRUDFunctions('gallery')

// Contacts API
export const adminContacts = {
  getAll: async () => {
    try {
      const response = await adminApi.get('/contacts')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب الرسائل')
    }
  },

  updateStatus: async (id, status) => {
    try {
      const response = await adminApi.put(`/contacts/${id}/status`, { status })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث حالة الرسالة')
    }
  },

  delete: async (id) => {
    try {
      const response = await adminApi.delete(`/contacts/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف الرسالة')
    }
  }
}

// File upload API
export const adminUpload = {
  uploadImage: async (file) => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await adminApi.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في رفع الصورة')
    }
  }
}

// Family Ticker News API
export const adminFamilyTickerNews = {
  getAll: async () => {
    try {
      const response = await adminApi.get('/family-ticker-news')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب أخبار الشريط العائلي')
    }
  },

  getById: async (id) => {
    try {
      const response = await adminApi.get(`/family-ticker-news/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب عنصر الشريط')
    }
  },

  create: async (data) => {
    try {
      const response = await adminApi.post('/family-ticker-news', data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في إضافة عنصر الشريط')
    }
  },

  update: async (id, data) => {
    try {
      const response = await adminApi.put(`/family-ticker-news/${id}`, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث عنصر الشريط')
    }
  },

  delete: async (id) => {
    try {
      const response = await adminApi.delete(`/family-ticker-news/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف عنصر الشريط')
    }
  }
}

// Palestine Ticker News API
export const adminPalestineTickerNews = {
  getAll: async () => {
    try {
      const response = await adminApi.get('/palestine-ticker-news')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب أخبار شريط فلسطين')
    }
  },

  getById: async (id) => {
    try {
      const response = await adminApi.get(`/palestine-ticker-news/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب عنصر الشريط')
    }
  },

  create: async (data) => {
    try {
      const response = await adminApi.post('/palestine-ticker-news', data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في إضافة عنصر الشريط')
    }
  },

  update: async (id, data) => {
    try {
      const response = await adminApi.put(`/palestine-ticker-news/${id}`, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث عنصر الشريط')
    }
  },

  delete: async (id) => {
    try {
      const response = await adminApi.delete(`/palestine-ticker-news/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف عنصر الشريط')
    }
  }
}

export const adminComments = {
  getAll: async (params = {}) => {
    try {
      const response = await adminApi.get('/comments', { params })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب التعليقات')
    }
  },

  delete: async (id) => {
    try {
      const response = await adminApi.delete(`/comments/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف التعليق')
    }
  }
}

// Ticker Settings API
export const adminTickerSettings = {
  get: async () => {
    try {
      const response = await adminApi.get('/ticker-settings')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب إعدادات الشريط')
    }
  },

  update: async (data) => {
    try {
      const response = await adminApi.put('/ticker-settings', data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث إعدادات الشريط')
    }
  }
}

export const adminHeroSlides = {
  getAll: async () => {
    try {
      const response = await adminApi.get('/hero-slides')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب شرائح البطل')
    }
  },

  getById: async (id) => {
    try {
      const response = await adminApi.get(`/hero-slides/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب الشريحة')
    }
  },

  create: async (data) => {
    try {
      const response = await adminApi.post('/hero-slides', data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في إضافة الشريحة')
    }
  },

  update: async (id, data) => {
    try {
      const response = await adminApi.put(`/hero-slides/${id}`, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث الشريحة')
    }
  },

  delete: async (id) => {
    try {
      const response = await adminApi.delete(`/hero-slides/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف الشريحة')
    }
  }
}

// Add generic HTTP methods to the adminApi instance for flexible API calls
// Note: These use relative API paths from the /api base (not /api/admin)
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Generic API wrapper with flexible path support
const adminApiWrapper = {
  // Use adminApi instance methods for /api/admin routes
  ...adminApi,

  // Generic GET request (can use absolute or relative path)
  get: async (path) => {
    try {
      // If path starts with /, it's relative to API base, not admin base
      if (path.startsWith('/family-tree-content')) {
        const response = await axios.get(`${API_BASE_URL}/api${path}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
        return response.data
      }
      const response = await adminApi.get(path)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب البيانات')
    }
  },

  // Generic POST request
  post: async (path, data) => {
    try {
      if (path.startsWith('/family-tree-content')) {
        const response = await axios.post(`${API_BASE_URL}/api${path}`, data, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
        return response.data
      }
      const response = await adminApi.post(path, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في إرسال البيانات')
    }
  },

  // Generic PUT request
  put: async (path, data) => {
    try {
      if (path.startsWith('/family-tree-content')) {
        const response = await axios.put(`${API_BASE_URL}/api${path}`, data, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
        return response.data
      }
      const response = await adminApi.put(path, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث البيانات')
    }
  },

  // Generic PATCH request
  patch: async (path, data) => {
    try {
      if (path.startsWith('/family-tree-content')) {
        const response = await axios.patch(`${API_BASE_URL}/api${path}`, data, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
        return response.data
      }
      const response = await adminApi.patch(path, data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث البيانات')
    }
  },

  // Generic DELETE request
  delete: async (path) => {
    try {
      if (path.startsWith('/family-tree-content')) {
        const response = await axios.delete(`${API_BASE_URL}/api${path}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`
          }
        })
        return response.data
      }
      const response = await adminApi.delete(path)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف البيانات')
    }
  },

  // File upload helper
  upload: async (formData) => {
    try {
      const response = await adminApi.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في رفع الملف')
    }
  }
}

// ==================== FAMILY TREE DASHBOARD API ====================

export const familyTreeDashboardApi = {
  // Get Family Tree Dashboard Stats
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/family-tree/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب إحصائيات شجرة العائلة')
    }
  },

  // Get Family Tree Backups
  getBackups: async (limit = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/family-tree/backups?limit=${limit}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب النسخ الاحتياطية')
    }
  },

  // Get Backup Details
  getBackupDetails: async (backupId, includeData = false) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboard/family-tree/backups/${backupId}?includeData=${includeData}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب تفاصيل النسخة الاحتياطية')
    }
  },

  // Create Manual Backup
  createBackup: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/dashboard/family-tree/backups/create`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في إنشاء النسخة الاحتياطية')
    }
  },

  // Restore from Backup (Super Admin only)
  restoreBackup: async (backupId, confirmRestore = false) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/dashboard/family-tree/backups/${backupId}/restore`,
        { confirmRestore },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في استعادة النسخة الاحتياطية')
    }
  },

  // Delete Backup (Super Admin only)
  deleteBackup: async (backupId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/dashboard/family-tree/backups/${backupId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف النسخة الاحتياطية')
    }
  },

  // Get Backup Settings (Super Admin only)
  getBackupSettings: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboard/family-tree/backup-settings`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب إعدادات النسخ الاحتياطي')
    }
  },

  // Update Backup Settings (Super Admin only)
  updateBackupSettings: async (settings) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/dashboard/family-tree/backup-settings`,
        settings,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث إعدادات النسخ الاحتياطي')
    }
  },

  // Get Audit Logs (Super Admin only)
  getAuditLogs: async (limit = 100) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboard/family-tree/audit-logs?limit=${limit}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب سجلات التدقيق')
    }
  }
}

// ==================== CMS DASHBOARD API ====================

export const cmsDashboardApi = {
  // Get CMS Dashboard Stats
  getStats: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/cms/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب إحصائيات لوحة الإدارة')
    }
  },

  // Get CMS Backups
  getBackups: async (limit = 20) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/cms/backups?limit=${limit}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب النسخ الاحتياطية')
    }
  },

  // Get Backup Details
  getBackupDetails: async (backupId, includeData = false) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboard/cms/backups/${backupId}?includeData=${includeData}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب تفاصيل النسخة الاحتياطية')
    }
  },

  // Create Manual Backup
  createBackup: async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/dashboard/cms/backups/create`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في إنشاء النسخة الاحتياطية')
    }
  },

  // Restore from Backup (Super Admin only)
  restoreBackup: async (backupId, confirmRestore = false) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/dashboard/cms/backups/${backupId}/restore`,
        { confirmRestore },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في استعادة النسخة الاحتياطية')
    }
  },

  // Delete Backup (Super Admin only)
  deleteBackup: async (backupId) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/dashboard/cms/backups/${backupId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في حذف النسخة الاحتياطية')
    }
  },

  // Get Backup Settings (Super Admin only)
  getBackupSettings: async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboard/cms/backup-settings`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب إعدادات النسخ الاحتياطي')
    }
  },

  // Update Backup Settings (Super Admin only)
  updateBackupSettings: async (settings) => {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/dashboard/cms/backup-settings`,
        settings,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في تحديث إعدادات النسخ الاحتياطي')
    }
  },

  // Get Audit Logs (Super Admin only)
  getAuditLogs: async (limit = 100) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/dashboard/cms/audit-logs?limit=${limit}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'خطأ في جلب سجلات التدقيق')
    }
  }
}

export default adminApiWrapper


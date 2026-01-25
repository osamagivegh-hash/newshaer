import axios from 'axios'

/**
 * Family Tree Dashboard API
 * 
 * COMPLETELY SEPARATE from CMS API.
 * Uses familyTreeToken for authentication.
 * 
 * SECURITY: This API uses a different token than CMS.
 */

// API base URL - empty in production (relative URLs)
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5000' : ''

// Token key - different from CMS
const FT_TOKEN_KEY = 'familyTreeToken'

// Get FT token
const getFTToken = () => localStorage.getItem(FT_TOKEN_KEY)

// Get auth headers
const getAuthHeaders = () => ({
    'Authorization': `Bearer ${getFTToken()}`,
    'Content-Type': 'application/json'
})

// Create axios instance for Family Tree API
const ftApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000
})

// Request interceptor
ftApi.interceptors.request.use(
    (config) => {
        const token = getFTToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor
ftApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear FT auth and redirect to FT login
            localStorage.removeItem(FT_TOKEN_KEY)
            localStorage.removeItem('familyTreeUser')
            if (!window.location.pathname.includes('/family-dashboard/login')) {
                window.location.href = '/family-dashboard/login'
            }
        }
        return Promise.reject(error)
    }
)

// ==================== DASHBOARD API ====================

export const familyTreeDashboardApi = {
    // Get Dashboard Stats
    getStats: async () => {
        try {
            const response = await ftApi.get('/api/dashboard/family-tree/stats')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب الإحصائيات')
        }
    },

    // Get Latest 50 Additions
    getLatestAdditions: async () => {
        try {
            const response = await ftApi.get('/api/dashboard/family-tree/latest-additions')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب آخر الإضافات')
        }
    },

    // Get All Persons
    getPersons: async (search = '', generation = '') => {
        try {
            const response = await ftApi.get(`/api/dashboard/family-tree/persons?search=${search}&generation=${generation}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب أفراد العائلة')
        }
    },

    // Get Person by ID
    getPerson: async (id) => {
        try {
            const response = await ftApi.get(`/api/dashboard/family-tree/persons/${id}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب بيانات الشخص')
        }
    },

    // Create Person
    createPerson: async (personData) => {
        try {
            const response = await ftApi.post('/api/dashboard/family-tree/persons', personData)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في إضافة الشخص')
        }
    },

    // Update Person
    updatePerson: async (id, personData) => {
        try {
            const response = await ftApi.put(`/api/dashboard/family-tree/persons/${id}`, personData)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث بيانات الشخص')
        }
    },

    // Delete Person (ft-super-admin only)
    deletePerson: async (id, cascade = false) => {
        try {
            const url = `/api/dashboard/family-tree/persons/${id}${cascade ? '?cascade=true' : ''}`
            const response = await ftApi.delete(url)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في حذف الشخص')
        }
    }
}

// ==================== BACKUP API ====================

export const familyTreeBackupApi = {
    // Get Backups List
    getBackups: async (limit = 20) => {
        try {
            const response = await ftApi.get(`/api/dashboard/family-tree/backups?limit=${limit}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب النسخ الاحتياطية')
        }
    },

    // Get Backup Details
    getBackupDetails: async (backupId, includeData = false) => {
        try {
            const response = await ftApi.get(`/api/dashboard/family-tree/backups/${backupId}?includeData=${includeData}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب تفاصيل النسخة الاحتياطية')
        }
    },

    // Create Backup
    createBackup: async () => {
        try {
            const response = await ftApi.post('/api/dashboard/family-tree/backups/create')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في إنشاء النسخة الاحتياطية')
        }
    },

    // Restore Backup (ft-super-admin only)
    restoreBackup: async (backupId, confirmRestore = false) => {
        try {
            const response = await ftApi.post(`/api/dashboard/family-tree/backups/${backupId}/restore`, { confirmRestore })
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في استعادة النسخة الاحتياطية')
        }
    },

    // Delete Backup (ft-super-admin only)
    deleteBackup: async (backupId) => {
        try {
            const response = await ftApi.delete(`/api/dashboard/family-tree/backups/${backupId}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في حذف النسخة الاحتياطية')
        }
    },

    // Get Backup Settings (ft-super-admin only)
    getBackupSettings: async () => {
        try {
            const response = await ftApi.get('/api/dashboard/family-tree/backup-settings')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب إعدادات النسخ الاحتياطي')
        }
    },

    // Update Backup Settings (ft-super-admin only)
    updateBackupSettings: async (settings) => {
        try {
            const response = await ftApi.put('/api/dashboard/family-tree/backup-settings', settings)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث إعدادات النسخ الاحتياطي')
        }
    }
}

// ==================== AUDIT LOGS API ====================

export const familyTreeAuditApi = {
    // Get Audit Logs (ft-super-admin only)
    getAuditLogs: async (limit = 100) => {
        try {
            const response = await ftApi.get(`/api/dashboard/family-tree/audit-logs?limit=${limit}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب سجلات التدقيق')
        }
    }
}

// ==================== USER MANAGEMENT API ====================

export const familyTreeUserApi = {
    // List Users (ft-super-admin only)
    getUsers: async () => {
        try {
            const response = await ftApi.get('/api/family-tree-auth/users')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب المستخدمين')
        }
    },

    // Create User (ft-super-admin only)
    createUser: async (userData) => {
        try {
            const response = await ftApi.post('/api/family-tree-auth/users', userData)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في إنشاء المستخدم')
        }
    },

    // Update User (ft-super-admin only)
    updateUser: async (id, userData) => {
        try {
            const response = await ftApi.put(`/api/family-tree-auth/users/${id}`, userData)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث المستخدم')
        }
    },

    // Delete User (ft-super-admin only)
    deleteUser: async (id) => {
        try {
            const response = await ftApi.delete(`/api/family-tree-auth/users/${id}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في حذف المستخدم')
        }
    },

    // Change Password (own account)
    changePassword: async (currentPassword, newPassword) => {
        try {
            const response = await ftApi.put('/api/family-tree-auth/change-password', {
                currentPassword,
                newPassword
            })
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تغيير كلمة المرور')
        }
    }
}

// ==================== CONTENT MANAGEMENT API ====================

export const familyTreeContentApi = {
    // Settings
    getSettings: async () => {
        try {
            const response = await ftApi.get('/api/family-tree-content/admin/settings')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب الإعدادات')
        }
    },
    updateSettings: async (settings) => {
        try {
            const response = await ftApi.put('/api/family-tree-content/admin/settings', settings)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث الإعدادات')
        }
    },

    // Appreciation
    getAppreciation: async () => {
        try {
            const response = await ftApi.get('/api/family-tree-content/admin/appreciation')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب محتوى التقدير')
        }
    },
    updateAppreciation: async (data) => {
        try {
            const response = await ftApi.put('/api/family-tree-content/admin/appreciation', data)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث محتوى التقدير')
        }
    },

    // Discussions
    getDiscussions: async () => {
        try {
            const response = await ftApi.get('/api/family-tree-content/admin/discussions')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب الحوارات')
        }
    },
    createDiscussion: async (data) => {
        try {
            const response = await ftApi.post('/api/family-tree-content/admin/discussions', data)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في إنشاء الحوار')
        }
    },
    updateDiscussion: async (id, data) => {
        try {
            const response = await ftApi.put(`/api/family-tree-content/admin/discussions/${id}`, data)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث الحوار')
        }
    },
    deleteDiscussion: async (id) => {
        try {
            const response = await ftApi.delete(`/api/family-tree-content/admin/discussions/${id}`)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في حذف الحوار')
        }
    },
    toggleDiscussionPublish: async (id, isPublished) => {
        try {
            const response = await ftApi.patch(`/api/family-tree-content/admin/discussions/${id}/publish`, { isPublished })
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث حالة النشر')
        }
    },

    // Tree Display
    getTreeDisplay: async () => {
        try {
            const response = await ftApi.get('/api/family-tree-content/admin/tree-display')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب إعدادات العرض')
        }
    },
    updateTreeDisplay: async (data) => {
        try {
            const response = await ftApi.put('/api/family-tree-content/admin/tree-display', data)
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في تحديث إعدادات العرض')
        }
    },

    // Stats
    getStats: async () => {
        try {
            const response = await ftApi.get('/api/family-tree-content/admin/stats')
            return response.data
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في جلب الإحصائيات')
        }
    },

    // Upload
    upload: async (formData) => {
        try {
            const response = await ftApi.post('/api/family-tree-content/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'خطأ في رفع الملف')
        }
    }
}

export default {
    dashboard: familyTreeDashboardApi,
    backup: familyTreeBackupApi,
    audit: familyTreeAuditApi,
    users: familyTreeUserApi,
    content: familyTreeContentApi
}

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Admin } = require('../models');
const { logAuthAttempt } = require('./auditLog');
require('dotenv').config();

const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret) {
  console.warn('JWT_SECRET is not set; generating ephemeral secret (not recommended for production).');
}
const JWT_SECRET = rawJwtSecret || crypto.randomBytes(32).toString('hex');

// Default Family Tree Editor credentials
const DEFAULT_EDITOR = {
  username: 'tree_editor',
  email: 'editor@alshaer.family',
  password: 'TreeEditor@2024',
  displayName: 'محرر شجرة العائلة',
  role: 'editor',
  permissions: ['family-tree']
};

// Initialize admin user
const initializeAdmin = async () => {
  try {
    const adminUsername = (process.env.ADMIN_USERNAME || '').trim();
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
    const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();

    if (!adminUsername || !adminEmail || !adminPassword) {
      console.warn('Admin bootstrap skipped: ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set.');
      return;
    }

    // Create or update super-admin
    const existingAdmin = await Admin.findOne({ username: adminUsername });

    if (!existingAdmin) {
      const defaultAdmin = new Admin({
        username: adminUsername,
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        role: 'super-admin',
        permissions: ['family-tree', 'dev-team', 'news', 'articles', 'conversations', 'gallery', 'contacts', 'palestine', 'settings'],
        displayName: 'مدير النظام',
        isActive: true,
        lastLogin: null
      });

      await defaultAdmin.save();
      console.log('✓ Super Admin account created from environment configuration');
    } else {
      // Sync role, permissions and password from environment
      let changed = false;
      if (existingAdmin.role !== 'super-admin') {
        existingAdmin.role = 'super-admin';
        existingAdmin.permissions = ['family-tree', 'dev-team', 'news', 'articles', 'conversations', 'gallery', 'contacts', 'palestine', 'settings'];
        changed = true;
      }
      // Sync password from env if it changed
      const passwordMatch = await bcrypt.compare(adminPassword, existingAdmin.password);
      if (!passwordMatch) {
        existingAdmin.password = await bcrypt.hash(adminPassword, 10);
        changed = true;
        console.log('✓ Admin password synced from environment');
      }
      if (changed) {
        await existingAdmin.save();
        console.log('✓ Admin account updated');
      }
    }

    // Create default Family Tree Editor if not exists
    const existingEditor = await Admin.findOne({ username: DEFAULT_EDITOR.username });
    if (!existingEditor) {
      const editorUser = new Admin({
        username: DEFAULT_EDITOR.username,
        email: DEFAULT_EDITOR.email,
        password: await bcrypt.hash(DEFAULT_EDITOR.password, 10),
        role: DEFAULT_EDITOR.role,
        permissions: DEFAULT_EDITOR.permissions,
        displayName: DEFAULT_EDITOR.displayName,
        isActive: true,
        createdBy: adminUsername,
        lastLogin: null
      });

      await editorUser.save();
      console.log('✓ Family Tree Editor account created');
      console.log(`  Username: ${DEFAULT_EDITOR.username}`);
      console.log(`  Password: ${DEFAULT_EDITOR.password}`);
    }
  } catch (error) {
    console.error('خطأ في إنشاء حساب المدير:', error);
  }
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'رمز الوصول مطلوب' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if admin still exists and is active
    const admin = await Admin.findOne({ username: decoded.username });
    if (!admin) {
      return res.status(403).json({ message: 'رمز الوصول غير صالح' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: 'الحساب معطل' });
    }

    // Attach full user info including permissions
    req.user = {
      ...decoded,
      permissions: admin.permissions || [],
      displayName: admin.displayName,
      isActive: admin.isActive
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'رمز الوصول غير صالح' });
  }
};

// Admin role check (admin or super-admin only, OR editor with any permission)
// This allows authenticated users to access admin routes if they have at least one permission
const requireAdmin = (req, res, next) => {
  const adminRoles = ['admin', 'super-admin'];

  // Admins always have access
  if (adminRoles.includes(req.user.role)) {
    return next();
  }

  // Editors need at least one permission to access admin area
  if (req.user.role === 'editor' && req.user.permissions && req.user.permissions.length > 0) {
    return next();
  }

  return res.status(403).json({ message: 'صلاحيات المدير مطلوبة' });
};

// Super Admin only check
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ message: 'صلاحيات المدير الأعلى مطلوبة' });
  }
  next();
};

// Permission check middleware factory
const requirePermission = (permission) => {
  return (req, res, next) => {
    // Super-admin and admin have all permissions
    if (['super-admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Check if editor has the required permission
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى هذا القسم' });
  };
};

// Login function
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';

    if (!username || !password) {
      return res.status(400).json({ message: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const admin = await Admin.findOne({ username });

    if (!admin) {
      await logAuthAttempt(username, false, clientIp, userAgent, 'User not found');
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (!admin.isActive) {
      await logAuthAttempt(username, false, clientIp, userAgent, 'Account disabled');
      return res.status(401).json({ message: 'الحساب معطل. تواصل مع المدير.' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      await logAuthAttempt(username, false, clientIp, userAgent, 'Invalid password');
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Log successful login
    await logAuthAttempt(username, true, clientIp, userAgent);

    const token = jwt.sign(
      {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions || [],
        displayName: admin.displayName
      },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions || [],
        displayName: admin.displayName,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'خطأ في تسجيل الدخول' });
  }
};

// Change password function
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }

    // Strong password policy
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'كلمة المرور يجب أن تكون 12 حرف على الأقل وتحتوي على حرف كبير وصغير ورقم ورمز خاص'
      });
    }

    const admin = await Admin.findOne({ username: req.user.username });

    const validPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    admin.updatedAt = new Date();
    await admin.save();

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'خطأ في تغيير كلمة المرور' });
  }
};

// ==================== USER MANAGEMENT (Super Admin Only) ====================

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await Admin.find({}, '-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      data: users.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        permissions: u.permissions || [],
        displayName: u.displayName,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        createdBy: u.createdBy
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب المستخدمين' });
  }
};

// Create new user (editor)
const createUser = async (req, res) => {
  try {
    const { username, email, password, displayName, role, permissions } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
    }

    // Check if username or email exists
    const existing = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل' });
    }

    // Only super-admin can create admin users
    const allowedRole = req.user.role === 'super-admin' ? (role || 'editor') : 'editor';

    const newUser = new Admin({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      displayName: displayName || username,
      role: allowedRole,
      permissions: permissions || ['family-tree'],
      isActive: true,
      createdBy: req.user.username
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions,
        displayName: newUser.displayName
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المستخدم' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, displayName, role, permissions, isActive, password } = req.body;

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // Prevent modifying super-admin unless you are super-admin
    if (user.role === 'super-admin' && req.user.role !== 'super-admin') {
      return res.status(403).json({ success: false, message: 'لا يمكن تعديل حساب المدير الأعلى' });
    }

    // Prevent self-demotion for super-admin
    if (user.username === req.user.username && user.role === 'super-admin' && role !== 'super-admin') {
      return res.status(400).json({ success: false, message: 'لا يمكنك تخفيض صلاحياتك' });
    }

    if (email) user.email = email;
    if (displayName) user.displayName = displayName;
    if (role && req.user.role === 'super-admin') user.role = role;
    if (permissions) user.permissions = permissions;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = await bcrypt.hash(password, 10);

    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        displayName: user.displayName,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المستخدم' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // Prevent deleting super-admin
    if (user.role === 'super-admin') {
      return res.status(403).json({ success: false, message: 'لا يمكن حذف حساب المدير الأعلى' });
    }

    // Prevent self-deletion
    if (user.username === req.user.username) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك' });
    }

    await Admin.findByIdAndDelete(id);

    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف المستخدم' });
  }
};

// Reset user password (Super Admin)
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'كلمة المرور الجديدة مطلوبة' });
    }

    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'خطأ في تغيير كلمة المرور' });
  }
};

module.exports = {
  initializeAdmin,
  authenticateToken,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
  login,
  changePassword,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword
  // Note: JWT_SECRET intentionally not exported for security
};

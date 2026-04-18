const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createAdmins() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // 1. CMS Admin (for dev-team section)
  const cmsAdmin = await db.collection('admins').findOne({ username: 'admin' });
  if (!cmsAdmin) {
    const hash = await bcrypt.hash('AlShaer2024!', 10);
    await db.collection('admins').insertOne({
      username: 'admin',
      email: 'admin@alshaerfamily.com',
      password: hash,
      role: 'super-admin',
      permissions: ['family-tree','dev-team','news','articles','conversations','gallery','contacts','palestine','settings'],
      displayName: 'مدير النظام',
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ CMS Admin created: admin / AlShaer2024!');
  } else {
    console.log('✅ CMS Admin already exists: admin');
    // Ensure super-admin role and dev-team permission
    await db.collection('admins').updateOne(
      { username: 'admin' },
      { $set: { role: 'super-admin', permissions: ['family-tree','dev-team','news','articles','conversations','gallery','contacts','palestine','settings'] } }
    );
    console.log('   Updated to super-admin with all permissions');
  }

  // 2. Family Tree Admin (for founder appreciation)
  const ftAdmin = await db.collection('family_tree_admins').findOne({ username: 'ft_admin' });
  if (!ftAdmin) {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('FT_Admin@2024!Secure', salt);
    await db.collection('family_tree_admins').insertOne({
      username: 'ft_admin',
      email: 'ft_admin@alshaer.family',
      password: hash,
      displayName: 'مدير شجرة العائلة',
      role: 'ft-super-admin',
      permissions: ['manage-members','manage-tree','manage-content','create-backups','restore-backups','manage-users','view-audit-logs','manage-settings'],
      isActive: true,
      createdBy: 'system',
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: null,
      passwordChangedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ FT Admin created: ft_admin / FT_Admin@2024!Secure');
  } else {
    console.log('✅ FT Admin already exists: ft_admin');
    // Ensure ft-super-admin role
    await db.collection('family_tree_admins').updateOne(
      { username: 'ft_admin' },
      { $set: { role: 'ft-super-admin', isActive: true, permissions: ['manage-members','manage-tree','manage-content','create-backups','restore-backups','manage-users','view-audit-logs','manage-settings'] } }
    );
    console.log('   Updated to ft-super-admin with all permissions');
  }

  console.log('\n📋 Login Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CMS Dashboard  → /admin/login');
  console.log('  Username: admin');
  console.log('  Password: AlShaer2024!');
  console.log('  Section:  فريق التطوير');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FT Dashboard   → /family-tree-dashboard/login');
  console.log('  Username: ft_admin');
  console.log('  Password: FT_Admin@2024!Secure');
  console.log('  Section:  تقدير ووفاء للمؤسس');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
}

createAdmins().catch(err => { console.error(err); process.exit(1); });

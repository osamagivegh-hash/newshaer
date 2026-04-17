const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://osamashaer67_db_user:990099@alshaer.5ikaqnu.mongodb.net/alshaer?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash('Ahmad@2024!', salt);
  await db.collection('family_tree_admins').insertOne({
    username: 'ahmad',
    email: 'ahmad@alshaer.family',
    password: hash,
    displayName: 'أحمد',
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
  console.log('User Ahmad created!');
  await mongoose.disconnect();
});

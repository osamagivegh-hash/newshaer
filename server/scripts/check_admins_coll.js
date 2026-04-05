const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkAdmins() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in server/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const admins = await db.collection('admins').find({}).toArray();
  console.log(`Admins Collection: ${admins.length} records`);

  admins.forEach((admin) => {
    console.log(
      `- Username: ${admin.username || 'N/A'}, Role: ${admin.role || 'N/A'}, Permissions: ${JSON.stringify(admin.permissions || [])}`
    );
  });

  await mongoose.disconnect();
}

checkAdmins().catch(async (error) => {
  console.error('Error:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

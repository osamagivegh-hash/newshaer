const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkUsers() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in server/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();

  console.log(`Found ${users.length} users:`);
  users.forEach((user) => {
    console.log(
      `- Username: ${user.username || 'N/A'}, Email: ${user.email || 'N/A'}, Role: ${user.role || 'N/A'}, Permissions: ${JSON.stringify(user.permissions || [])}`
    );
  });

  await mongoose.disconnect();
}

checkUsers().catch(async (error) => {
  console.error('Error:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

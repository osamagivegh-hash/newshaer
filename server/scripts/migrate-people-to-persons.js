/**
 * Migration Script - Transfer people collection into persons collection
 * Source connection comes from SOURCE_MONGODB_URI
 * Target connection comes from MONGODB_URI
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SOURCE_URI = process.env.SOURCE_MONGODB_URI;
const TARGET_URI = process.env.MONGODB_URI;

async function migrate() {
  if (!SOURCE_URI) {
    throw new Error('SOURCE_MONGODB_URI is missing in server/.env');
  }

  if (!TARGET_URI) {
    throw new Error('MONGODB_URI is missing in server/.env');
  }

  console.log('Starting migration from people -> persons...');

  const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();

  const sourceData = await sourceConn.db.collection('people').find({}).toArray();
  console.log(`Found ${sourceData.length} people in source`);

  if (sourceData.length === 0) {
    console.log('No data to migrate');
    await sourceConn.close();
    await targetConn.close();
    return;
  }

  const targetCount = await targetConn.db.collection('persons').countDocuments();
  if (targetCount > 0) {
    console.log(`Target persons collection already has ${targetCount} records. Aborting to avoid overwrite.`);
    await sourceConn.close();
    await targetConn.close();
    return;
  }

  const result = await targetConn.db.collection('persons').insertMany(sourceData);
  console.log(`Migrated ${result.insertedCount} persons`);

  await sourceConn.close();
  await targetConn.close();
}

migrate().catch((error) => {
  console.error('Migration error:', error.message);
  process.exit(1);
});

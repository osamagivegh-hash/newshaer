const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function verifyState() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[verify] MONGODB_URI is missing in server/.env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('[verify] Database connection: OK');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((collection) => collection.name).sort();

    const counts = {};
    const importantCollections = [
      'persons',
      'news',
      'articles',
      'conversations',
      'palestines',
      'galleries',
      'familytickernews',
      'palestinetickernews',
      'tickersettings',
      'heroslides',
      'admins',
      'familytreeadmins'
    ];

    for (const name of importantCollections) {
      if (collectionNames.includes(name)) {
        counts[name] = await db.collection(name).countDocuments();
      }
    }

    console.log('[verify] Collections:', collectionNames.join(', '));
    console.log('[verify] Counts:', JSON.stringify(counts, null, 2));
  } catch (error) {
    console.error('[verify] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

verifyState();

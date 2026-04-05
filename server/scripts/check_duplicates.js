const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkDuplicates() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in server/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const persons = await db.collection('persons').find({}).toArray();

  console.log('Connected to DB');
  console.log('Total persons:', persons.length);

  const nameCounts = {};
  persons.forEach((person) => {
    const key = person.fullName || 'Unknown';
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  });

  const duplicates = Object.entries(nameCounts).filter(([, count]) => count > 1);

  if (duplicates.length > 0) {
    console.log(
      'Duplicates found:',
      duplicates.map(([name, count]) => `${name} (${count})`).join(', ')
    );
  } else {
    console.log('No exact duplicates found by full name.');
  }

  await mongoose.disconnect();
}

checkDuplicates().catch(async (error) => {
  console.error('Error:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

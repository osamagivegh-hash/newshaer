/**
 * Migration Script - Transfer Family Tree Data
 * Source connection comes from SOURCE_MONGODB_URI
 * Target connection comes from MONGODB_URI
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SOURCE_URI = process.env.SOURCE_MONGODB_URI;
const TARGET_URI = process.env.MONGODB_URI;

const personSchema = new mongoose.Schema(
  {
    fullName: String,
    nickname: String,
    fatherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
    motherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person' },
    generation: Number,
    gender: String,
    birthDate: String,
    deathDate: String,
    isAlive: Boolean,
    birthPlace: String,
    currentResidence: String,
    occupation: String,
    biography: String,
    notes: String,
    profileImage: String,
    siblingOrder: Number,
    isRoot: Boolean,
    contact: Object,
    verification: Object,
    createdBy: String,
    createdAt: Date,
    updatedAt: Date
  },
  { timestamps: true }
);

async function migrateData() {
  if (!SOURCE_URI) {
    throw new Error('SOURCE_MONGODB_URI is missing in server/.env');
  }

  if (!TARGET_URI) {
    throw new Error('MONGODB_URI is missing in server/.env');
  }

  console.log('Starting Family Tree Data Migration...');

  const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const targetConn = await mongoose.createConnection(TARGET_URI).asPromise();

  const SourcePerson = sourceConn.model('Person', personSchema);
  const TargetPerson = targetConn.model('Person', personSchema);

  const sourcePersons = await SourcePerson.find({}).lean();
  console.log(`Found ${sourcePersons.length} persons in source database`);

  if (sourcePersons.length === 0) {
    console.log('No data found in source database. Nothing to migrate.');
    await sourceConn.close();
    await targetConn.close();
    return;
  }

  const existingCount = await TargetPerson.countDocuments();
  if (existingCount > 0) {
    console.log(`Target database already has ${existingCount} persons. Aborting to avoid duplicates.`);
    await sourceConn.close();
    await targetConn.close();
    return;
  }

  const idMap = new Map();
  const newPersons = sourcePersons.map((person) => {
    const newId = new mongoose.Types.ObjectId();
    idMap.set(person._id.toString(), newId);
    return {
      ...person,
      _id: newId
    };
  });

  newPersons.forEach((person) => {
    if (person.fatherId) {
      person.fatherId = idMap.get(person.fatherId.toString()) || null;
    }
    if (person.motherId) {
      person.motherId = idMap.get(person.motherId.toString()) || null;
    }
  });

  await TargetPerson.insertMany(newPersons);
  console.log(`Successfully migrated ${newPersons.length} persons.`);

  await sourceConn.close();
  await targetConn.close();
}

migrateData().catch((error) => {
  console.error('Migration error:', error.message);
  process.exit(1);
});

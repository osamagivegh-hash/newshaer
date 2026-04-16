const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  connectDB,
  News,
  Conversations,
  Articles,
  Palestine,
  Gallery,
  FamilyTickerNews,
  PalestineTickerNews,
  TickerSettings,
  HeroSlide,
  Person
} = require('../models');

const RECOVERY_DIR = path.join(__dirname, '..', 'data', 'recovery');
const PERSONS_RECOVERY_FILE = path.join(RECOVERY_DIR, 'rebuilt-persons-import.json');
const FALLBACK_PERSONS_RECOVERY_FILE = path.join(RECOVERY_DIR, 'browser-family-tree-persons-import.json');
const CMS_RECOVERY_FILE = path.join(RECOVERY_DIR, 'latest-recovered-data.json');
const NEWS_CACHE_FILE = path.join(__dirname, '..', 'data', 'news_cache.json');

const overwrite = process.env.BOOTSTRAP_OVERWRITE === 'true';

const parseDate = (value, fallback = new Date()) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const extractPersonsList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  return asArray(payload?.persons);
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toObjectId = (value) => {
  if (isValidObjectId(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return new mongoose.Types.ObjectId();
};

async function readJsonIfExists(filePath) {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }
  return fs.readJson(filePath);
}

async function maybeClearCollection(model, label) {
  if (!overwrite) return;
  await model.deleteMany({});
  console.log(`[bootstrap] Cleared ${label}`);
}

async function resolveBestPersonsPayload() {
  const candidates = [
    {
      label: 'rebuilt-persons-import.json',
      payload: await readJsonIfExists(PERSONS_RECOVERY_FILE)
    },
    {
      label: 'browser-family-tree-persons-import.json',
      payload: await readJsonIfExists(FALLBACK_PERSONS_RECOVERY_FILE)
    }
  ]
    .map((entry) => ({
      ...entry,
      count: extractPersonsList(entry.payload).length
    }))
    .filter((entry) => entry.count > 0);

  if (!candidates.length) {
    return { label: 'none', payload: null, count: 0 };
  }

  candidates.sort((a, b) => b.count - a.count);
  return candidates[0];
}

function mapPersons(payload) {
  const sourcePersons = extractPersonsList(payload);
  const idMap = new Map();

  sourcePersons.forEach((person) => {
    const sourceId = person.tempId || person._id;
    idMap.set(sourceId, toObjectId(sourceId));
  });

  return sourcePersons
    .filter((person) => person.fullName && person.fullName.trim())
    .map((person, index) => ({
      _id: idMap.get(person.tempId || person._id),
      fullName: person.fullName.trim(),
      nickname: person.nickname || '',
      fatherId: (person.fatherTempId || person.fatherId) ? idMap.get(person.fatherTempId || person.fatherId) || null : null,
      motherId: null,
      generation: Number.isFinite(person.generation) ? person.generation : 0,
      gender: ['male', 'female', 'unknown'].includes(person.gender) ? person.gender : 'unknown',
      birthDate: person.birthDate || '',
      deathDate: person.deathDate || '',
      isAlive: typeof person.isAlive === 'boolean' ? person.isAlive : true,
      showStatus: typeof person.showStatus === 'boolean' ? person.showStatus : false,
      birthPlace: person.birthPlace || '',
      currentResidence: person.currentResidence || '',
      occupation: person.occupation || '',
      biography: person.biography || '',
      notes: person.notes || '',
      siblingOrder: Number.isFinite(person.siblingOrder) ? person.siblingOrder : index,
      isRoot: Boolean(person.isRoot || !(person.fatherTempId || person.fatherId)),
      verification: {
        status: 'verified',
        source: 'recovery-bootstrap'
      },
      createdBy: 'recovery-bootstrap',
      lastModifiedBy: 'recovery-bootstrap',
      createdAt: parseDate(payload?.generatedAt, new Date()),
      updatedAt: new Date()
    }));
}

function mapNews(items) {
  return asArray(items)
    .filter((item) => (item.title || item.headline || '').trim())
    .map((item) => ({
      title: (item.title || item.headline || '').trim(),
      headline: (item.headline || item.title || '').trim(),
      content: item.content || item.summary || item.description || item.title || item.headline,
      summary: item.summary || item.description || '',
      author: item.author || item.reporter || 'منصة عائلة الشاعر',
      reporter: item.reporter || item.author || 'منصة عائلة الشاعر',
      image: item.image || item.coverImage || '',
      coverImage: item.coverImage || item.image || '',
      date: parseDate(item.date || item.pubDate),
      tags: asArray(item.tags),
      category: item.category || 'General',
      isArchived: Boolean(item.isArchived),
      archivedAt: item.archivedAt ? parseDate(item.archivedAt) : null,
      gallery: asArray(item.gallery),
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

function mapArticles(items) {
  return asArray(items)
    .filter((item) => (item.title || '').trim())
    .map((item) => ({
      title: item.title.trim(),
      author: item.author || 'منصة عائلة الشاعر',
      content: item.content || item.summary || item.title,
      summary: item.summary || '',
      image: item.image || item.coverImage || '',
      coverImage: item.coverImage || item.image || '',
      authorRole: item.authorRole || '',
      authorImage: item.authorImage || '',
      date: parseDate(item.date),
      tags: asArray(item.tags),
      gallery: asArray(item.gallery),
      readingTime: item.readingTime || undefined,
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

function mapConversations(items) {
  return asArray(items)
    .filter((item) => (item.title || '').trim())
    .map((item) => ({
      title: item.title.trim(),
      participants: asArray(item.participants).length ? asArray(item.participants) : ['منصة عائلة الشاعر'],
      content: item.content || item.summary || item.title,
      summary: item.summary || '',
      image: item.image || item.coverImage || '',
      coverImage: item.coverImage || item.image || '',
      moderator: item.moderator || '',
      moderatorRole: item.moderatorRole || '',
      moderatorImage: item.moderatorImage || '',
      date: parseDate(item.date),
      tags: asArray(item.tags),
      gallery: asArray(item.gallery),
      readingTime: item.readingTime || undefined,
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

function mapPalestine(items) {
  return asArray(items)
    .filter((item) => (item.title || '').trim())
    .map((item) => ({
      title: item.title.trim(),
      content: item.content || item.summary || item.title,
      image: item.image || '',
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

function mapGallery(items) {
  return asArray(items)
    .filter((item) => (item.title || '').trim())
    .map((item) => ({
      title: item.title.trim(),
      description: item.description || item.title,
      images: asArray(item.images),
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

function mapFamilyTicker(items) {
  return asArray(items)
    .filter((item) => (item.headline || '').trim())
    .map((item, index) => ({
      headline: item.headline.trim(),
      active: item.active !== false,
      order: Number.isFinite(item.order) ? item.order : index,
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

function mapPalestineTicker(items) {
  return asArray(items)
    .filter((item) => (item.headline || item.title || '').trim())
    .map((item, index) => ({
      headline: (item.headline || item.title).trim(),
      source: item.source || '',
      url: item.url || item.link || '',
      active: item.active !== false,
      order: Number.isFinite(item.order) ? item.order : index,
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

function mapHeroSlides(items) {
  return asArray(items)
    .filter((item) => (item.title || '').trim() && (item.image || '').trim())
    .map((item, index) => ({
      title: item.title.trim(),
      subtitle: item.subtitle || '',
      image: item.image,
      link: item.link || '',
      linkText: item.linkText || '',
      active: item.active !== false,
      order: Number.isFinite(item.order) ? item.order : index,
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt)
    }));
}

async function bootstrapPersons() {
  const existingCount = await Person.countDocuments();
  if (existingCount > 0 && !overwrite) {
    console.log(`[bootstrap] Persons already exist (${existingCount}), skipping`);
    return existingCount;
  }

  await maybeClearCollection(Person, 'persons');

  const personsSource = await resolveBestPersonsPayload();
  const personsPayload = personsSource.payload;

  const persons = mapPersons(personsPayload);
  if (!persons.length) {
    console.log('[bootstrap] No recovered persons found');
    return 0;
  }

  await Person.insertMany(persons, { ordered: false });
  console.log(`[bootstrap] Imported ${persons.length} persons from ${personsSource.label}`);
  return persons.length;
}

async function bootstrapCmsData() {
  const cmsPayload = await readJsonIfExists(CMS_RECOVERY_FILE);
  const serverDataFiles = cmsPayload?.recoveredData?.serverDataFiles || {};
  const cachedTickerPayload = await readJsonIfExists(NEWS_CACHE_FILE);

  const plan = [
    {
      model: News,
      label: 'news',
      existing: await News.countDocuments(),
      data: mapNews(serverDataFiles.news)
    },
    {
      model: Articles,
      label: 'articles',
      existing: await Articles.countDocuments(),
      data: mapArticles(serverDataFiles.articles)
    },
    {
      model: Conversations,
      label: 'conversations',
      existing: await Conversations.countDocuments(),
      data: mapConversations(serverDataFiles.conversations)
    },
    {
      model: Palestine,
      label: 'palestine',
      existing: await Palestine.countDocuments(),
      data: mapPalestine(serverDataFiles.palestine)
    },
    {
      model: Gallery,
      label: 'gallery',
      existing: await Gallery.countDocuments(),
      data: mapGallery(serverDataFiles.gallery)
    },
    {
      model: FamilyTickerNews,
      label: 'familyTickerNews',
      existing: await FamilyTickerNews.countDocuments(),
      data: mapFamilyTicker(serverDataFiles.familyTickerNews)
    },
    {
      model: PalestineTickerNews,
      label: 'palestineTickerNews',
      existing: await PalestineTickerNews.countDocuments(),
      data: mapPalestineTicker(cachedTickerPayload?.items || serverDataFiles.palestineTickerNews)
    },
    {
      model: HeroSlide,
      label: 'heroSlides',
      existing: await HeroSlide.countDocuments(),
      data: mapHeroSlides(serverDataFiles.heroSlides)
    }
  ];

  const summary = {};

  for (const entry of plan) {
    if (entry.existing > 0 && !overwrite) {
      console.log(`[bootstrap] ${entry.label} already exist (${entry.existing}), skipping`);
      summary[entry.label] = entry.existing;
      continue;
    }

    await maybeClearCollection(entry.model, entry.label);

    if (entry.data.length) {
      await entry.model.insertMany(entry.data, { ordered: false });
      console.log(`[bootstrap] Imported ${entry.data.length} ${entry.label}`);
      summary[entry.label] = entry.data.length;
    } else {
      console.log(`[bootstrap] No recovered ${entry.label} found`);
      summary[entry.label] = 0;
    }
  }

  const tickerSettingsCount = await TickerSettings.countDocuments();
  if (tickerSettingsCount === 0 || overwrite) {
    if (overwrite) {
      await maybeClearCollection(TickerSettings, 'tickerSettings');
    }
    await TickerSettings.create({
      palestineTickerEnabled: true,
      autoUpdateInterval: 60000,
      maxHeadlines: 10,
      newsApiProvider: 'gnews',
      updatedAt: new Date()
    });
    summary.tickerSettings = 1;
    console.log('[bootstrap] Created default ticker settings');
  } else {
    summary.tickerSettings = tickerSettingsCount;
  }

  return summary;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Set it in server/.env before running bootstrap.');
  }

  console.log(`[bootstrap] Starting recovered data bootstrap (${overwrite ? 'overwrite mode' : 'safe mode'})`);
  await connectDB();

  const personsCount = await bootstrapPersons();
  const cmsSummary = await bootstrapCmsData();

  console.log('[bootstrap] Completed successfully');
  console.log(
    JSON.stringify(
      {
        persons: personsCount,
        ...cmsSummary
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (error) => {
  console.error('[bootstrap] Failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error('[bootstrap] Disconnect warning:', disconnectError.message);
  }
  process.exit(1);
});

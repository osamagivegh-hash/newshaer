const path = require('path');
const fs = require('fs-extra');
const vm = require('vm');
const crypto = require('crypto');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SERVER_ROOT = path.join(PROJECT_ROOT, 'server');
const DATA_ROOT = path.join(SERVER_ROOT, 'data');
const RECOVERY_ROOT = path.join(DATA_ROOT, 'recovery');
const CLIENT_ROOT = path.join(PROJECT_ROOT, 'client');

require('dotenv').config({ path: path.join(SERVER_ROOT, '.env') });

function safeIsoStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sha1(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

async function safeReadJson(filePath) {
  try {
    if (!(await fs.pathExists(filePath))) {
      return { ok: false, missing: true, data: null };
    }

    const raw = await fs.readFile(filePath, 'utf8');
    return {
      ok: true,
      data: raw.trim() ? JSON.parse(raw) : null
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      data: null
    };
  }
}

async function loadStaticClientNews() {
  const filePath = path.join(CLIENT_ROOT, 'src', 'data', 'news.js');
  if (!(await fs.pathExists(filePath))) {
    return [];
  }

  const source = await fs.readFile(filePath, 'utf8');
  const transformed = `${source.replace(/export const /g, 'const ')}\nmodule.exports = { newsData };`;
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console: { log() {}, warn() {}, error() {} }
  };

  vm.runInNewContext(transformed, sandbox, {
    filename: 'client/src/data/news.js'
  });

  return Array.isArray(sandbox.module.exports.newsData)
    ? sandbox.module.exports.newsData
    : [];
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function normalizeRecord(item, type, sourceName) {
  if (!item || typeof item !== 'object') return null;

  const normalizedType = type === 'tickerNews' ? 'tickerNews' : type;
  const title = item.title || item.headline || item.name || '';
  const content = item.content || item.summary || item.description || '';
  const date = item.date || item.createdAt || item.updatedAt || item.publishedAt || null;
  const id = item.id || item._id || item.uuid || item.link || null;
  const source = item.source || item.author || item.reporter || item.publisher || null;

  return {
    type: normalizedType,
    id: id ? String(id) : null,
    title: title ? String(title) : null,
    content: content ? String(content) : null,
    date: date ? String(date) : null,
    author: item.author ? String(item.author) : null,
    reporter: item.reporter ? String(item.reporter) : null,
    source: source ? String(source) : null,
    category: item.category ? String(item.category) : null,
    url: item.url || item.link || null,
    image: item.image || item.coverImage || null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    raw: item,
    sourceRefs: [sourceName]
  };
}

function buildFingerprint(record) {
  if (record.id) {
    return `${record.type}:id:${record.id}`;
  }

  return `${record.type}:content:${sha1(
    [
      record.title || '',
      record.content || '',
      record.date || '',
      record.url || ''
    ].join('|')
  )}`;
}

function mergeRecord(existing, incoming) {
  const merged = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (
      merged[key] === null ||
      merged[key] === undefined ||
      merged[key] === '' ||
      (Array.isArray(merged[key]) && merged[key].length === 0)
    ) {
      merged[key] = value;
    }
  }

  const refs = new Set([...(existing.sourceRefs || []), ...(incoming.sourceRefs || [])]);
  merged.sourceRefs = Array.from(refs);
  return merged;
}

function addRecords(targetMap, items, type, sourceName) {
  let count = 0;

  for (const item of items) {
    const normalized = normalizeRecord(item, type, sourceName);
    if (!normalized || (!normalized.title && !normalized.content)) {
      continue;
    }

    const fingerprint = buildFingerprint(normalized);
    const existing = targetMap.get(fingerprint);
    targetMap.set(fingerprint, existing ? mergeRecord(existing, normalized) : normalized);
    count += 1;
  }

  return count;
}

function sortRecovered(items) {
  return items.sort((a, b) => {
    const first = a.date ? Date.parse(a.date) : 0;
    const second = b.date ? Date.parse(b.date) : 0;

    if (Number.isFinite(first) && Number.isFinite(second) && first !== second) {
      return second - first;
    }

    return (a.title || '').localeCompare(b.title || '');
  });
}

function summarizeByCategory(items) {
  const counts = {};

  for (const item of items) {
    const key = item.category || 'Uncategorized';
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => ({ category, count }));
}

async function readRecoveryCandidates() {
  if (!(await fs.pathExists(RECOVERY_ROOT))) return [];

  const names = await fs.readdir(RECOVERY_ROOT);
  return names
    .filter((name) => {
      if (!name.endsWith('.json')) return false;
      if (name === 'latest-recovered-data.json') return true;
      return /(article|articles|news)/i.test(name);
    })
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(RECOVERY_ROOT, name));
}

async function collectMongoData() {
  if (!process.argv.includes('--with-db')) {
    return {
      enabled: false,
      success: false,
      reason: 'MongoDB scan skipped (pass --with-db to enable).'
    };
  }

  let mongoose;
  try {
    mongoose = require('mongoose');
  } catch (error) {
    return { enabled: true, success: false, error: error.message };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return { enabled: true, success: false, error: 'MONGODB_URI is not set.' };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });

    const { News, Articles } = require('../models');
    const [news, articles] = await Promise.all([
      News.find({}).lean(),
      Articles.find({}).lean()
    ]);

    return {
      enabled: true,
      success: true,
      news,
      articles
    };
  } catch (error) {
    return {
      enabled: true,
      success: false,
      error: error.message
    };
  } finally {
    try {
      await mongoose.disconnect();
    } catch (_error) {
      // Ignore disconnect failures.
    }
  }
}

async function collectAllSources() {
  const sources = [];
  const articlesMap = new Map();
  const newsMap = new Map();
  const tickerMap = new Map();

  const directSources = [
    {
      name: 'server.data.articles',
      filePath: path.join(DATA_ROOT, 'articles.json'),
      type: 'articles'
    },
    {
      name: 'server.data.news',
      filePath: path.join(DATA_ROOT, 'news.json'),
      type: 'news'
    },
    {
      name: 'server.data.news_cache',
      filePath: path.join(DATA_ROOT, 'news_cache.json'),
      type: 'tickerNews'
    }
  ];

  for (const source of directSources) {
    const result = await safeReadJson(source.filePath);
    if (!result.ok) {
      sources.push({
        name: source.name,
        filePath: source.filePath,
        status: result.missing ? 'missing' : 'error',
        error: result.error || null,
        itemCounts: { articles: 0, news: 0, tickerNews: 0 }
      });
      continue;
    }

    const items = normalizeArray(result.data);
    const count =
      source.type === 'articles'
        ? addRecords(articlesMap, items, 'articles', source.name)
        : source.type === 'news'
          ? addRecords(newsMap, items, 'news', source.name)
          : addRecords(tickerMap, items, 'tickerNews', source.name);

    sources.push({
      name: source.name,
      filePath: source.filePath,
      status: 'ok',
      itemCounts: {
        articles: source.type === 'articles' ? count : 0,
        news: source.type === 'news' ? count : 0,
        tickerNews: source.type === 'tickerNews' ? count : 0
      }
    });
  }

  const staticNews = await loadStaticClientNews();
  addRecords(newsMap, staticNews, 'news', 'client.static.news');
  sources.push({
    name: 'client.static.news',
    filePath: path.join(CLIENT_ROOT, 'src', 'data', 'news.js'),
    status: 'ok',
    itemCounts: {
      articles: 0,
      news: staticNews.length,
      tickerNews: 0
    }
  });

  const recoveryFiles = await readRecoveryCandidates();
  for (const filePath of recoveryFiles) {
    const result = await safeReadJson(filePath);
    const sourceName = `recovery.${path.basename(filePath)}`;

    if (!result.ok) {
      sources.push({
        name: sourceName,
        filePath,
        status: result.missing ? 'missing' : 'error',
        error: result.error || null,
        itemCounts: { articles: 0, news: 0, tickerNews: 0 }
      });
      continue;
    }

    let articleCount = 0;
    let newsCount = 0;
    let tickerCount = 0;
    const payload = result.data;

    if (Array.isArray(payload?.recoveredData?.serverDataFiles?.articles)) {
      articleCount += addRecords(
        articlesMap,
        payload.recoveredData.serverDataFiles.articles,
        'articles',
        sourceName
      );
    }

    if (Array.isArray(payload?.recoveredData?.serverDataFiles?.news)) {
      newsCount += addRecords(
        newsMap,
        payload.recoveredData.serverDataFiles.news,
        'news',
        sourceName
      );
    }

    if (Array.isArray(payload?.recoveredData?.staticClientNews?.items)) {
      newsCount += addRecords(
        newsMap,
        payload.recoveredData.staticClientNews.items,
        'news',
        sourceName
      );
    }

    if (payload?.storageKey === 'articles') {
      const browserItems = normalizeArray(payload?.results).flatMap((entry) => normalizeArray(entry?.data));
      articleCount += addRecords(articlesMap, browserItems, 'articles', sourceName);
    }

    if (payload?.storageKey === 'news') {
      const browserItems = normalizeArray(payload?.results).flatMap((entry) => normalizeArray(entry?.data));
      newsCount += addRecords(newsMap, browserItems, 'news', sourceName);
    }

    if (Array.isArray(payload?.items) && /news_cache/i.test(path.basename(filePath))) {
      tickerCount += addRecords(tickerMap, payload.items, 'tickerNews', sourceName);
    }

    sources.push({
      name: sourceName,
      filePath,
      status: 'ok',
      itemCounts: {
        articles: articleCount,
        news: newsCount,
        tickerNews: tickerCount
      }
    });
  }

  const mongo = await collectMongoData();
  if (mongo.success) {
    const articleCount = addRecords(articlesMap, mongo.articles || [], 'articles', 'mongodb.articles');
    const newsCount = addRecords(newsMap, mongo.news || [], 'news', 'mongodb.news');
    sources.push({
      name: 'mongodb',
      filePath: null,
      status: 'ok',
      itemCounts: {
        articles: articleCount,
        news: newsCount,
        tickerNews: 0
      }
    });
  } else {
    sources.push({
      name: 'mongodb',
      filePath: null,
      status: mongo.enabled ? 'error' : 'skipped',
      error: mongo.error || mongo.reason || null,
      itemCounts: {
        articles: 0,
        news: 0,
        tickerNews: 0
      }
    });
  }

  const articles = sortRecovered(Array.from(articlesMap.values()));
  const news = sortRecovered(Array.from(newsMap.values()));
  const tickerNews = sortRecovered(Array.from(tickerMap.values()));

  return {
    generatedAt: new Date().toISOString(),
    sources,
    summary: {
      uniqueArticles: articles.length,
      uniqueNews: news.length,
      uniqueTickerNews: tickerNews.length,
      newsByCategory: summarizeByCategory(news)
    },
    recovered: {
      articles,
      news,
      tickerNews
    }
  };
}

async function writeRecoveryReport(report) {
  await fs.ensureDir(RECOVERY_ROOT);

  const outputPath = path.join(
    RECOVERY_ROOT,
    `articles-news-recovery-${safeIsoStamp()}.json`
  );
  const latestPath = path.join(RECOVERY_ROOT, 'latest-articles-news-recovery.json');

  await fs.writeJson(outputPath, report, { spaces: 2 });
  await fs.writeJson(latestPath, report, { spaces: 2 });

  return { outputPath, latestPath };
}

async function main() {
  const report = await collectAllSources();
  const { outputPath, latestPath } = await writeRecoveryReport(report);

  console.log(JSON.stringify({
    summary: report.summary,
    outputPath,
    latestPath,
    sources: report.sources
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Article/news recovery failed:', error);
    process.exit(1);
  });
}

module.exports = {
  collectAllSources,
  writeRecoveryReport
};

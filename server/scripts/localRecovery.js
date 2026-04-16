/**
 * Local-only recovery toolkit.
 *
 * Collects recoverable data from the project without requiring MongoDB or Atlas.
 */

const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');
const vm = require('vm');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SERVER_ROOT = path.join(PROJECT_ROOT, 'server');
const DATA_ROOT = path.join(SERVER_ROOT, 'data');
const LOGS_ROOT = path.join(SERVER_ROOT, 'logs');
const UPLOADS_ROOT = path.join(SERVER_ROOT, 'uploads');
const CLIENT_ROOT = path.join(PROJECT_ROOT, 'client');
const RECOVERY_ROOT = path.join(DATA_ROOT, 'recovery');

const RECOVERY_FILE_EXTENSIONS = new Set([
  '.json', '.bson', '.archive', '.gz', '.log', '.txt', '.csv', '.xlsx', '.bak'
]);

function safeIsoStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sha256String(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function collectProjectFileManifest(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!RECOVERY_FILE_EXTENSIONS.has(ext)) continue;

      const stat = await fs.stat(fullPath);
      files.push({
        relativePath: path.relative(PROJECT_ROOT, fullPath),
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString()
      });
    }
  }

  await walk(rootDir);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function collectServerDataFiles() {
  const names = (await fs.readdir(DATA_ROOT))
    .filter(name => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));

  const datasets = {};
  const manifest = [];

  for (const name of names) {
    const fullPath = path.join(DATA_ROOT, name);
    const raw = await fs.readFile(fullPath, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : null;
    const stat = await fs.stat(fullPath);

    datasets[path.basename(name, '.json')] = parsed;
    manifest.push({
      fileName: name,
      relativePath: path.relative(PROJECT_ROOT, fullPath),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      sha256: await hashFile(fullPath)
    });
  }

  return { datasets, manifest };
}

async function collectStaticClientNews() {
  const filePath = path.join(CLIENT_ROOT, 'src', 'data', 'news.js');
  if (!(await fs.pathExists(filePath))) {
    return { items: [], meta: { present: false } };
  }

  const source = await fs.readFile(filePath, 'utf8');
  const transformed = `${source.replace(/export const /g, 'const ')}\nmodule.exports = { newsData };`;
  const sandbox = {
    module: { exports: {} },
    exports: {},
    console: { log() {}, warn() {}, error() {} }
  };

  vm.runInNewContext(transformed, sandbox, { filename: 'client/src/data/news.js' });
  const items = Array.isArray(sandbox.module.exports.newsData) ? sandbox.module.exports.newsData : [];

  return {
    items,
    meta: {
      present: true,
      relativePath: path.relative(PROJECT_ROOT, filePath),
      itemCount: items.length,
      sha256: sha256String(source)
    }
  };
}

function rowValues(values) {
  return values.slice(1);
}

async function collectExcelExports() {
  const filePaths = [
    path.join(PROJECT_ROOT, 'alshaer_family_names.xlsx'),
    path.join(PROJECT_ROOT, 'alshaer_full_lineage.xlsx')
  ];
  const recovered = [];

  for (const filePath of filePaths) {
    if (!(await fs.pathExists(filePath))) continue;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const stat = await fs.stat(filePath);

    recovered.push({
      fileName: path.basename(filePath),
      relativePath: path.relative(PROJECT_ROOT, filePath),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      sha256: await hashFile(filePath),
      worksheets: workbook.worksheets.map(worksheet => {
        const headers = rowValues(worksheet.getRow(1).values).map(value =>
          value === null || value === undefined ? '' : String(value).trim()
        );
        const rows = [];

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const values = rowValues(row.values);
          if (!values.some(value => value !== null && value !== undefined && String(value).trim() !== '')) {
            return;
          }

          const entry = {};
          values.forEach((value, index) => {
            const key = headers[index] || `column_${index + 1}`;
            entry[key] = value instanceof Date ? value.toISOString() : value;
          });
          rows.push(entry);
        });

        return {
          name: worksheet.name,
          headers,
          rowCount: rows.length,
          rows
        };
      })
    });
  }

  return recovered;
}

async function collectUploads() {
  if (!(await fs.pathExists(UPLOADS_ROOT))) return [];

  const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true });
  const uploads = [];

  for (const entry of entries) {
    if (!entry.isFile() || entry.name === '.gitkeep') continue;
    const fullPath = path.join(UPLOADS_ROOT, entry.name);
    const stat = await fs.stat(fullPath);
    uploads.push({
      fileName: entry.name,
      relativePath: path.relative(PROJECT_ROOT, fullPath),
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      sha256: await hashFile(fullPath)
    });
  }

  return uploads;
}

function summarizeRequests(requests) {
  const byMethod = {};
  const byStatus = {};
  const byUrl = {};

  for (const request of requests) {
    byMethod[request.method] = (byMethod[request.method] || 0) + 1;
    byStatus[String(request.status)] = (byStatus[String(request.status)] || 0) + 1;
    byUrl[request.url] = (byUrl[request.url] || 0) + 1;
  }

  return { byMethod, byStatus, byUrl };
}

async function collectLogs() {
  const appLogPath = path.join(LOGS_ROOT, 'app.log');
  const errorLogPath = path.join(LOGS_ROOT, 'error.log');
  const auditLogPath = path.join(LOGS_ROOT, 'audit.log');
  const logs = {
    app: { summary: {}, mutableRequests: [], notableEvents: [] },
    error: [],
    audit: []
  };

  if (await fs.pathExists(appLogPath)) {
    const lines = (await fs.readFile(appLogPath, 'utf8')).split(/\r?\n/).filter(Boolean);
    const requests = [];
    const mutableRequests = [];
    const notableEvents = [];

    for (const line of lines) {
      const requestMatch = line.match(/Request (\{.*\})$/);
      if (requestMatch) {
        try {
          const parsed = JSON.parse(requestMatch[1]);
          requests.push(parsed);
          if (
            parsed.method !== 'GET' ||
            parsed.status >= 400 ||
            /upload|hero-slides|ticker|comments|contacts|persons|login|verify/i.test(parsed.url)
          ) {
            mutableRequests.push(parsed);
          }
        } catch (error) {
          notableEvents.push({ type: 'parse-error', raw: line, error: error.message });
        }
        continue;
      }

      if (/Fetched all sections data|Cache|upload|backup/i.test(line)) {
        notableEvents.push({ type: 'raw', raw: line });
      }
    }

    logs.app.summary = summarizeRequests(requests);
    logs.app.mutableRequests = mutableRequests;
    logs.app.notableEvents = notableEvents.slice(0, 200);
  }

  if (await fs.pathExists(errorLogPath)) {
    const lines = (await fs.readFile(errorLogPath, 'utf8')).split(/\r?\n/).filter(Boolean);
    logs.error = lines.map(line => {
      const jsonMatch = line.match(/(\{.*\})$/);
      if (!jsonMatch) return { raw: line };
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (_error) {
        return { raw: line };
      }
    });
  }

  if (await fs.pathExists(auditLogPath)) {
    const lines = (await fs.readFile(auditLogPath, 'utf8')).split(/\r?\n/).filter(Boolean);
    logs.audit = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (_error) {
        return { raw: line };
      }
    });
  }

  return logs;
}

function buildBackupSystemAnalysis() {
  return {
    storageLocation: 'MongoDB collection `backups`',
    collectionName: 'backups',
    extractionQuery: {
      completedBackups: { status: 'completed' },
      latestFamilyTreeBackup: { backupType: 'family-tree', status: 'completed' },
      latestCmsBackup: { backupType: 'cms', status: 'completed' }
    },
    backupTypes: {
      familyTree: ['persons'],
      cms: [
        'news',
        'articles',
        'conversations',
        'palestine',
        'gallery',
        'contacts',
        'comments',
        'familyTickerNews',
        'palestineTickerNews',
        'tickerSettings',
        'heroSlides'
      ]
    },
    retentionDefaults: {
      intervalHours: 48,
      maxBackupsToKeep: 20
    },
    note: 'These are logical application backups defined in BackupService.js.'
  };
}

function buildRebuildGuide(bundlePath) {
  return {
    bundlePath: path.relative(PROJECT_ROOT, bundlePath),
    browserCacheKeys: ['familyTreeData_v3', 'familyTreeVersion', 'familyTreeTimestamp'],
    collectionImports: {
      news: 'mongoimport --uri "<TARGET_URI>" --db <DB_NAME> --collection news --file server/data/news.json --jsonArray',
      articles: 'mongoimport --uri "<TARGET_URI>" --db <DB_NAME> --collection articles --file server/data/articles.json --jsonArray',
      conversations: 'mongoimport --uri "<TARGET_URI>" --db <DB_NAME> --collection conversations --file server/data/conversations.json --jsonArray',
      palestines: 'mongoimport --uri "<TARGET_URI>" --db <DB_NAME> --collection palestines --file server/data/palestine.json --jsonArray',
      galleries: 'mongoimport --uri "<TARGET_URI>" --db <DB_NAME> --collection galleries --file server/data/gallery.json --jsonArray',
      contacts: 'mongoimport --uri "<TARGET_URI>" --db <DB_NAME> --collection contacts --file server/data/contacts.json --jsonArray'
    },
    notes: [
      'server/data/familyTree.json is a legacy generation summary, not a direct persons collection export.',
      'Use the Excel exports and browser cache export to reconstruct the live family tree.',
      'Restore server/uploads files alongside gallery or content records that reference them.'
    ]
  };
}

async function collectRecoveryData(trigger = 'manual') {
  const [serverData, staticClientNews, excelExports, uploads, logs, projectFileManifest] = await Promise.all([
    collectServerDataFiles(),
    collectStaticClientNews(),
    collectExcelExports(),
    collectUploads(),
    collectLogs(),
    collectProjectFileManifest(PROJECT_ROOT)
  ]);

  return {
    generatedAt: new Date().toISOString(),
    trigger,
    environment: {
      projectRoot: PROJECT_ROOT,
      serverRoot: SERVER_ROOT,
      nodeVersion: process.version
    },
    backupSystemAnalysis: buildBackupSystemAnalysis(),
    recoveredData: {
      serverDataFiles: serverData.datasets,
      serverDataManifest: serverData.manifest,
      staticClientNews,
      excelExports,
      uploads,
      logs,
      projectFileManifest,
      browserCache: {
        keys: {
          data: 'familyTreeData_v3',
          version: 'familyTreeVersion',
          timestamp: 'familyTreeTimestamp'
        },
        extractorScript: path.relative(PROJECT_ROOT, path.join(__dirname, 'browserCacheExtractor.js'))
      }
    }
  };
}

async function writeRecoveryBundle(bundle) {
  await fs.ensureDir(RECOVERY_ROOT);
  const fileName = `recovered-data-${safeIsoStamp()}.json`;
  const outputPath = path.join(RECOVERY_ROOT, fileName);
  bundle.rebuildGuide = buildRebuildGuide(outputPath);

  await fs.writeJson(outputPath, bundle, { spaces: 2 });

  const latestPath = path.join(RECOVERY_ROOT, 'latest-recovered-data.json');
  await fs.writeJson(latestPath, bundle, { spaces: 2 });

  return { outputPath, latestPath };
}

async function runLocalRecovery(trigger = 'manual') {
  const bundle = await collectRecoveryData(trigger);
  const paths = await writeRecoveryBundle(bundle);
  return { bundle, ...paths };
}

async function main() {
  const trigger = process.argv[2] || 'manual';
  const { outputPath, latestPath } = await runLocalRecovery(trigger);
  console.log('Local recovery bundle created successfully.');
  console.log(`Primary bundle: ${outputPath}`);
  console.log(`Latest bundle: ${latestPath}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Local recovery failed:', error);
    process.exit(1);
  });
}

module.exports = {
  collectRecoveryData,
  writeRecoveryBundle,
  runLocalRecovery
};

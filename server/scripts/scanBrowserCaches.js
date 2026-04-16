const fs = require('fs');
const path = require('path');

const DEFAULT_PATTERNS = [
  'familyTreeData_v3',
  '/api/persons/tree',
  '/api/persons/stats',
  '/api/persons?',
  'fullLineageName',
  '"fullName"',
  '"fatherId"',
  'alshaerf.com'
];

const DEFAULT_DIRS = [
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default', 'Network'),
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default', 'Service Worker'),
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default', 'IndexedDB'),
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data', 'Default', 'Network'),
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data', 'Default', 'Service Worker'),
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data', 'Default', 'IndexedDB')
];

function walkFiles(dirPath, files = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function findPatternsInBuffer(buffer, patterns) {
  const text = buffer.toString('utf8');
  const matches = [];

  for (const pattern of patterns) {
    const index = text.indexOf(pattern);
    if (index >= 0) {
      matches.push({
        pattern,
        index,
        snippet: text.slice(Math.max(0, index - 200), index + 600)
      });
    }
  }

  return matches;
}

function scanDir(dirPath, patterns, maxHits) {
  const hits = [];
  const files = walkFiles(dirPath);

  for (const filePath of files) {
    if (hits.length >= maxHits) {
      break;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.size === 0 || stat.size > 50 * 1024 * 1024) {
        continue;
      }

      const buffer = fs.readFileSync(filePath);
      const matches = findPatternsInBuffer(buffer, patterns);

      if (matches.length > 0) {
        hits.push({
          filePath,
          size: stat.size,
          matches
        });
      }
    } catch (error) {
      hits.push({
        filePath,
        error: error.message
      });
    }
  }

  return hits;
}

function main() {
  const patterns = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_PATTERNS;
  const maxHits = 20;
  const results = [];

  for (const dirPath of DEFAULT_DIRS) {
    if (!fs.existsSync(dirPath)) {
      continue;
    }

    const hits = scanDir(dirPath, patterns, maxHits);
    results.push({
      dirPath,
      hitCount: hits.length,
      hits
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
  main();
}

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'data',
  'recovery',
  'forensic-news-text-scan.json'
);

const ROOT_DIRS = [
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default'),
  path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data', 'Default')
];

const PATTERNS = [
  'احتفال عائلة الشاعر بالعيد',
  'زواج محمد الشاعر',
  'افتتاح مركز ثقافي فلسطيني جديد في ديترويت بمبادرة من عائلة الشاعر',
  'أخبار العائلة',
  'إنجازات',
  'مشاريع',
  'headline',
  'summary',
  '/api/sections',
  '/api/news'
];

function walk(dirPath, files = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (/Code Cache|GPUCache|ShaderCache|GrShaderCache/i.test(entry.name)) continue;
      walk(fullPath, files);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function searchText(text, pattern) {
  const index = text.indexOf(pattern);
  if (index === -1) return null;

  return {
    pattern,
    index,
    snippet: text.slice(Math.max(0, index - 180), index + 320)
  };
}

function scanFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0 || stat.size > 10 * 1024 * 1024) return null;

    const buffer = fs.readFileSync(filePath);
    const texts = [
      { encoding: 'utf8', value: buffer.toString('utf8') },
      ...(buffer.length % 2 === 0 ? [{ encoding: 'utf16le', value: buffer.toString('utf16le') }] : [])
    ];

    const matches = [];
    for (const text of texts) {
      for (const pattern of PATTERNS) {
        const hit = searchText(text.value, pattern);
        if (hit) {
          matches.push({
            encoding: text.encoding,
            ...hit
          });
        }
      }
    }

    if (matches.length === 0) return null;
    return {
      filePath,
      matches: matches.slice(0, 20)
    };
  } catch (error) {
    return {
      filePath,
      error: error.message
    };
  }
}

function main() {
  const hits = [];

  for (const rootDir of ROOT_DIRS) {
    const files = walk(rootDir);
    for (const filePath of files) {
      const result = scanFile(filePath);
      if (result) hits.push(result);
      if (hits.length >= 50) break;
    }
    if (hits.length >= 50) break;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    patterns: PATTERNS,
    hitCount: hits.length,
    hits
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(JSON.stringify({ outputPath: OUTPUT_PATH, hitCount: hits.length }, null, 2));
}

if (require.main === module) {
  main();
}

const fs = require('fs');
const path = require('path');

const RECOVERY_DIR = path.join(__dirname, '..', 'data', 'recovery');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function findUtf16JsonStart(buffer, searchFrom, searchTo) {
  for (let i = searchFrom; i < searchTo - 3; i += 1) {
    if (buffer[i] === 0x7b && buffer[i + 1] === 0x00) {
      return i;
    }
    if (buffer[i] === 0x5b && buffer[i + 1] === 0x00) {
      return i;
    }
  }

  return -1;
}

function extractBalancedJson(decodedText) {
  const start = decodedText.search(/[\[{]/);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < decodedText.length; i += 1) {
    const char = decodedText[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return decodedText.slice(start, i + 1);
      }
    }
  }

  return null;
}

function tryParseJsonCandidate(buffer, startOffset) {
  const maxBytes = Math.min(buffer.length - startOffset, 2 * 1024 * 1024);
  const evenBytes = maxBytes - (maxBytes % 2);
  const decoded = buffer.slice(startOffset, startOffset + evenBytes).toString('utf16le');
  const candidate = extractBalancedJson(decoded);

  if (!candidate) {
    return null;
  }

  try {
    return JSON.parse(candidate);
  } catch (error) {
    return null;
  }
}

function extractKeyFromFile(filePath, storageKey) {
  const buffer = fs.readFileSync(filePath);
  const keyBuffer = Buffer.from(storageKey, 'utf8');
  const results = [];
  let offset = 0;

  while (offset < buffer.length) {
    const matchIndex = buffer.indexOf(keyBuffer, offset);
    if (matchIndex === -1) {
      break;
    }

    const searchFrom = matchIndex + keyBuffer.length;
    const searchTo = Math.min(buffer.length, searchFrom + 4096);
    const jsonStart = findUtf16JsonStart(buffer, searchFrom, searchTo);

    if (jsonStart !== -1) {
      const parsed = tryParseJsonCandidate(buffer, jsonStart);
      if (parsed) {
        results.push({
          filePath,
          matchIndex,
          jsonStart,
          data: parsed
        });
      }
    }

    offset = matchIndex + keyBuffer.length;
  }

  return results;
}

function getLevelDbFiles(dirPath) {
  return fs.readdirSync(dirPath)
    .filter((name) => name.endsWith('.ldb') || name.endsWith('.log'))
    .map((name) => path.join(dirPath, name));
}

function runExtraction(baseDir, storageKey) {
  const recovered = [];

  if (!fs.existsSync(baseDir)) {
    return recovered;
  }

  for (const filePath of getLevelDbFiles(baseDir)) {
    try {
      recovered.push(...extractKeyFromFile(filePath, storageKey));
    } catch (error) {
      recovered.push({
        filePath,
        error: error.message
      });
    }
  }

  return recovered;
}

function saveResults(browserName, storageKey, results) {
  ensureDir(RECOVERY_DIR);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeStorageKey = storageKey.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const outputPath = path.join(
    RECOVERY_DIR,
    `${browserName}-${safeStorageKey}-${timestamp}.json`
  );

  fs.writeFileSync(outputPath, JSON.stringify({
    browserName,
    storageKey,
    recoveredAt: new Date().toISOString(),
    recoveredCount: results.filter((result) => result.data).length,
    results
  }, null, 2));

  return outputPath;
}

function main() {
  const storageKey = process.argv[2] || 'familyTreeData_v3';
  const targets = [
    {
      browserName: 'chrome',
      dirPath: path.join(
        process.env.LOCALAPPDATA || '',
        'Google',
        'Chrome',
        'User Data',
        'Default',
        'Local Storage',
        'leveldb'
      )
    },
    {
      browserName: 'edge',
      dirPath: path.join(
        process.env.LOCALAPPDATA || '',
        'Microsoft',
        'Edge',
        'User Data',
        'Default',
        'Local Storage',
        'leveldb'
      )
    }
  ];

  const summary = [];

  for (const target of targets) {
    const results = runExtraction(target.dirPath, storageKey);
    const outputPath = saveResults(target.browserName, storageKey, results);
    const recoveredCount = results.filter((result) => result.data).length;

    summary.push({
      browserName: target.browserName,
      dirPath: target.dirPath,
      outputPath,
      recoveredCount
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  runExtraction,
  extractKeyFromFile
};

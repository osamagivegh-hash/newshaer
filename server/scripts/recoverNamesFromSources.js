const fs = require('fs');
const path = require('path');

const RECOVERY_BUNDLE_PATH = path.join(__dirname, '..', 'data', 'recovery', 'latest-recovered-data.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'recovery', 'recovered-family-names.json');

function normalizeValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function loadRecoveryBundle() {
  return JSON.parse(fs.readFileSync(RECOVERY_BUNDLE_PATH, 'utf8'));
}

function getExcelSheet(bundle, fileName, sheetName) {
  const excelFile = (bundle.recoveredData?.excelExports || []).find((file) => file.fileName === fileName);
  if (!excelFile) {
    return null;
  }

  return (excelFile.worksheets || []).find((sheet) => sheet.name === sheetName) || null;
}

function buildRecoveredNames(bundle) {
  const recovered = [];

  const familyNamesSheet = getExcelSheet(bundle, 'alshaer_family_names.xlsx', 'أسماء العائلة');
  const lineageSheet = getExcelSheet(bundle, 'alshaer_full_lineage.xlsx', 'سلسلة النسب الكاملة');

  if (familyNamesSheet) {
    for (const row of familyNamesSheet.rows || []) {
      const fullName = normalizeValue(row['الاسم الكامل']);
      if (!fullName) {
        continue;
      }

      recovered.push({
        source: 'alshaer_family_names.xlsx',
        sourceSheet: 'أسماء العائلة',
        sourceRow: row['#'] || null,
        displayName: fullName,
        identityKey: normalizeValue(`${fullName}|${row['الجيل'] || ''}|${row['اللقب'] || ''}|${row['الجنس'] || ''}`),
        generation: row['الجيل'] ?? null,
        nickname: normalizeValue(row['اللقب']),
        gender: normalizeValue(row['الجنس']),
        birthDate: normalizeValue(row['تاريخ الميلاد']),
        birthPlace: normalizeValue(row['مكان الميلاد']),
        currentResidence: normalizeValue(row['مكان الإقامة الحالي']),
        occupation: normalizeValue(row['المهنة']),
        notes: normalizeValue(row['ملاحظات'])
      });
    }
  }

  if (lineageSheet) {
    for (const row of lineageSheet.rows || []) {
      const name = normalizeValue(row['الاسم']);
      const lineage = normalizeValue(row['سلسلة النسب الكاملة']);
      if (!name && !lineage) {
        continue;
      }

      recovered.push({
        source: 'alshaer_full_lineage.xlsx',
        sourceSheet: 'سلسلة النسب الكاملة',
        sourceRow: row['#'] || null,
        displayName: name || lineage,
        identityKey: lineage || name,
        generation: row['الجيل'] ?? null,
        fullLineage: lineage
      });
    }
  }

  return recovered;
}

function summarize(records) {
  const bySource = {};

  for (const record of records) {
    bySource[record.source] = (bySource[record.source] || 0) + 1;
  }

  const exactIdentityCount = new Set(records.map((record) => record.identityKey).filter(Boolean)).size;
  const displayNameCount = new Set(records.map((record) => record.displayName).filter(Boolean)).size;

  return {
    totalRecoveredRecords: records.length,
    exactIdentityCount,
    distinctDisplayNames: displayNameCount,
    bySource
  };
}

function main() {
  const bundle = loadRecoveryBundle();
  const records = buildRecoveredNames(bundle);
  const payload = {
    generatedAt: new Date().toISOString(),
    basedOn: RECOVERY_BUNDLE_PATH,
    summary: summarize(records),
    records
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({
    outputPath: OUTPUT_PATH,
    summary: payload.summary
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  buildRecoveredNames,
  summarize
};

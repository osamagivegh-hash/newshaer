const fs = require('fs');
const path = require('path');

const RECOVERY_DIR = path.join(__dirname, '..', 'data', 'recovery');
const RECOVERED_PATH = path.join(RECOVERY_DIR, 'recovered-family-names.json');
const REBUILT_PATH = path.join(RECOVERY_DIR, 'rebuilt-persons-import.json');
const OUTPUT_PATH = path.join(RECOVERY_DIR, 'family-tree-coverage-report.json');

function normalizeArabic(value) {
  return (value || '')
    .toString()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBucketKey(generation, name) {
  return `${Number(generation) || 0}||${normalizeArabic(name)}`;
}

function incrementBucket(map, key, record) {
  const bucket = map.get(key) || { count: 0, records: [] };
  bucket.count += 1;

  if (record && bucket.records.length < 10) {
    bucket.records.push(record);
  }

  map.set(key, bucket);
}

function main() {
  const recovered = JSON.parse(fs.readFileSync(RECOVERED_PATH, 'utf8'));
  const rebuilt = JSON.parse(fs.readFileSync(REBUILT_PATH, 'utf8'));

  const recoveredRecords = recovered.records || [];
  const rebuiltPersons = rebuilt.persons || [];

  const familyNameRows = recoveredRecords.filter(
    (record) => record.source === 'alshaer_family_names.xlsx'
  );
  const lineageRows = recoveredRecords.filter(
    (record) => record.source === 'alshaer_full_lineage.xlsx'
  );

  const familyBuckets = new Map();
  const treeBuckets = new Map();

  for (const row of familyNameRows) {
    incrementBucket(familyBuckets, buildBucketKey(row.generation, row.displayName), {
      sourceRow: row.sourceRow,
      displayName: row.displayName,
      generation: Number(row.generation) || 0,
      gender: row.gender || '',
      notes: row.notes || ''
    });
  }

  for (const person of rebuiltPersons) {
    incrementBucket(treeBuckets, buildBucketKey(person.generation, person.fullName), {
      tempId: person.tempId,
      fullName: person.fullName,
      generation: Number(person.generation) || 0,
      fatherName: person.fatherName || null,
      ancestryPath: person.ancestryPath || []
    });
  }

  const conservativeMissing = [];

  for (const [key, familyBucket] of familyBuckets.entries()) {
    const treeBucket = treeBuckets.get(key);
    const treeCount = treeBucket ? treeBucket.count : 0;

    if (familyBucket.count > treeCount) {
      const [generation, normalizedName] = key.split('||');
      conservativeMissing.push({
        generation: Number(generation),
        normalizedName,
        familyCount: familyBucket.count,
        treeCount,
        missingCount: familyBucket.count - treeCount,
        sourceRows: familyBucket.records
      });
    }
  }

  conservativeMissing.sort(
    (a, b) => a.generation - b.generation
      || b.missingCount - a.missingCount
      || a.normalizedName.localeCompare(b.normalizedName, 'ar')
  );

  const byGeneration = {};
  for (const item of conservativeMissing) {
    const generationKey = String(item.generation);
    if (!byGeneration[generationKey]) {
      byGeneration[generationKey] = {
        missingCount: 0,
        buckets: []
      };
    }

    byGeneration[generationKey].missingCount += item.missingCount;
    byGeneration[generationKey].buckets.push(item);
  }

  const treeGenerationCounts = rebuiltPersons.reduce((acc, person) => {
    const generation = Number(person.generation) || 0;
    acc[generation] = (acc[generation] || 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRecoveredRows: recoveredRecords.length,
      totalFamilyNameRows: familyNameRows.length,
      totalLineageRows: lineageRows.length,
      totalRebuiltTreePersons: rebuiltPersons.length,
      maxTreeGeneration: Math.max(0, ...rebuiltPersons.map((person) => Number(person.generation) || 0)),
      treeGenerationCounts,
      conservativeMissingBucketCount: conservativeMissing.length,
      conservativeMissingCount: conservativeMissing.reduce((sum, item) => sum + item.missingCount, 0)
    },
    notes: [
      'هذا التقرير محافظ: يعتمد فقط على فرق العد بين ملف أسماء العائلة وبين الشجرة الحالية داخل نفس الجيل ونفس الاسم بعد تطبيع بسيط.',
      'الأسماء المتكررة طبيعيّة، لذلك لا يتم اعتبار الاسم مفقودًا إلا إذا كان عدد ظهوره في ملف الأسماء أكبر من عدد ظهوره في الشجرة الحالية داخل الجيل نفسه.',
      'الأجيال 10 و11 و12 موجودة بالفعل في الشجرة الحالية، ولم تظهر فجوات محافظة فيها من ملف الأسماء.'
    ],
    conservativeMissingByGeneration: byGeneration
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    outputPath: OUTPUT_PATH,
    summary: report.summary,
    conservativeMissingByGeneration: Object.fromEntries(
      Object.entries(byGeneration).map(([generation, value]) => [
        generation,
        {
          missingCount: value.missingCount,
          buckets: value.buckets.map((bucket) => ({
            normalizedName: bucket.normalizedName,
            familyCount: bucket.familyCount,
            treeCount: bucket.treeCount,
            missingCount: bucket.missingCount
          }))
        }
      ])
    )
  }, null, 2));
}

if (require.main === module) {
  main();
}

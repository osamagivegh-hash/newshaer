const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RECOVERY_DIR = path.join(__dirname, '..', 'data', 'recovery');
const NAMES_PATH = path.join(RECOVERY_DIR, 'recovered-family-names.json');
const LINEAGE_TREE_PATH = path.join(RECOVERY_DIR, 'family-lineage-tree.json');
const OUTPUT_TREE_PATH = path.join(RECOVERY_DIR, 'rebuilt-family-tree.json');
const OUTPUT_PERSONS_PATH = path.join(RECOVERY_DIR, 'rebuilt-persons-import.json');

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function makeTempId(value) {
  return crypto.createHash('sha1').update(normalize(value)).digest('hex').slice(0, 24);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildFamilyMetadataIndex(namesPayload) {
  const familyRows = (namesPayload.records || []).filter(
    (record) => record.source === 'alshaer_family_names.xlsx'
  );

  const grouped = new Map();

  for (const record of familyRows) {
    const key = `${record.generation ?? ''}::${normalize(record.displayName)}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(record);
  }

  return grouped;
}

function buildLineageFrequencyMap(lineageTreePayload) {
  const frequencies = new Map();

  function visit(node) {
    const key = `${node.generation ?? ''}::${normalize(node.name)}`;
    frequencies.set(key, (frequencies.get(key) || 0) + 1);
    for (const child of node.children || []) {
      visit(child);
    }
  }

  for (const root of lineageTreePayload.roots || []) {
    visit(root);
  }

  return frequencies;
}

function inferConfidence(lineageCount, metadataCount, matchedRecord) {
  if (!matchedRecord) {
    return 'none';
  }

  if (lineageCount === 1 && metadataCount === 1) {
    return 'high';
  }

  if (lineageCount === metadataCount) {
    return 'medium';
  }

  return 'low';
}

function mergeMetadata(lineageNode, metadataIndex, lineageFrequencyMap, matchUsage) {
  const key = `${lineageNode.generation ?? ''}::${normalize(lineageNode.name)}`;
  const candidates = metadataIndex.get(key) || [];
  const usage = matchUsage.get(key) || 0;
  const matchedRecord = candidates[usage] || null;

  if (matchedRecord) {
    matchUsage.set(key, usage + 1);
  }

  const confidence = inferConfidence(
    lineageFrequencyMap.get(key) || 0,
    candidates.length,
    matchedRecord
  );

  return {
    matchedRecord,
    confidence,
    candidateCount: candidates.length
  };
}

function createSyntheticRoot() {
  const rootId = 'محمد الشاعر';
  return {
    id: rootId,
    name: 'محمد الشاعر',
    generation: 0,
    fullLineage: rootId,
    sourceRow: null,
    parentId: null,
    children: []
  };
}

function buildReconstructedTree(namesPayload, lineageTreePayload) {
  const metadataIndex = buildFamilyMetadataIndex(namesPayload);
  const lineageFrequencyMap = buildLineageFrequencyMap(lineageTreePayload);
  const matchUsage = new Map();
  const seenLineageIdentities = new Set();
  const root = createSyntheticRoot();
  const importRecords = [];
  const stats = {
    totalNodes: 0,
    nodesWithMetadata: 0,
    highConfidenceMatches: 0,
    mediumConfidenceMatches: 0,
    lowConfidenceMatches: 0,
    unmatchedNodes: 0,
    duplicateLineageNodesSkipped: 0
  };

  function visit(node, parentTempId, ancestryNames) {
    const lineageNode = deepClone(node);

    if (seenLineageIdentities.has(lineageNode.id)) {
      stats.duplicateLineageNodesSkipped += 1;
      return null;
    }

    seenLineageIdentities.add(lineageNode.id);
    const { matchedRecord, confidence, candidateCount } = mergeMetadata(
      lineageNode,
      metadataIndex,
      lineageFrequencyMap,
      matchUsage
    );

    const tempId = makeTempId(lineageNode.id);
    const nextAncestry = [...ancestryNames, lineageNode.name];

    const rebuiltNode = {
      tempId,
      name: lineageNode.name,
      lineageIdentity: lineageNode.id,
      fullLineage: lineageNode.fullLineage,
      generation: lineageNode.generation,
      sourceRow: lineageNode.sourceRow,
      parentTempId,
      relation: {
        fatherLineageIdentity: lineageNode.parentId,
        fatherName: ancestryNames[ancestryNames.length - 1] || null,
        childrenCount: (lineageNode.children || []).length
      },
      metadata: matchedRecord ? {
        nickname: matchedRecord.nickname || '',
        gender: matchedRecord.gender || '',
        birthDate: matchedRecord.birthDate || '',
        birthPlace: matchedRecord.birthPlace || '',
        currentResidence: matchedRecord.currentResidence || '',
        occupation: matchedRecord.occupation || '',
        notes: matchedRecord.notes || ''
      } : null,
      match: {
        confidence,
        candidateCount,
        matchedSource: matchedRecord ? matchedRecord.source : null,
        matchedSourceRow: matchedRecord ? matchedRecord.sourceRow : null
      },
      children: []
    };

    stats.totalNodes += 1;
    if (matchedRecord) {
      stats.nodesWithMetadata += 1;
      if (confidence === 'high') stats.highConfidenceMatches += 1;
      if (confidence === 'medium') stats.mediumConfidenceMatches += 1;
      if (confidence === 'low') stats.lowConfidenceMatches += 1;
    } else {
      stats.unmatchedNodes += 1;
    }

    importRecords.push({
      tempId,
      fatherTempId: parentTempId,
      fullName: lineageNode.name,
      fatherName: ancestryNames[ancestryNames.length - 1] || null,
      generation: lineageNode.generation,
      isRoot: lineageNode.generation === 0,
      siblingOrder: 0,
      gender:
        matchedRecord?.gender === 'ذكر'
          ? 'male'
          : matchedRecord?.gender === 'أنثى'
            ? 'female'
            : 'unknown',
      birthDate: matchedRecord?.birthDate || '',
      deathDate: '',
      isAlive: true,
      showStatus: false,
      birthPlace: matchedRecord?.birthPlace || '',
      currentResidence: matchedRecord?.currentResidence || '',
      occupation: matchedRecord?.occupation || '',
      biography: '',
      notes: matchedRecord?.notes || '',
      nickname: matchedRecord?.nickname || '',
      source: {
        lineageIdentity: lineageNode.id,
        fullLineage: lineageNode.fullLineage,
        lineageSourceRow: lineageNode.sourceRow,
        metadataSourceRow: matchedRecord?.sourceRow || null,
        matchConfidence: confidence
      },
      ancestryPath: nextAncestry
    });

    rebuiltNode.children = (lineageNode.children || [])
      .map((child) => visit(child, tempId, nextAncestry))
      .filter(Boolean);

    return rebuiltNode;
  }

  root.children = (lineageTreePayload.roots || [])
    .map((childRoot) => visit(childRoot, makeTempId(root.id), [root.name]))
    .filter(Boolean);

  importRecords.unshift({
    tempId: makeTempId(root.id),
    fatherTempId: null,
    fullName: root.name,
    fatherName: null,
    generation: 0,
    isRoot: true,
    siblingOrder: 0,
    gender: 'male',
    birthDate: '',
    deathDate: '',
    isAlive: false,
    showStatus: false,
    birthPlace: '',
    currentResidence: '',
    occupation: '',
    biography: 'Root ancestor synthesized from lineage reconstruction.',
    notes: 'Added automatically because the lineage file starts from his sons.',
    nickname: '',
    source: {
      lineageIdentity: root.id,
      fullLineage: root.fullLineage,
      lineageSourceRow: null,
      metadataSourceRow: null,
      matchConfidence: 'synthetic-root'
    },
    ancestryPath: [root.name]
  });

  return {
    rebuiltTree: {
      generatedAt: new Date().toISOString(),
      basedOn: {
        names: NAMES_PATH,
        lineage: LINEAGE_TREE_PATH
      },
      summary: {
        totalNodesIncludingRoot: stats.totalNodes + 1,
        totalImportedPersons: importRecords.length,
        nodesWithMetadata: stats.nodesWithMetadata,
        highConfidenceMatches: stats.highConfidenceMatches,
        mediumConfidenceMatches: stats.mediumConfidenceMatches,
        lowConfidenceMatches: stats.lowConfidenceMatches,
        unmatchedNodes: stats.unmatchedNodes,
        duplicateLineageNodesSkipped: stats.duplicateLineageNodesSkipped
      },
      root
    },
    importPayload: {
      generatedAt: new Date().toISOString(),
      summary: {
        totalPersons: importRecords.length,
        rootPersons: importRecords.filter((record) => record.isRoot).length,
        matchedMetadata: stats.nodesWithMetadata,
        unmatchedMetadata: stats.unmatchedNodes
      },
      persons: importRecords
    }
  };
}

function main() {
  const namesPayload = loadJson(NAMES_PATH);
  const lineageTreePayload = loadJson(LINEAGE_TREE_PATH);
  const { rebuiltTree, importPayload } = buildReconstructedTree(namesPayload, lineageTreePayload);

  fs.writeFileSync(OUTPUT_TREE_PATH, JSON.stringify(rebuiltTree, null, 2));
  fs.writeFileSync(OUTPUT_PERSONS_PATH, JSON.stringify(importPayload, null, 2));

  console.log(JSON.stringify({
    treeOutputPath: OUTPUT_TREE_PATH,
    importOutputPath: OUTPUT_PERSONS_PATH,
    treeSummary: rebuiltTree.summary,
    importSummary: importPayload.summary
  }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = {
  buildReconstructedTree
};

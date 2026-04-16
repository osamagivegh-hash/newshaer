const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '..', 'data', 'recovery', 'recovered-family-names.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'recovery', 'family-lineage-tree.json');

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function removePrefix(fullText, prefix) {
  const normalizedFullText = normalize(fullText);
  const normalizedPrefix = normalize(prefix);

  if (!normalizedFullText.startsWith(normalizedPrefix)) {
    return normalizedFullText;
  }

  return normalize(normalizedFullText.slice(normalizedPrefix.length));
}

function createNode(record) {
  return {
    id: record.identityKey,
    name: record.displayName,
    generation: record.generation ?? null,
    fullLineage: record.fullLineage || record.identityKey,
    sourceRow: record.sourceRow || null,
    parentId: null,
    children: []
  };
}

function main() {
  const input = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const lineageRecords = (input.records || []).filter(
    (record) => record.source === 'alshaer_full_lineage.xlsx' && record.identityKey
  );

  const nodeMap = new Map();

  for (const record of lineageRecords) {
    if (!nodeMap.has(record.identityKey)) {
      nodeMap.set(record.identityKey, createNode(record));
    }
  }

  const unresolvedParents = [];

  for (const record of lineageRecords) {
    const node = nodeMap.get(record.identityKey);
    const parentIdentity = removePrefix(record.fullLineage || '', record.displayName || '');

    if (!parentIdentity) {
      continue;
    }

    if (nodeMap.has(parentIdentity)) {
      node.parentId = parentIdentity;
      nodeMap.get(parentIdentity).children.push(node);
    } else {
      unresolvedParents.push({
        childId: node.id,
        childName: node.name,
        missingParentIdentity: parentIdentity
      });
    }
  }

  const roots = Array.from(nodeMap.values()).filter((node) => !node.parentId);

  roots.sort((a, b) => {
    if ((a.generation ?? 0) !== (b.generation ?? 0)) {
      return (a.generation ?? 0) - (b.generation ?? 0);
    }
    return a.name.localeCompare(b.name, 'ar');
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    basedOn: INPUT_PATH,
    summary: {
      totalNodes: nodeMap.size,
      rootCount: roots.length,
      unresolvedParentLinks: unresolvedParents.length
    },
    roots,
    unresolvedParents
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

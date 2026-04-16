export const RECOVERY_TREE_URLS = [
  '/recovery-test/browser-family-tree.json',
  '/recovery-test/rebuilt-family-tree.json'
]

const BRANCH_ORDER = ['صالح', 'زهار', 'إبراهيم']

const normalizeMetadata = (metadata = {}) => ({
  nickname: metadata.nickname || '',
  gender:
    metadata.gender === 'أنثى'
      ? 'female'
      : metadata.gender === 'ذكر'
        ? 'male'
        : metadata.gender || 'unknown',
  birthDate: metadata.birthDate || '',
  birthPlace: metadata.birthPlace || '',
  currentResidence: metadata.currentResidence || '',
  occupation: metadata.occupation || '',
  notes: metadata.notes || ''
})

const mapRecoveredNode = (node, parentId = null) => {
  const metadata = normalizeMetadata(node.metadata)
  const mapped = {
    id: node.tempId,
    parentId,
    fullName: node.name || 'غير معروف',
    generation: Number(node.generation || 0),
    gender: metadata.gender,
    nickname: metadata.nickname,
    birthDate: metadata.birthDate,
    birthPlace: metadata.birthPlace,
    currentResidence: metadata.currentResidence,
    occupation: metadata.occupation,
    notes: metadata.notes,
    fullLineageName: node.fullLineage || '',
    metadata,
    children: []
  }

  mapped.children = (node.children || []).map((child) => mapRecoveredNode(child, mapped.id))
  return mapped
}

const mapBrowserNode = (node, parentId = null) => {
  const mapped = {
    id: node._id,
    parentId,
    fullName: node.fullName || 'غير معروف',
    generation: Number(node.generation || 0),
    gender: node.gender || 'unknown',
    nickname: node.nickname || '',
    birthDate: node.birthDate || '',
    birthPlace: node.birthPlace || '',
    currentResidence: node.currentResidence || '',
    occupation: node.occupation || '',
    notes: node.notes || '',
    fullLineageName: node.fullLineageName || '',
    metadata: {
      nickname: node.nickname || '',
      gender: node.gender || 'unknown',
      birthDate: node.birthDate || '',
      birthPlace: node.birthPlace || '',
      currentResidence: node.currentResidence || '',
      occupation: node.occupation || '',
      notes: node.notes || ''
    },
    children: []
  }

  mapped.children = (node.children || []).map((child) => mapBrowserNode(child, mapped.id))
  return mapped
}

export const normalizeRealTreePayload = (payload) => {
  if (!payload) return null
  if (payload.root) return mapRecoveredNode(payload.root)
  if (payload._id || payload.fullName) return mapBrowserNode(payload)
  return null
}

export const getBranchShortName = (node) => {
  const fullName = String(node?.fullName || '').trim()
  if (!fullName) return 'فرع'
  return fullName.split(/\s+/)[0]
}

export const flattenRealTree = (node, bucket = []) => {
  if (!node) return bucket
  bucket.push(node)
  for (const child of node.children || []) {
    flattenRealTree(child, bucket)
  }
  return bucket
}

export const countRealTreeMembers = (node) => flattenRealTree(node, []).length

export const buildRealTreeNodeIndex = (node) => {
  const index = new Map()
  for (const entry of flattenRealTree(node, [])) {
    index.set(entry.id, entry)
  }
  return index
}

export const getRealTreeAncestorIds = (nodeIndex, nodeId) => {
  const ancestors = []
  let current = nodeIndex.get(nodeId)

  while (current?.parentId) {
    ancestors.push(current.parentId)
    current = nodeIndex.get(current.parentId)
  }

  return ancestors
}

export const getTopLevelBranchTrees = (root) => {
  const orderMap = new Map(BRANCH_ORDER.map((name, index) => [name, index]))

  return [...(root?.children || [])].sort((a, b) => {
    const aName = getBranchShortName(a)
    const bName = getBranchShortName(b)
    const aOrder = orderMap.has(aName) ? orderMap.get(aName) : 999
    const bOrder = orderMap.has(bName) ? orderMap.get(bName) : 999

    if (aOrder !== bOrder) return aOrder - bOrder
    return aName.localeCompare(bName, 'ar')
  })
}

export const findNodesByQuery = (root, query) => {
  const safeQuery = String(query || '').trim().toLowerCase()
  if (!safeQuery) return []

  return flattenRealTree(root, []).filter((node) => {
    return (
      String(node.fullName || '').toLowerCase().includes(safeQuery) ||
      String(node.nickname || '').toLowerCase().includes(safeQuery) ||
      String(node.fullLineageName || '').toLowerCase().includes(safeQuery)
    )
  })
}

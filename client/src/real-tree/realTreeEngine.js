const CANOPY_HALF_WIDTH = 700
const CANOPY_HEIGHT = 980
const CANOPY_SIDE_LIFT = 0.45
const VIEWPORT_PADDING_X = 180
const VIEWPORT_PADDING_TOP = 100
const TRUNK_HEIGHT = 360

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const sum = (values) => values.reduce((total, value) => total + value, 0)

const normalizeVector = (x, y) => {
  const length = Math.hypot(x, y) || 1
  return { x: x / length, y: y / length }
}

const getNodeRadius = (depth, descendantCount) => {
  const base =
    depth === 0
      ? 36
      : depth === 1
        ? 28
        : depth === 2
          ? 22
          : depth === 3
            ? 18
            : depth === 4
              ? 15
              : 12

  if (descendantCount > 72) return base + 4
  if (descendantCount > 34) return base + 3
  if (descendantCount > 14) return base + 2
  if (descendantCount > 6) return base + 1
  return base
}

const getClusterRadius = (metrics, depth) => {
  const base =
    depth === 0
      ? 0
      : depth === 1
        ? 148
        : depth === 2
          ? 116
          : depth === 3
            ? 88
            : depth === 4
              ? 62
              : 44

  const descendantBonus = clamp(Math.sqrt(metrics.descendantCount) * (depth <= 2 ? 7 : 4.5), 0, depth <= 2 ? 58 : 26)
  const childBonus = clamp(metrics.childCount * (depth <= 3 ? 9 : 4), 0, depth <= 3 ? 36 : 14)
  const depthBonus = clamp(metrics.maxDepth * 5, 0, 24)

  return base + descendantBonus + childBonus + depthBonus
}

const getCollisionPadding = (depth) => {
  if (depth <= 1) return 24
  if (depth === 2) return 18
  if (depth === 3) return 16
  if (depth === 4) return 14
  return 12
}

const getMinimumVerticalRise = (depth) => {
  if (depth === 1) return 182
  if (depth === 2) return 142
  if (depth === 3) return 118
  if (depth === 4) return 86
  return 60
}

const getSiblingGapUnits = (depth, childCount) => {
  const base =
    depth === 0
      ? 2.9
      : depth === 1
        ? 2.05
        : depth === 2
          ? 1.62
          : depth === 3
            ? 1.34
            : 1.16

  return base + clamp(childCount * (depth <= 1 ? 0.12 : depth === 2 ? 0.08 : 0.06), 0, depth <= 1 ? 0.54 : 0.34)
}

const getLeafSpanUnits = (metrics, depth) => {
  const base =
    depth <= 2
      ? 1.48
      : depth === 3
        ? 1.42
        : depth === 4
          ? 1.72
          : 1.94

  const densityBonus = clamp(Math.sqrt(metrics.descendantCount) * 0.08, 0, 0.55)
  const childBonus = metrics.childCount === 0 && depth >= 4 ? 0.18 : 0
  return base + densityBonus + childBonus
}

const getMinimumSubtreeUnits = (metrics, depth) => {
  const base =
    depth === 0
      ? 10.6
      : depth === 1
        ? 7.8
        : depth === 2
          ? 5.3
          : depth === 3
            ? 4.25
            : 3.1

  const sizeBonus = clamp(Math.sqrt(metrics.descendantCount) * 0.36, 0, depth <= 1 ? 4.6 : 2.2)
  const childBonus = clamp(metrics.childCount * (depth <= 2 ? 0.42 : 0.22), 0, depth <= 2 ? 1.8 : 1.1)
  const depthBonus = clamp(metrics.maxDepth * 0.34, 0, 1.9)

  return base + sizeBonus + childBonus + depthBonus
}

const cloneVisibleBranch = (node, collapsedIds) => {
  const isCollapsed = collapsedIds.has(node.id)
  return {
    ...node,
    children: isCollapsed ? [] : (node.children || []).map((child) => cloneVisibleBranch(child, collapsedIds))
  }
}

const collectMetrics = (node) => {
  const childMetrics = (node.children || []).map(collectMetrics)
  const descendantCount = 1 + sum(childMetrics.map((child) => child.descendantCount))
  const leafWeight =
    childMetrics.length === 0
      ? 1
      : sum(childMetrics.map((child) => child.leafWeight))
  const maxDepth = childMetrics.length === 0 ? 0 : 1 + Math.max(...childMetrics.map((child) => child.maxDepth))
  const spaceWeight =
    Math.pow(descendantCount, 0.74) +
    leafWeight * 0.52 +
    childMetrics.length * 2 +
    maxDepth * 2.8

  node.__realTreeMetrics = {
    descendantCount,
    leafWeight,
    maxDepth,
    childCount: childMetrics.length,
    spaceWeight
  }

  return node.__realTreeMetrics
}

const getCenterOutSlotOrder = (count) => {
  const center = (count - 1) / 2
  return Array.from({ length: count }, (_, index) => index).sort((a, b) => {
    const distanceA = Math.abs(a - center)
    const distanceB = Math.abs(b - center)

    if (distanceA !== distanceB) return distanceA - distanceB
    return a - b
  })
}

const balanceChildrenForCanopy = (children) => {
  if (children.length <= 2) return [...children]

  const sortedByWeight = [...children].sort((a, b) => {
    return b.__realTreeMetrics.spaceWeight - a.__realTreeMetrics.spaceWeight
  })

  const slots = getCenterOutSlotOrder(children.length)
  const arranged = new Array(children.length)

  sortedByWeight.forEach((child, index) => {
    arranged[slots[index]] = child
  })

  return arranged.filter(Boolean)
}

const computeSpanUnits = (node, depth = 0) => {
  const orderedChildren = balanceChildrenForCanopy(node.children || [])
  node.__orderedRealTreeChildren = orderedChildren

  if (!orderedChildren.length) {
    const spanUnits = Math.max(getLeafSpanUnits(node.__realTreeMetrics, depth), getMinimumSubtreeUnits(node.__realTreeMetrics, depth))
    node.__realTreeMetrics.spanUnits = spanUnits
    return spanUnits
  }

  const childSpans = orderedChildren.map((child) => computeSpanUnits(child, depth + 1))
  const gapUnits = getSiblingGapUnits(depth, orderedChildren.length)
  const contentWidth = sum(childSpans) + gapUnits * (orderedChildren.length - 1)
  const densityAmplifier =
    1 +
    clamp(
      orderedChildren.length * (depth <= 1 ? 0.03 : 0.02) +
      Math.sqrt(node.__realTreeMetrics.leafWeight) * 0.015 +
      (depth >= 2 ? 0.05 : 0),
      0,
      depth <= 1 ? 0.18 : 0.28
    )
  const spanUnits = Math.max(contentWidth * densityAmplifier, getMinimumSubtreeUnits(node.__realTreeMetrics, depth))

  node.__realTreeMetrics.spanUnits = spanUnits
  return spanUnits
}

const assignUnitRanges = (node, depth, startUnit, endUnit) => {
  const orderedChildren = node.__orderedRealTreeChildren || []
  const metrics = node.__realTreeMetrics
  const rangeWidth = endUnit - startUnit
  const minInset = Math.min(rangeWidth * 0.16, depth <= 1 ? 1.3 : 0.74)

  node.__realTreeLayout = {
    depth,
    startUnit,
    endUnit,
    centerUnit: (startUnit + endUnit) / 2
  }

  if (!orderedChildren.length) {
    return node.__realTreeLayout.centerUnit
  }

  const gapUnits = getSiblingGapUnits(depth, orderedChildren.length)
  const totalChildrenWidth = sum(orderedChildren.map((child) => child.__realTreeMetrics.spanUnits)) + gapUnits * (orderedChildren.length - 1)
  let cursor = startUnit + (rangeWidth - totalChildrenWidth) / 2

  for (const child of orderedChildren) {
    const childStart = cursor
    const childEnd = childStart + child.__realTreeMetrics.spanUnits
    assignUnitRanges(child, depth + 1, childStart, childEnd)
    cursor = childEnd + gapUnits
  }

  const weightedCenter =
    sum(orderedChildren.map((child) => child.__realTreeLayout.centerUnit * child.__realTreeMetrics.spaceWeight)) /
    Math.max(1, sum(orderedChildren.map((child) => child.__realTreeMetrics.spaceWeight)))

  node.__realTreeLayout.centerUnit = clamp(weightedCenter, startUnit + minInset, endUnit - minInset)
  return node.__realTreeLayout.centerUnit
}

const getEnvelopeFactor = (x) => {
  const normalized = clamp(Math.abs(x) / CANOPY_HALF_WIDTH, 0, 1)
  const dome = Math.sqrt(Math.max(0, 1 - normalized * normalized))
  return CANOPY_SIDE_LIFT + (1 - CANOPY_SIDE_LIFT) * dome
}

const getDepthLayerRange = (depth, maxDepth) => {
  if (depth <= 0 || maxDepth <= 0) return { minRatio: 0, maxRatio: 0 }

  const lowerDepth = Math.max(0, depth - 0.58)
  const upperDepth = Math.min(maxDepth, depth + 0.28)
  const minRatio = clamp(Math.pow(lowerDepth / maxDepth, 0.86), 0, 0.96)
  const maxRatio = clamp(Math.pow(upperDepth / maxDepth, 0.82), minRatio + 0.04, 0.992)

  return { minRatio, maxRatio }
}

const getConstrainedY = ({ depth, maxDepth, x, metrics, parentEntry }) => {
  if (depth === 0) return 0

  const canopyTopY = -CANOPY_HEIGHT * getEnvelopeFactor(x)
  const { minRatio, maxRatio } = getDepthLayerRange(depth, maxDepth)
  const sideFactor = clamp(Math.abs(x) / CANOPY_HALF_WIDTH, 0, 1)
  const densityFactor = clamp(Math.sqrt(metrics.leafWeight) * 0.016 + metrics.childCount * 0.014, 0, 0.22)
  const layerPosition = clamp(0.28 + sideFactor * 0.24 + densityFactor, 0, 1)
  let y = canopyTopY * (minRatio + (maxRatio - minRatio) * layerPosition)

  if (parentEntry) {
    y = Math.min(y, parentEntry.y - getMinimumVerticalRise(depth))
  }

  return clamp(y, canopyTopY, -getMinimumVerticalRise(depth))
}

const collidesWithPlacedNodes = ({ x, y, radius, depth, clusterRadius }, placedNodes) => {
  for (const placed of placedNodes) {
    if (Math.abs(placed.depth - depth) > 2) continue

    const dx = x - placed.x
    const dy = y - placed.y
    const minDistance = radius + placed.nodeRadius + Math.max(getCollisionPadding(depth), getCollisionPadding(placed.depth))

    if ((dx * dx) + (dy * dy) < minDistance * minDistance) {
      return true
    }

    if (depth >= 2 && Math.abs(placed.depth - depth) <= 1) {
      const clusterDistance = clusterRadius + placed.clusterRadius
      if ((dx * dx) + (dy * dy) < Math.pow(clusterDistance * 0.72, 2)) {
        return true
      }
    }
  }

  return false
}

const resolveNodePlacement = ({
  desiredX,
  laneStartX,
  laneEndX,
  depth,
  maxDepth,
  metrics,
  parentEntry,
  nodeRadius,
  clusterRadius,
  placedNodes
}) => {
  const safeStart = laneStartX + nodeRadius + 12
  const safeEnd = laneEndX - nodeRadius - 12
  const boundedX = clamp(desiredX, safeStart, safeEnd)
  const horizontalStep = depth <= 1 ? 28 : depth === 2 ? 20 : depth === 3 ? 16 : 13
  const verticalStep = depth <= 2 ? 24 : 18
  const maxHorizontalAttempts = Math.max(1, Math.ceil((safeEnd - safeStart) / horizontalStep))
  const shifts = [0]

  for (let step = 1; step <= maxHorizontalAttempts; step += 1) {
    shifts.push(-step, step)
  }

  for (let ring = 0; ring < 8; ring += 1) {
    for (const shift of shifts) {
      const candidateX = clamp(boundedX + shift * horizontalStep, safeStart, safeEnd)
      const canopyTopY = -CANOPY_HEIGHT * getEnvelopeFactor(candidateX)
      let candidateY = getConstrainedY({
        depth,
        maxDepth,
        x: candidateX,
        metrics,
        parentEntry
      }) - ring * verticalStep

      if (parentEntry) {
        candidateY = Math.min(candidateY, parentEntry.y - getMinimumVerticalRise(depth))
      }

      candidateY = Math.max(candidateY, canopyTopY)

      if (!collidesWithPlacedNodes({ x: candidateX, y: candidateY, radius: nodeRadius, depth, clusterRadius }, placedNodes)) {
        return { x: candidateX, y: candidateY }
      }
    }
  }

  return {
    x: boundedX,
    y: getConstrainedY({
      depth,
      maxDepth,
      x: boundedX,
      metrics,
      parentEntry
    })
  }
}

const createNodeEntry = (node, depth, placement, parentEntry, laneStartX, laneEndX) => {
  const metrics = node.__realTreeMetrics
  const dx = parentEntry ? placement.x - parentEntry.x : 0
  const dy = parentEntry ? placement.y - parentEntry.y : -1
  const angleDeg = parentEntry ? (Math.atan2(dy, dx) * 180) / Math.PI : -90
  const laneCenter = (laneStartX + laneEndX) / 2

  return {
    id: node.id,
    parentId: node.parentId,
    fullName: node.fullName,
    generation: node.generation,
    nickname: node.nickname,
    gender: node.gender,
    birthDate: node.birthDate,
    birthPlace: node.birthPlace,
    currentResidence: node.currentResidence,
    occupation: node.occupation,
    notes: node.notes,
    fullLineageName: node.fullLineageName,
    metadata: node.metadata,
    childCount: node.children.length,
    descendantCount: metrics.descendantCount,
    leafWeight: metrics.leafWeight,
    depth,
    angleDeg,
    radius: Math.sqrt((placement.x * placement.x) + (placement.y * placement.y)),
    x: placement.x,
    y: placement.y,
    nodeRadius: getNodeRadius(depth, metrics.descendantCount),
    clusterRadius: getClusterRadius(metrics, depth),
    laneStart: laneStartX,
    laneEnd: laneEndX,
    laneCenter,
    laneWidth: laneEndX - laneStartX,
    envelopeTopY: -CANOPY_HEIGHT * getEnvelopeFactor(laneCenter),
    spaceWeight: metrics.spaceWeight
  }
}

const updateEntryDirection = (entry, parentEntry) => {
  if (!entry) return
  if (!parentEntry) {
    entry.angleDeg = -90
    return
  }

  const dx = entry.x - parentEntry.x
  const dy = entry.y - parentEntry.y
  entry.angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  entry.radius = Math.sqrt((entry.x * entry.x) + (entry.y * entry.y))
}

const getLocalFrameForEntry = (entry, state) => {
  const parentEntry = entry.parentId ? state.nodeIndex.get(entry.parentId) : null
  const grandparentEntry = parentEntry?.parentId ? state.nodeIndex.get(parentEntry.parentId) : null
  const outward = parentEntry && grandparentEntry
    ? normalizeVector(parentEntry.x - grandparentEntry.x, parentEntry.y - grandparentEntry.y)
    : parentEntry
      ? normalizeVector(entry.x - parentEntry.x, entry.y - parentEntry.y)
      : { x: 0, y: -1 }
  const normal = { x: -outward.y, y: outward.x }

  return { parentEntry, outward, normal }
}

const shiftSubtree = (node, dx, dy, state) => {
  const entry = state.nodeIndex.get(node.id)
  if (!entry) return

  entry.x += dx
  entry.y += dy
  entry.laneStart += dx
  entry.laneEnd += dx
  entry.laneCenter += dx
  entry.envelopeTopY += dy

  for (const child of node.children || []) {
    shiftSubtree(child, dx, dy, state)
  }
}

const repositionSubtreeRoot = (node, parentEntry, targetX, targetY, state) => {
  const entry = state.nodeIndex.get(node.id)
  const dx = targetX - entry.x
  const dy = targetY - entry.y
  shiftSubtree(node, dx, dy, state)
  updateEntryDirection(state.nodeIndex.get(node.id), parentEntry)
}

const getRequiredAngleSeparation = (depth, siblingCount) => {
  const base =
    depth <= 1
      ? 0.32
      : depth === 2
        ? 0.26
        : depth === 3
          ? 0.22
          : 0.18

  return base + clamp(siblingCount * 0.008, 0, 0.06)
}

const buildLayoutRecursive = ({
  node,
  depth,
  totalSpanUnits,
  parentEntry,
  state
}) => {
  const metrics = node.__realTreeMetrics
  const layoutUnits = node.__realTreeLayout
  const laneStartX = ((layoutUnits.startUnit / totalSpanUnits) - 0.5) * 2 * CANOPY_HALF_WIDTH
  const laneEndX = ((layoutUnits.endUnit / totalSpanUnits) - 0.5) * 2 * CANOPY_HALF_WIDTH
  const desiredX = ((layoutUnits.centerUnit / totalSpanUnits) - 0.5) * 2 * CANOPY_HALF_WIDTH
  const nodeRadius = getNodeRadius(depth, metrics.descendantCount)
  const clusterRadius = getClusterRadius(metrics, depth)
  const placement =
    depth === 0
      ? { x: 0, y: 0 }
      : resolveNodePlacement({
          desiredX,
          laneStartX,
          laneEndX,
          depth,
          maxDepth: state.maxDepth,
          metrics,
          parentEntry,
          nodeRadius,
          clusterRadius,
          placedNodes: state.nodes
        })

  const entry = createNodeEntry(node, depth, placement, parentEntry, laneStartX, laneEndX)
  state.nodes.push(entry)
  state.nodeIndex.set(entry.id, entry)

  if (parentEntry) {
    state.links.push({
      id: `${parentEntry.id}-${entry.id}`,
      sourceId: parentEntry.id,
      targetId: entry.id
    })
  }

  for (const child of node.__orderedRealTreeChildren || []) {
    buildLayoutRecursive({
      node: child,
      depth: depth + 1,
      totalSpanUnits,
      parentEntry: entry,
      state
    })
  }
}

const separateSiblingClusters = (node, state) => {
  const children = node.children || []
  if (children.length <= 1) {
    for (const child of children) separateSiblingClusters(child, state)
    return
  }

  const parentEntry = state.nodeIndex.get(node.id)
  const grandparentEntry = parentEntry.parentId ? state.nodeIndex.get(parentEntry.parentId) : null
  const outward = grandparentEntry
    ? normalizeVector(parentEntry.x - grandparentEntry.x, parentEntry.y - grandparentEntry.y)
    : { x: 0, y: -1 }
  const normal = { x: -outward.y, y: outward.x }

  for (let pass = 0; pass < 2; pass += 1) {
    const orderedChildren = [...children].sort((a, b) => {
      const entryA = state.nodeIndex.get(a.id)
      const entryB = state.nodeIndex.get(b.id)
      const projectionA = entryA.x * normal.x + entryA.y * normal.y
      const projectionB = entryB.x * normal.x + entryB.y * normal.y
      return projectionA - projectionB
    })

    for (let index = 0; index < orderedChildren.length - 1; index += 1) {
      const leftNode = orderedChildren[index]
      const rightNode = orderedChildren[index + 1]
      const leftEntry = state.nodeIndex.get(leftNode.id)
      const rightEntry = state.nodeIndex.get(rightNode.id)
      const leftProjection = leftEntry.x * normal.x + leftEntry.y * normal.y
      const rightProjection = rightEntry.x * normal.x + rightEntry.y * normal.y
      const requiredGap = leftEntry.clusterRadius + rightEntry.clusterRadius + (parentEntry.depth >= 2 ? 24 : 36)
      const actualGap = rightProjection - leftProjection

      if (actualGap < requiredGap) {
        const delta = (requiredGap - actualGap) / 2
        const outwardLift = parentEntry.depth >= 3 ? 10 : 6

        shiftSubtree(leftNode, -normal.x * delta - outward.x * outwardLift, -normal.y * delta - outward.y * outwardLift, state)
        shiftSubtree(rightNode, normal.x * delta + outward.x * outwardLift, normal.y * delta + outward.y * outwardLift, state)
        updateEntryDirection(state.nodeIndex.get(leftNode.id), parentEntry)
        updateEntryDirection(state.nodeIndex.get(rightNode.id), parentEntry)
      }
    }
  }

  for (const child of children) separateSiblingClusters(child, state)
}

const enforceSiblingAngleSeparation = (node, state) => {
  const children = node.children || []
  if (children.length <= 1) {
    for (const child of children) enforceSiblingAngleSeparation(child, state)
    return
  }

  const parentEntry = state.nodeIndex.get(node.id)
  const grandparentEntry = parentEntry.parentId ? state.nodeIndex.get(parentEntry.parentId) : null
  const outward = grandparentEntry
    ? normalizeVector(parentEntry.x - grandparentEntry.x, parentEntry.y - grandparentEntry.y)
    : { x: 0, y: -1 }
  const normal = { x: -outward.y, y: outward.x }
  const minimumAngle = getRequiredAngleSeparation(parentEntry.depth, children.length)

  for (let pass = 0; pass < 2; pass += 1) {
    const orderedChildren = [...children].sort((a, b) => {
      const entryA = state.nodeIndex.get(a.id)
      const entryB = state.nodeIndex.get(b.id)
      return Math.atan2(entryA.y - parentEntry.y, entryA.x - parentEntry.x) - Math.atan2(entryB.y - parentEntry.y, entryB.x - parentEntry.x)
    })

    for (let index = 0; index < orderedChildren.length - 1; index += 1) {
      const leftNode = orderedChildren[index]
      const rightNode = orderedChildren[index + 1]
      const leftEntry = state.nodeIndex.get(leftNode.id)
      const rightEntry = state.nodeIndex.get(rightNode.id)
      const angleA = Math.atan2(leftEntry.y - parentEntry.y, leftEntry.x - parentEntry.x)
      const angleB = Math.atan2(rightEntry.y - parentEntry.y, rightEntry.x - parentEntry.x)
      const currentGap = Math.abs(angleB - angleA)

      if (currentGap < minimumAngle) {
        const averageDistance = (Math.hypot(leftEntry.x - parentEntry.x, leftEntry.y - parentEntry.y) + Math.hypot(rightEntry.x - parentEntry.x, rightEntry.y - parentEntry.y)) / 2
        const neededLateral = Math.max(
          12,
          Math.sin(minimumAngle) * averageDistance + (leftEntry.nodeRadius + rightEntry.nodeRadius) * 0.8
        )
        const currentLateral = Math.abs((rightEntry.x - leftEntry.x) * normal.x + (rightEntry.y - leftEntry.y) * normal.y)
        const delta = Math.max(0, neededLateral - currentLateral) / 2

        if (delta > 0) {
          shiftSubtree(leftNode, -normal.x * delta, -normal.y * delta, state)
          shiftSubtree(rightNode, normal.x * delta, normal.y * delta, state)
          updateEntryDirection(state.nodeIndex.get(leftNode.id), parentEntry)
          updateEntryDirection(state.nodeIndex.get(rightNode.id), parentEntry)
        }
      }
    }
  }

  for (const child of children) enforceSiblingAngleSeparation(child, state)
}

const wrapLateGenerationClusters = (node, state) => {
  const children = node.children || []
  const parentEntry = state.nodeIndex.get(node.id)
  if (!parentEntry || !children.length) return

  const depth = parentEntry.depth
  if (depth >= 3 && children.length > 1) {
    const grandparentEntry = parentEntry.parentId ? state.nodeIndex.get(parentEntry.parentId) : null
    const outward = grandparentEntry
      ? normalizeVector(parentEntry.x - grandparentEntry.x, parentEntry.y - grandparentEntry.y)
      : { x: 0, y: -1 }
    const normal = { x: -outward.y, y: outward.x }
    const orderedChildren = [...children].sort((a, b) => state.nodeIndex.get(a.id).x - state.nodeIndex.get(b.id).x)
    const rowCapacity =
      children.length <= 3
        ? children.length
        : depth >= 4
          ? 3
          : 4
    const maxChildRadius = Math.max(...orderedChildren.map((child) => state.nodeIndex.get(child.id).nodeRadius))
    const lateralSpacing = maxChildRadius * (depth >= 4 ? 3.4 : 3.7) + (depth >= 4 ? 22 : 28)
    const outwardSpacing = maxChildRadius * (depth >= 4 ? 2.7 : 3.05) + (depth >= 4 ? 24 : 30)
    const branchLead = parentEntry.nodeRadius * (depth >= 4 ? 1.26 : 1.6) + 22

    orderedChildren.forEach((child, index) => {
      const row = Math.floor(index / rowCapacity)
      const rowStart = row * rowCapacity
      const rowCount = Math.min(rowCapacity, orderedChildren.length - rowStart)
      const slot = index - rowStart
      const centeredSlot = slot - (rowCount - 1) / 2
      const rowStagger = row % 2 === 1 ? lateralSpacing * 0.34 : 0
      const lateralOffset = centeredSlot * lateralSpacing + rowStagger
      const outwardOffset = branchLead + row * outwardSpacing
      const targetX = parentEntry.x + outward.x * outwardOffset + normal.x * lateralOffset
      const targetY = parentEntry.y + outward.y * outwardOffset + normal.y * lateralOffset

      repositionSubtreeRoot(child, parentEntry, targetX, targetY, state)
    })
  }

  for (const child of children) {
    wrapLateGenerationClusters(child, state)
  }
}

const enforceTerminalNodeSpacing = (node, state) => {
  const children = node.children || []
  const parentEntry = state.nodeIndex.get(node.id)
  if (!parentEntry || children.length <= 1) {
    for (const child of children) enforceTerminalNodeSpacing(child, state)
    return
  }

  const grandparentEntry = parentEntry.parentId ? state.nodeIndex.get(parentEntry.parentId) : null
  const outward = grandparentEntry
    ? normalizeVector(parentEntry.x - grandparentEntry.x, parentEntry.y - grandparentEntry.y)
    : { x: 0, y: -1 }
  const normal = { x: -outward.y, y: outward.x }

  const terminalChildren = children.filter((child) => {
    const entry = state.nodeIndex.get(child.id)
    return entry.childCount === 0 || entry.depth >= 5
  })

  if (terminalChildren.length > 1) {
    const orderedTerminalChildren = [...terminalChildren].sort((a, b) => {
      const entryA = state.nodeIndex.get(a.id)
      const entryB = state.nodeIndex.get(b.id)
      const projectionA = entryA.x * normal.x + entryA.y * normal.y
      const projectionB = entryB.x * normal.x + entryB.y * normal.y
      return projectionA - projectionB
    })

    const maxChildRadius = Math.max(...orderedTerminalChildren.map((child) => state.nodeIndex.get(child.id).nodeRadius))
    const spacing = maxChildRadius * 3.3 + 22
    const lead = parentEntry.nodeRadius * 1.35 + 26

    orderedTerminalChildren.forEach((child, index) => {
      const entry = state.nodeIndex.get(child.id)
      const centeredSlot = index - (orderedTerminalChildren.length - 1) / 2
      const targetX = parentEntry.x + outward.x * lead + normal.x * centeredSlot * spacing
      const targetY = parentEntry.y + outward.y * lead + normal.y * centeredSlot * spacing

      repositionSubtreeRoot(child, parentEntry, targetX, targetY, state)
      entry.clusterRadius = Math.max(entry.clusterRadius, spacing * 0.42)
    })
  }

  for (const child of children) enforceTerminalNodeSpacing(child, state)
}

const applyLeafDensityControl = (node, state) => {
  const children = node.children || []
  const terminalChildren = children.filter((child) => {
    const entry = state.nodeIndex.get(child.id)
    return entry && (entry.childCount === 0 || entry.depth >= 5)
  })

  if (terminalChildren.length > 1) {
    const projections = terminalChildren.map((child) => {
      const entry = state.nodeIndex.get(child.id)
      const { normal } = getLocalFrameForEntry(entry, state)
      return entry.x * normal.x + entry.y * normal.y
    })
    const span = Math.max(1, Math.max(...projections) - Math.min(...projections))
    const density = terminalChildren.length / span

    if (density > 0.02) {
      const scale = clamp(1 - (density - 0.02) * 7.5, 0.72, 1)
      for (const child of terminalChildren) {
        const entry = state.nodeIndex.get(child.id)
        entry.nodeRadius *= scale
        entry.leafDensityScale = scale
      }
    }
  }

  for (const child of children) applyLeafDensityControl(child, state)
}

const relaxLocalSubtreeRegions = (node, state) => {
  const children = node.children || []
  const parentEntry = state.nodeIndex.get(node.id)

  if (children.length > 1 && parentEntry.depth >= 2) {
    const localNodes = [
      ...children,
      ...children.flatMap((child) => (child.children || []).slice(0, 2))
    ]

    for (let iteration = 0; iteration < 2; iteration += 1) {
      for (let i = 0; i < localNodes.length; i += 1) {
        for (let j = i + 1; j < localNodes.length; j += 1) {
          const nodeA = localNodes[i]
          const nodeB = localNodes[j]
          const entryA = state.nodeIndex.get(nodeA.id)
          const entryB = state.nodeIndex.get(nodeB.id)
          const dx = entryB.x - entryA.x
          const dy = entryB.y - entryA.y
          const distance = Math.hypot(dx, dy) || 1
          const minimumDistance =
            entryA.nodeRadius +
            entryB.nodeRadius +
            Math.max(getCollisionPadding(entryA.depth), getCollisionPadding(entryB.depth)) +
            (entryA.depth >= 4 || entryB.depth >= 4 ? 18 : 8)

          if (distance < minimumDistance) {
            const overlap = (minimumDistance - distance) / 2
            const direction = normalizeVector(dx, dy)
            const outwardPush = parentEntry.depth >= 3 ? 4 : 2

            shiftSubtree(nodeA, -direction.x * overlap - direction.x * outwardPush, -direction.y * overlap - direction.y * outwardPush, state)
            shiftSubtree(nodeB, direction.x * overlap + direction.x * outwardPush, direction.y * overlap + direction.y * outwardPush, state)
            updateEntryDirection(state.nodeIndex.get(nodeA.id), state.nodeIndex.get(entryA.parentId))
            updateEntryDirection(state.nodeIndex.get(nodeB.id), state.nodeIndex.get(entryB.parentId))
          }
        }
      }
    }
  }

  for (const child of children) relaxLocalSubtreeRegions(child, state)
}

const shiftLayoutIntoViewport = (layout) => {
  const root = layout.nodeIndex.get(layout.rootId)
  const shiftX = VIEWPORT_PADDING_X + CANOPY_HALF_WIDTH - root.x
  const shiftY = VIEWPORT_PADDING_TOP + CANOPY_HEIGHT - root.y

  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of layout.nodes) {
    node.x += shiftX
    node.y += shiftY
    node.laneStart += shiftX
    node.laneEnd += shiftX
    node.laneCenter += shiftX
    node.envelopeTopY += shiftY
    maxX = Math.max(maxX, node.x + node.nodeRadius)
    maxY = Math.max(maxY, node.y + node.nodeRadius)
  }

  const shiftedRoot = layout.nodeIndex.get(layout.rootId)
  const trunkBaseY = shiftedRoot.y + TRUNK_HEIGHT

  layout.width = Math.max(VIEWPORT_PADDING_X * 2 + CANOPY_HALF_WIDTH * 2, maxX + VIEWPORT_PADDING_X)
  layout.height = Math.max(VIEWPORT_PADDING_TOP + CANOPY_HEIGHT + TRUNK_HEIGHT + 120, Math.max(maxY + 80, trunkBaseY + 80))
  layout.trunk = {
    rootX: shiftedRoot.x,
    rootY: shiftedRoot.y,
    baseX: shiftedRoot.x,
    baseY: trunkBaseY
  }
}

export const layoutRealTreeBranch = (branchRoot, collapsedIds = new Set()) => {
  const visibleRoot = cloneVisibleBranch(branchRoot, collapsedIds)
  const rootMetrics = collectMetrics(visibleRoot)
  const totalSpanUnits = computeSpanUnits(visibleRoot, 0)
  assignUnitRanges(visibleRoot, 0, 0, totalSpanUnits)

  const state = {
    rootId: visibleRoot.id,
    maxDepth: Math.max(1, rootMetrics.maxDepth),
    nodes: [],
    links: [],
    nodeIndex: new Map(),
    width: 0,
    height: 0,
    trunk: null
  }

  buildLayoutRecursive({
    node: visibleRoot,
    depth: 0,
    totalSpanUnits,
    parentEntry: null,
    state
  })

  separateSiblingClusters(visibleRoot, state)
  enforceSiblingAngleSeparation(visibleRoot, state)
  wrapLateGenerationClusters(visibleRoot, state)
  enforceTerminalNodeSpacing(visibleRoot, state)
  applyLeafDensityControl(visibleRoot, state)
  relaxLocalSubtreeRegions(visibleRoot, state)
  shiftLayoutIntoViewport(state)

  return {
    ...state,
    canopy: {
      halfWidth: CANOPY_HALF_WIDTH,
      height: CANOPY_HEIGHT,
      sideLift: CANOPY_SIDE_LIFT
    },
    visibleRoot
  }
}

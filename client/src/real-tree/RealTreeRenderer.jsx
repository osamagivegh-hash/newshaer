import React from 'react'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const getNodePalette = (node) => {
  if (node.depth === 0) {
    return {
      fill: '#6b3f1d',
      stroke: '#d6b45d',
      text: '#fff6dc'
    }
  }

  if (node.depth === 1) {
    return {
      fill: '#8c5a2e',
      stroke: '#f0d278',
      text: '#fff8e8'
    }
  }

  if (node.depth === 2) {
    return {
      fill: '#f7efd6',
      stroke: '#7f5a31',
      text: '#55361d'
    }
  }

  return {
    fill: '#fffaf0',
    stroke: node.childCount > 0 ? '#4f7f3a' : '#6ba64a',
    text: '#3f301e'
  }
}

const getNodeLabel = (fullName, depth) => {
  const words = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'غير معروف'
  if (depth <= 3) return words.slice(0, 2).join(' ')
  return words[0]
}

const getLeafNodeShape = (node) => node.childCount === 0 || node.depth >= 5

const buildCanopyPath = (layout) => {
  const rootX = layout.trunk.rootX
  const rootY = layout.trunk.rootY
  const halfWidth = layout.canopy?.halfWidth || layout.width * 0.34
  const canopyHeight = layout.canopy?.height || layout.height * 0.46
  const sideLift = layout.canopy?.sideLift || 0.45
  const leftX = rootX - halfWidth
  const rightX = rootX + halfWidth
  const shoulderY = rootY - canopyHeight * sideLift
  const crownY = rootY - canopyHeight

  return [
    `M ${leftX} ${shoulderY}`,
    `C ${rootX - halfWidth * 0.94} ${rootY - canopyHeight * 0.92}, ${rootX - halfWidth * 0.44} ${crownY}, ${rootX} ${crownY}`,
    `C ${rootX + halfWidth * 0.44} ${crownY}, ${rootX + halfWidth * 0.94} ${rootY - canopyHeight * 0.92}, ${rightX} ${shoulderY}`,
    `C ${rootX + halfWidth * 0.75} ${rootY - canopyHeight * 0.18}, ${rootX + halfWidth * 0.28} ${rootY - canopyHeight * 0.03}, ${rootX} ${rootY - canopyHeight * 0.02}`,
    `C ${rootX - halfWidth * 0.28} ${rootY - canopyHeight * 0.03}, ${rootX - halfWidth * 0.75} ${rootY - canopyHeight * 0.18}, ${leftX} ${shoulderY}`,
    'Z'
  ].join(' ')
}

const buildTreeLinkPath = (source, target) => {
  const verticalRise = Math.abs(target.y - source.y)
  const splitY = source.y - clamp(verticalRise * (source.depth <= 1 ? 0.44 : 0.36), 34, source.depth <= 1 ? 124 : 84)
  const targetShoulderY = target.y + clamp(verticalRise * 0.18, 12, 34)

  return [
    `M ${source.x} ${source.y}`,
    `C ${source.x} ${splitY}, ${target.x} ${targetShoulderY}, ${target.x} ${target.y}`
  ].join(' ')
}

const buildLeafPath = (length, width) => {
  const halfWidth = width / 2

  return [
    `M ${-length * 0.45} 0`,
    `C ${-length * 0.18} ${-halfWidth}, ${length * 0.12} ${-halfWidth}, ${length * 0.44} 0`,
    `C ${length * 0.12} ${halfWidth}, ${-length * 0.18} ${halfWidth}, ${-length * 0.45} 0`,
    'Z'
  ].join(' ')
}

const LeafNode = ({ node, palette, isSelected, isHovered, isMatched, onNodeHover, onNodeLeave, onNodeSelect }) => {
  const angle = clamp(node.angleDeg, -176, 176)
  const densityScale = node.leafDensityScale || 1
  const leafLength = clamp(node.nodeRadius * 2.74 * densityScale, 24, 52)
  const leafWidth = clamp(node.nodeRadius * 1.42 * densityScale, 13, 25)
  const stemLength = clamp(node.nodeRadius * 0.92, 8, 14)
  const label = getNodeLabel(node.fullName, node.depth)
  const fontSize = clamp(node.nodeRadius * 0.35, 8, 11)
  const showLabel = densityScale > 0.86 && (node.depth <= 4 || isSelected || isHovered || isMatched)

  return (
    <g
      transform={`translate(${node.x}, ${node.y}) rotate(${angle})`}
      className="cursor-pointer"
      style={{ transition: 'transform 220ms ease, opacity 220ms ease' }}
      onMouseEnter={() => onNodeHover(node.id)}
      onMouseLeave={onNodeLeave}
      onClick={() => onNodeSelect(node.id)}
    >
      <path
        d={buildLeafPath(leafLength, leafWidth)}
        fill={palette.fill}
        stroke={isSelected ? '#f59e0b' : isMatched ? '#22c55e' : palette.stroke}
        strokeWidth={isSelected ? 2.4 : isHovered ? 1.9 : 1.3}
        filter={isSelected || isHovered ? 'url(#real-tree-soft-glow)' : undefined}
      />

      <line
        x1={-leafLength * 0.48}
        y1="0"
        x2={-leafLength * 0.48 - stemLength}
        y2={leafWidth * 0.08}
        stroke="#6b4f2b"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d={`M ${-leafLength * 0.36} 0 C ${-leafLength * 0.14} ${-leafWidth * 0.08}, ${leafLength * 0.04} ${leafWidth * 0.08}, ${leafLength * 0.28} 0`}
        fill="none"
        stroke="rgba(79,127,58,0.42)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {showLabel && (
        <text
          y={fontSize * 0.24}
          textAnchor="middle"
          fontFamily='"Cairo", "Noto Naskh Arabic", serif'
          fontWeight="700"
          fontSize={fontSize}
          fill={palette.text}
          pointerEvents="none"
        >
          {label}
        </text>
      )}
    </g>
  )
}

const CircularNode = ({ node, palette, isSelected, isHovered, isMatched, onNodeHover, onNodeLeave, onNodeSelect }) => {
  const label = getNodeLabel(node.fullName, node.depth)
  const fontSize = clamp(node.nodeRadius * 0.42, 9, 14)

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className="cursor-pointer"
      style={{ transition: 'transform 220ms ease, opacity 220ms ease' }}
      onMouseEnter={() => onNodeHover(node.id)}
      onMouseLeave={onNodeLeave}
      onClick={() => onNodeSelect(node.id)}
    >
      <circle
        r={node.nodeRadius + (isSelected ? 8 : isHovered ? 5 : isMatched ? 4 : 0)}
        fill={isSelected ? 'rgba(251,191,36,0.22)' : isMatched ? 'rgba(74,222,128,0.16)' : 'transparent'}
      />

      <circle
        r={node.nodeRadius}
        fill={palette.fill}
        stroke={isSelected ? '#f59e0b' : isMatched ? '#22c55e' : palette.stroke}
        strokeWidth={isSelected ? 4 : isHovered ? 3 : 2.2}
        filter={isSelected || isHovered ? 'url(#real-tree-soft-glow)' : undefined}
      />

      <text
        y={fontSize * 0.32}
        textAnchor="middle"
        fontFamily='"Cairo", "Noto Naskh Arabic", serif'
        fontWeight={node.depth <= 1 ? 800 : 700}
        fontSize={fontSize}
        fill={palette.text}
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  )
}

const RealTreeRenderer = ({
  layout,
  selectedNodeId,
  hoveredNodeId,
  matchedNodeIds,
  onNodeHover,
  onNodeLeave,
  onNodeSelect
}) => {
  const matchedSet = matchedNodeIds || new Set()

  return (
    <>
      <defs>
        <linearGradient id="real-tree-trunk" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#4b2e17" />
          <stop offset="55%" stopColor="#6f4521" />
          <stop offset="100%" stopColor="#8c5a2e" />
        </linearGradient>

        <radialGradient id="real-tree-canopy" cx="50%" cy="34%" r="64%">
          <stop offset="0%" stopColor="rgba(192,221,122,0.22)" />
          <stop offset="54%" stopColor="rgba(130,180,82,0.1)" />
          <stop offset="100%" stopColor="rgba(130,180,82,0)" />
        </radialGradient>

        <linearGradient id="real-tree-leaf" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#b8d86e" />
          <stop offset="100%" stopColor="#75a84b" />
        </linearGradient>

        <filter id="real-tree-soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={buildCanopyPath(layout)} fill="url(#real-tree-canopy)" opacity="0.82" />

      <path
        d={`M ${layout.trunk.baseX - 60} ${layout.trunk.baseY} C ${layout.trunk.baseX - 44} ${layout.trunk.baseY - 230}, ${layout.trunk.rootX - 30} ${layout.trunk.rootY + 88}, ${layout.trunk.rootX} ${layout.trunk.rootY + 8} C ${layout.trunk.rootX + 28} ${layout.trunk.rootY + 88}, ${layout.trunk.baseX + 44} ${layout.trunk.baseY - 230}, ${layout.trunk.baseX + 62} ${layout.trunk.baseY}`}
        fill="url(#real-tree-trunk)"
        opacity="0.98"
        filter="url(#real-tree-soft-glow)"
      />

      {layout.links.map((link) => {
        const source = layout.nodeIndex.get(link.sourceId)
        const target = layout.nodeIndex.get(link.targetId)
        const branchWidth = clamp(1.7 + Math.sqrt(source.descendantCount || 1) * 0.52, 2.2, source.depth <= 1 ? 13 : 8)

        return (
          <path
            key={link.id}
            d={buildTreeLinkPath(source, target)}
            fill="none"
            stroke={source.depth <= 1 ? '#6b3f1d' : source.depth <= 3 ? '#785028' : '#8a6638'}
            strokeWidth={branchWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={source.depth >= 4 ? 0.8 : 0.94}
            style={{ transition: 'd 220ms ease, opacity 220ms ease, stroke-width 220ms ease' }}
          />
        )
      })}

      {layout.nodes.map((node) => {
        const palette = getNodePalette(node)
        const isSelected = node.id === selectedNodeId
        const isHovered = node.id === hoveredNodeId
        const isMatched = matchedSet.has(node.id)
        const useLeafNode = getLeafNodeShape(node)

        return useLeafNode ? (
          <LeafNode
            key={node.id}
            node={node}
            palette={{
              fill: node.childCount === 0 ? 'url(#real-tree-leaf)' : '#dcedb2',
              stroke: node.childCount === 0 ? '#5d8f34' : '#7aa24f',
              text: '#35511d'
            }}
            isSelected={isSelected}
            isHovered={isHovered}
            isMatched={isMatched}
            onNodeHover={onNodeHover}
            onNodeLeave={onNodeLeave}
            onNodeSelect={onNodeSelect}
          />
        ) : (
          <CircularNode
            key={node.id}
            node={node}
            palette={palette}
            isSelected={isSelected}
            isHovered={isHovered}
            isMatched={isMatched}
            onNodeHover={onNodeHover}
            onNodeLeave={onNodeLeave}
            onNodeSelect={onNodeSelect}
          />
        )
      })}
    </>
  )
}

export default RealTreeRenderer

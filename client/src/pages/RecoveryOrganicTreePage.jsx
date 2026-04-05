import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as d3 from 'd3'

const RECOVERY_TREE_URLS = [
  '/recovery-test/browser-family-tree.json',
  '/recovery-test/rebuilt-family-tree.json'
]

const BRANCH_ORDER = ['صالح', 'زهار', 'إبراهيم']

const PALETTE = [
  { bark: '#5b3519', leaf: '#f4c96a', fill: '#fff4d4', text: '#462713' },
  { bark: '#69401e', leaf: '#d7de7b', fill: '#f8fae7', text: '#39461a' },
  { bark: '#724622', leaf: '#acd681', fill: '#eff7e8', text: '#284b25' },
  { bark: '#7c4d27', leaf: '#89cc94', fill: '#ebf8ef', text: '#1d4933' },
  { bark: '#85532a', leaf: '#7dc2b8', fill: '#eaf7f4', text: '#1e4850' },
  { bark: '#8d592d', leaf: '#86b7e2', fill: '#edf5fc', text: '#25496a' },
  { bark: '#956132', leaf: '#a79fe4', fill: '#f2effd', text: '#40326f' },
  { bark: '#9d6835', leaf: '#cc9ede', fill: '#f8effc', text: '#5d3361' },
  { bark: '#a67039', leaf: '#e5a4bd', fill: '#fff0f5', text: '#672f45' },
  { bark: '#ae783e', leaf: '#ebb78e', fill: '#fff4ec', text: '#6a3b18' },
  { bark: '#8d7968', leaf: '#d8d0c3', fill: '#f5f2ed', text: '#51463e' },
  { bark: '#76675f', leaf: '#ddd5d0', fill: '#faf7f5', text: '#463d39' },
  { bark: '#675d57', leaf: '#e6dfdb', fill: '#fdfaf8', text: '#413935' }
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const getGenerationStyle = (generation = 0) => {
  const palette = PALETTE[generation] || PALETTE[PALETTE.length - 1]
  const fontSize = generation === 0
    ? 30
    : generation === 1
      ? 24
      : generation === 2
        ? 20
        : generation === 3
          ? 17
          : clamp(15.5 - (generation - 4) * 0.8, 9.5, 15.5)

  const paddingX = generation <= 1 ? 28 : generation <= 3 ? 20 : clamp(15 - (generation - 4) * 0.4, 9, 15)
  const paddingY = generation <= 1 ? 16 : generation <= 3 ? 11 : clamp(9 - (generation - 4) * 0.25, 6, 9)
  const branchWidth = generation === 0
    ? 22
    : generation === 1
      ? 15
      : generation === 2
        ? 10
        : generation === 3
          ? 7
          : clamp(6.2 - (generation - 4) * 0.45, 2.2, 6.2)

  const bandHeight = generation === 0
    ? 190
    : generation === 1
      ? 176
      : generation === 2
        ? 164
        : generation === 3
          ? 150
          : clamp(142 - (generation - 4) * 6, 88, 142)

  const labelHeight = fontSize + paddingY * 2
  const minWidth = generation <= 2 ? 150 - generation * 10 : clamp(118 - (generation - 3) * 3, 76, 118)

  return {
    ...palette,
    fontSize,
    paddingX,
    paddingY,
    branchWidth,
    bandHeight,
    labelHeight,
    minWidth
  }
}

const createTextMeasurer = () => {
  if (typeof document === 'undefined') {
    return (text, fontSize) => String(text || '').length * fontSize * 0.68
  }

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    return (text, fontSize) => String(text || '').length * fontSize * 0.68
  }

  return (text, fontSize, fontWeight = 700) => {
    context.font = `${fontWeight} ${fontSize}px "Cairo", "Noto Naskh Arabic", serif`
    return context.measureText(String(text || '')).width
  }
}

const mapRecoveredNode = (node) => ({
  id: node.tempId,
  fullName: node.name,
  generation: node.generation || 0,
  nickname: node.metadata?.nickname || '',
  fullLineageName: node.fullLineage || '',
  children: (node.children || []).map(mapRecoveredNode)
})

const mapBrowserNode = (node) => ({
  id: node._id,
  fullName: node.fullName,
  generation: node.generation || 0,
  nickname: node.nickname || '',
  fullLineageName: node.fullLineageName || '',
  children: (node.children || []).map(mapBrowserNode)
})

const flattenTree = (node, bucket = []) => {
  bucket.push(node)
  for (const child of node.children || []) {
    flattenTree(child, bucket)
  }
  return bucket
}

const countSubtreeNodes = (node) => flattenTree(node, []).length

const getBranchShortName = (node) => {
  const fullName = String(node?.fullName || '').trim()
  if (!fullName) return 'فرع'
  return fullName.split(/\s+/)[0]
}

const sortRootBranches = (branches) => {
  const orderMap = new Map(BRANCH_ORDER.map((name, index) => [name, index]))

  return [...branches].sort((a, b) => {
    const aName = getBranchShortName(a)
    const bName = getBranchShortName(b)
    const aOrder = orderMap.has(aName) ? orderMap.get(aName) : 999
    const bOrder = orderMap.has(bName) ? orderMap.get(bName) : 999
    if (aOrder !== bOrder) return aOrder - bOrder
    return aName.localeCompare(bName, 'ar')
  })
}

const computeGenerationOffsets = (maxGeneration) => {
  const offsets = {}
  let cursor = 170

  for (let generation = 0; generation <= maxGeneration; generation += 1) {
    offsets[generation] = cursor
    cursor += getGenerationStyle(generation).bandHeight
  }

  return {
    offsets,
    totalHeight: cursor + 180
  }
}

const computeHierarchicalLayout = (rootData, measureText) => {
  const flat = flattenTree(rootData)
  const maxGeneration = Math.max(...flat.map((node) => node.generation || 0))
  const { offsets, totalHeight } = computeGenerationOffsets(maxGeneration)

  for (const node of flat) {
    const style = getGenerationStyle(node.generation)
    const textWidth = measureText(node.fullName, style.fontSize, 800)
    node.layout = {
      style,
      labelWidth: Math.max(style.minWidth, textWidth + style.paddingX * 2),
      labelHeight: style.labelHeight
    }
  }

  const hierarchyRoot = d3.hierarchy(rootData)

  const layoutTree = d3.tree()
    .nodeSize([54, 100])
    .separation((a, b) => {
      const aw = a.data.layout.labelWidth
      const bw = b.data.layout.labelWidth
      const widthFactor = (aw + bw) / 110
      const sameParentFactor = a.parent === b.parent ? 1.25 : 1.85
      const upperGenerationBoost = Math.min(a.depth, b.depth) <= 2 ? 1.25 : 1
      return widthFactor * sameParentFactor * upperGenerationBoost
    })

  layoutTree(hierarchyRoot)

  let minX = Infinity
  let maxX = -Infinity

  hierarchyRoot.each((node) => {
    minX = Math.min(minX, node.x)
    maxX = Math.max(maxX, node.x)
  })

  const shiftX = 220 - minX

  hierarchyRoot.each((node) => {
    node.data.layout.x = node.x + shiftX
    node.data.layout.y = offsets[node.depth] + node.data.layout.labelHeight / 2
    node.data.layout.depth = node.depth
  })

  const width = maxX - minX + 440
  const nodes = hierarchyRoot.descendants().map((entry) => entry.data)
  const links = hierarchyRoot.links().map((link) => ({
    source: link.source.data,
    target: link.target.data
  }))

  return {
    root: rootData,
    nodes,
    links,
    width,
    height: totalHeight,
    maxGeneration,
    generationOffsets: offsets
  }
}

const buildBranchPath = (source, target) => {
  const sourceBottomY = source.layout.y + source.layout.labelHeight / 2
  const targetTopY = target.layout.y - target.layout.labelHeight / 2
  const verticalDistance = targetTopY - sourceBottomY
  const splitY = sourceBottomY + clamp(verticalDistance * 0.3, 24, 58)
  const settleY = targetTopY - clamp(verticalDistance * 0.22, 18, 34)
  const midX = source.layout.x + (target.layout.x - source.layout.x) * 0.5

  return [
    `M ${source.layout.x} ${sourceBottomY}`,
    `C ${source.layout.x} ${splitY}, ${midX} ${splitY}, ${midX} ${(splitY + settleY) / 2}`,
    `S ${target.layout.x} ${settleY}, ${target.layout.x} ${targetTopY}`
  ].join(' ')
}

const leafPath = (width, height) => {
  const tip = Math.max(9, width * 0.1)
  const midY = height / 2

  return [
    `M ${tip} 0`,
    `H ${width - tip}`,
    `Q ${width} ${midY}, ${width - tip} ${height}`,
    `H ${tip}`,
    `Q 0 ${midY}, ${tip} 0`,
    'Z'
  ].join(' ')
}

const TreeNode = ({ node }) => {
  const style = node.layout.style
  const width = node.layout.labelWidth
  const height = node.layout.labelHeight
  const x = node.layout.x - width / 2
  const y = node.layout.y - height / 2
  const useLeafShape = node.generation >= 5
  const isUpper = node.generation <= 3

  return (
    <g transform={`translate(${x}, ${y})`}>
      {useLeafShape ? (
        <path
          d={leafPath(width, height)}
          fill={style.fill}
          stroke={style.leaf}
          strokeWidth="1.4"
          opacity="0.98"
        />
      ) : (
        <rect
          width={width}
          height={height}
          rx={isUpper ? 24 : 18}
          fill={style.fill}
          stroke={style.leaf}
          strokeWidth={isUpper ? 2.2 : 1.5}
          opacity="0.98"
        />
      )}

      <text
        x={width / 2}
        y={height / 2 + style.fontSize * 0.1}
        textAnchor="middle"
        fontSize={style.fontSize}
        fontWeight={isUpper ? 800 : 700}
        fill={style.text}
        style={{ fontFamily: '"Cairo", "Noto Naskh Arabic", serif', pointerEvents: 'none' }}
      >
        {node.fullName}
      </text>
    </g>
  )
}

const GenerationLegend = ({ layout }) => {
  const items = Array.from({ length: layout.maxGeneration + 1 }, (_, generation) => generation)

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((generation) => {
        const style = getGenerationStyle(generation)
        return (
          <div
            key={generation}
            className="rounded-[28px] border border-white/70 bg-white/84 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <div className="relative mt-1 h-11 w-11 shrink-0">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `linear-gradient(135deg, ${style.leaf}, ${style.fill})` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-stone-800">
                  {generation}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-500">Generation</div>
                <div className="mt-1 text-lg font-black text-stone-900">الجيل {generation}</div>
                <div className="mt-1 text-sm text-stone-600">
                  مستوى رأسي ثابت بارتفاع {Math.round(style.bandHeight)}px
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const BranchGateway = ({ payload, rootBranches, sourceLabel, onSelect }) => {
  return (
    <div
      className="min-h-screen bg-[#f4ecde]"
      dir="rtl"
      style={{
        backgroundImage:
          'radial-gradient(circle at top, rgba(251,191,36,0.12), transparent 22%), radial-gradient(circle at 85% 16%, rgba(34,197,94,0.13), transparent 20%), linear-gradient(180deg, rgba(255,255,255,0.58), rgba(244,236,222,0.96))'
      }}
    >
      <header className="border-b border-white/40 bg-[linear-gradient(135deg,#24412f,#436244,#647946)] text-white shadow-[0_20px_55px_rgba(31,59,45,0.28)]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                to="/family-tree-test"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15"
              >
                العودة للشجرة المتدرجة
              </Link>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.34em] text-lime-100/85">Branch Gateway</p>
                <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                  بوابة الفروع الرئيسية للمشجرات العضوية
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
                  اختر أحد الفروع الرئيسية لتظهر مشجرته وحدها. بهذا تصبح قراءة العلاقات بين الآباء والأبناء أوضح بكثير من عرض جميع الفروع معًا.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">المصدر</div>
                <div className="mt-1 text-sm font-bold text-white">{sourceLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">الفروع</div>
                <div className="mt-1 text-2xl font-black text-white">{rootBranches.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">أصل الشجرة</div>
                <div className="mt-1 text-sm font-bold text-white">{payload.fullName}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">إجمالي الأشخاص</div>
                <div className="mt-1 text-2xl font-black text-white">{countSubtreeNodes(payload)}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[34px] border border-stone-200 bg-white/84 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Main Branches</p>
            <h2 className="mt-2 text-2xl font-black text-stone-900">اختر الفرع المراد عرضه</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              ضغط أي بطاقة يفتح مشجرة الفرع وحده وفق التسلسل الجيلي العام، مع بقاء الفروع الأخرى خارج الشاشة حتى لا يختلط المعنى.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {rootBranches.map((branch) => {
              const shortName = getBranchShortName(branch)
              const style = getGenerationStyle(branch.generation || 1)
              const branchCount = countSubtreeNodes(branch)

              return (
                <button
                  key={branch.id}
                  onClick={() => onSelect(branch.id)}
                  className="group rounded-[30px] border border-white/70 bg-white p-6 text-right shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-500">Branch</div>
                      <h3 className="mt-2 text-3xl font-black text-stone-900">{shortName}</h3>
                      <p className="mt-2 text-sm leading-7 text-stone-600">{branch.fullName}</p>
                    </div>

                    <div
                      className="h-14 w-14 shrink-0 rounded-full border border-white/80 shadow-inner"
                      style={{ background: `linear-gradient(135deg, ${style.leaf}, ${style.fill})` }}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
                      {branchCount} اسم
                    </span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
                      يبدأ من الجيل {branch.generation}
                    </span>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition group-hover:text-emerald-800">
                    افتح المشجرة
                    <span>‹</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

const RecoveryOrganicTreePage = () => {
  const [payload, setPayload] = useState(null)
  const [sourceLabel, setSourceLabel] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [viewport, setViewport] = useState({ width: 1400, height: 920 })
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const viewportGroupRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const initialTransformRef = useRef(d3.zoomIdentity)

  useEffect(() => {
    const loadTree = async () => {
      try {
        setLoading(true)
        setError(null)

        let json = null
        let label = null

        for (const url of RECOVERY_TREE_URLS) {
          const response = await fetch(url, { cache: 'no-store' })
          if (!response.ok) continue
          json = await response.json()
          label = url.includes('browser-family-tree') ? 'نسخة المتصفح المسترجعة' : 'نسخة إعادة البناء'
          break
        }

        if (!json) {
          throw new Error('Failed to load recovery tree payload')
        }

        setPayload(json.root ? mapRecoveredNode(json.root) : mapBrowserNode(json))
        setSourceLabel(label || '')
      } catch (loadError) {
        console.error(loadError)
        setError('تعذر تحميل الشجرة العضوية')
      } finally {
        setLoading(false)
      }
    }

    loadTree()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return undefined

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewport({
          width: Math.max(320, entry.contentRect.width),
          height: Math.max(540, entry.contentRect.height)
        })
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const rootBranches = useMemo(() => {
    if (!payload?.children?.length) return []
    return sortRootBranches(payload.children)
  }, [payload])

  const activeTree = useMemo(() => {
    if (!payload || !selectedBranchId) return null
    return rootBranches.find((branch) => branch.id === selectedBranchId) || null
  }, [payload, rootBranches, selectedBranchId])

  const layout = useMemo(() => {
    if (!activeTree) return null
    return computeHierarchicalLayout(activeTree, createTextMeasurer())
  }, [activeTree])

  useEffect(() => {
    if (!layout || !svgRef.current || !viewportGroupRef.current) return undefined

    const svg = d3.select(svgRef.current)
    const viewportGroup = d3.select(viewportGroupRef.current)

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.18, 4.2])
      .on('zoom', (event) => {
        viewportGroup.attr('transform', event.transform)
      })

    zoomBehaviorRef.current = zoomBehavior
    svg.call(zoomBehavior)

    const baseScale = Math.min(
      1,
      Math.max(
        0.26,
        Math.min(
          viewport.width / (layout.width + 120),
          viewport.height / (layout.height + 90)
        )
      )
    )

    const initialTransform = d3.zoomIdentity
      .translate(
        Math.max(20, (viewport.width - layout.width * baseScale) / 2),
        18
      )
      .scale(baseScale)

    initialTransformRef.current = initialTransform
    svg.call(zoomBehavior.transform, initialTransform)

    return () => {
      svg.on('.zoom', null)
    }
  }, [layout, viewport.width, viewport.height])

  const zoomBy = (factor) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current).transition().duration(240).call(zoomBehaviorRef.current.scaleBy, factor)
  }

  const resetView = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return
    d3.select(svgRef.current).transition().duration(320).call(zoomBehaviorRef.current.transform, initialTransformRef.current)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#e8f5d8_38%,_#fafaf9_78%)]" dir="rtl">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[32px] border border-white/70 bg-white/85 px-10 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
            <div className="mx-auto mb-5 h-16 w-16 rounded-full border-4 border-emerald-700 border-t-transparent animate-spin" />
            <p className="text-lg font-black text-emerald-900">جارٍ تجهيز بوابة المشجرات العضوية...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#e8f5d8_38%,_#fafaf9_78%)]" dir="rtl">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-lg rounded-[32px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
            <div className="mb-4 text-5xl font-black text-red-600">!</div>
            <h2 className="mb-2 text-xl font-black text-red-700">{error || 'لا توجد بيانات للعرض'}</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedBranchId || !activeTree || !layout) {
    return (
      <BranchGateway
        payload={payload}
        rootBranches={rootBranches}
        sourceLabel={sourceLabel}
        onSelect={setSelectedBranchId}
      />
    )
  }

  return (
    <div
      className="min-h-screen bg-[#f4ecde]"
      dir="rtl"
      style={{
        backgroundImage:
          'radial-gradient(circle at top, rgba(251,191,36,0.12), transparent 22%), radial-gradient(circle at 85% 16%, rgba(34,197,94,0.13), transparent 20%), linear-gradient(180deg, rgba(255,255,255,0.58), rgba(244,236,222,0.96))'
      }}
    >
      <header className="border-b border-white/40 bg-[linear-gradient(135deg,#24412f,#436244,#647946)] text-white shadow-[0_20px_55px_rgba(31,59,45,0.28)]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setSelectedBranchId(null)}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15"
              >
                العودة لبوابة الفروع
              </button>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.34em] text-lime-100/85">True Generation Tree</p>
                <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                  مشجرة {getBranchShortName(activeTree)} وفق التسلسل الجيلي العام
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
                  هذه الشجرة تعرض فرع {getBranchShortName(activeTree)} فقط، مع بقاء البناء هرميًا واضحًا:
                  الجذر المحلي للفرع ثم أبناؤه ثم الأحفاد في مستويات جيلية متتابعة وصريحة.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">الفرع</div>
                <div className="mt-1 text-sm font-bold text-white">{getBranchShortName(activeTree)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">المصدر</div>
                <div className="mt-1 text-sm font-bold text-white">{sourceLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">أسماء الفرع</div>
                <div className="mt-1 text-2xl font-black text-white">{countSubtreeNodes(activeTree)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-lime-100/75">أعلى جيل</div>
                <div className="mt-1 text-2xl font-black text-white">{layout.maxGeneration}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[30px] border border-stone-200 bg-white/84 p-5 shadow-[0_20px_65px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Hierarchy Principle</p>
              <h2 className="mt-2 text-2xl font-black text-stone-900">كل فرع له مشجرته الخاصة</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                الآن كل فرع رئيسي يفتح منفصلًا عن غيره، لذلك تصبح العلاقات بين الآباء والأبناء داخل الفرع أوضح، وتختفي ضوضاء الفروع الأخرى من المشهد.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => zoomBy(1.2)}
                className="rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
              >
                تكبير
              </button>
              <button
                onClick={() => zoomBy(1 / 1.2)}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
              >
                تصغير
              </button>
              <button
                onClick={resetView}
                className="rounded-2xl border border-stone-200 bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200"
              >
                إعادة التموضع
              </button>
            </div>
          </div>
        </section>

        <GenerationLegend layout={layout} />

        <section
          ref={containerRef}
          className="relative h-[80vh] overflow-hidden rounded-[34px] border border-stone-200 bg-[linear-gradient(180deg,#f8f2e5,#fdfbf6)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
        >
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage: Array.from({ length: layout.maxGeneration + 1 }, (_, generation) => {
                const top = layout.generationOffsets[generation]
                return `linear-gradient(to bottom, transparent ${top}px, rgba(120,113,108,0.06) ${top}px, rgba(120,113,108,0.06) ${top + getGenerationStyle(generation).bandHeight}px, transparent ${top + getGenerationStyle(generation).bandHeight}px)`
              }).join(',')
            }}
          />

          <svg
            ref={svgRef}
            width={viewport.width}
            height={viewport.height}
            className="relative z-10 h-full w-full cursor-grab active:cursor-grabbing"
          >
            <defs>
              {Array.from({ length: layout.maxGeneration + 1 }, (_, generation) => {
                const style = getGenerationStyle(generation)
                return (
                  <linearGradient
                    key={`branch-gradient-${generation}`}
                    id={`branch-gradient-${generation}`}
                    x1="0%"
                    x2="100%"
                    y1="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={style.bark} stopOpacity="0.95" />
                    <stop offset="100%" stopColor={style.leaf} stopOpacity="0.86" />
                  </linearGradient>
                )
              })}

              <filter id="tree-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g ref={viewportGroupRef}>
              <path
                d={`M ${layout.root.layout.x} ${layout.root.layout.y - 128} C ${layout.root.layout.x} ${layout.root.layout.y - 92}, ${layout.root.layout.x} ${layout.root.layout.y - 46}, ${layout.root.layout.x} ${layout.root.layout.y - layout.root.layout.labelHeight / 2}`}
                stroke="url(#branch-gradient-0)"
                strokeWidth="30"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
                filter="url(#tree-soft-glow)"
              />

              {layout.links.map((link) => (
                <path
                  key={`${link.source.id}-${link.target.id}`}
                  d={buildBranchPath(link.source, link.target)}
                  fill="none"
                  stroke={`url(#branch-gradient-${Math.min(link.source.generation, layout.maxGeneration)})`}
                  strokeWidth={link.source.layout.style.branchWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.96"
                />
              ))}

              {layout.nodes.map((node) => (
                <TreeNode key={node.id} node={node} />
              ))}
            </g>
          </svg>
        </section>
      </main>
    </div>
  )
}

export default RecoveryOrganicTreePage

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  RECOVERY_TREE_URLS,
  normalizeRealTreePayload,
  getTopLevelBranchTrees,
  getBranchShortName,
  countRealTreeMembers,
  buildRealTreeNodeIndex,
  getRealTreeAncestorIds,
  findNodesByQuery,
  flattenRealTree
} from '../real-tree/realTreeDataModel'
import { layoutRealTreeBranch } from '../real-tree/realTreeEngine'
import RealTreeInteractionLayer from '../real-tree/RealTreeInteractionLayer'
import {
  TreeVisualizationMode,
  TREE_VISUALIZATION_MODE_LIST,
  TREE_VISUALIZATION_MODE_META
} from '../real-tree/TreeVisualizationMode'

const TARGET_SELECTOR_DEPTH = 3

const loadRealTreePayload = async () => {
  for (const url of RECOVERY_TREE_URLS) {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) continue

    const payload = await response.json()
    return {
      tree: normalizeRealTreePayload(payload),
      sourceLabel: url.includes('browser-family-tree') ? 'نسخة المتصفح المسترجعة' : 'نسخة إعادة البناء'
    }
  }

  throw new Error('تعذر تحميل بيانات الشجرة الحقيقية')
}

const ModeSwitcher = () => (
  <div className="flex flex-wrap gap-2">
    {TREE_VISUALIZATION_MODE_LIST.map((mode) => {
      const item = TREE_VISUALIZATION_MODE_META[mode]
      const isActive = mode === TreeVisualizationMode.REAL_TREE

      return (
        <Link
          key={mode}
          to={item.route}
          className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            isActive
              ? 'bg-stone-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)]'
              : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
          }`}
        >
          {item.shortLabel}
        </Link>
      )
    })}
  </div>
)

const SelectionCard = ({ node, isActive, onSelect }) => {
  const shortName = getBranchShortName(node)
  const childCount = (node.children || []).length

  return (
    <button
      onClick={() => onSelect(node.id)}
      className={`rounded-[28px] border p-5 text-right transition ${
        isActive
          ? 'border-emerald-400 bg-emerald-50/90 shadow-[0_18px_60px_rgba(16,185,129,0.16)]'
          : 'border-white/70 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(15,23,42,0.12)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-500">Selection</div>
          <h3 className="mt-2 text-2xl font-black text-stone-900">{shortName}</h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">{node.fullName}</p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#f3e2b5,#8c5a2e)] text-xs font-black text-white">
          {node.generation}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
          {childCount} أبناء
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
          {countRealTreeMembers(node)} فرد
        </span>
      </div>
    </button>
  )
}

const SelectorLevel = ({ title, subtitle, nodes, selectedId, onSelect }) => {
  if (!nodes.length) return null

  return (
    <section className="rounded-[32px] border border-stone-200 bg-white/84 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Step</p>
        <h2 className="mt-2 text-2xl font-black text-stone-900">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-stone-600">{subtitle}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nodes.map((node) => (
          <SelectionCard
            key={node.id}
            node={node}
            isActive={node.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

const SelectionBreadcrumbs = ({ pathNodes, onSelectLevel }) => {
  if (!pathNodes.length) return null

  return (
    <section className="rounded-[28px] border border-stone-200 bg-white/84 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.24em] text-stone-500">Path</span>
        {pathNodes.map((node, index) => (
          <React.Fragment key={node.id}>
            <button
              onClick={() => onSelectLevel(index, node.id)}
              className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-white"
            >
              {getBranchShortName(node)}
            </button>
            {index < pathNodes.length - 1 && <span className="text-stone-400">/</span>}
          </React.Fragment>
        ))}
      </div>
    </section>
  )
}

const PersonDetailsPanel = ({
  selectedNode,
  nodeIndex,
  collapsedIds,
  onToggleCollapse,
  onExpandAncestors
}) => {
  if (!selectedNode) {
    return (
      <aside className="rounded-[32px] border border-stone-200 bg-white/84 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-bold uppercase tracking-[0.26em] text-stone-500">Details</p>
        <h3 className="mt-2 text-xl font-black text-stone-900">تفاصيل الشخص</h3>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          اختر أي شخص من المشجرة لعرض بياناته أو لطي ذريته وفتح مساره.
        </p>
      </aside>
    )
  }

  const parent = selectedNode.parentId ? nodeIndex.get(selectedNode.parentId) : null
  const isCollapsed = collapsedIds.has(selectedNode.id)

  return (
    <aside className="rounded-[32px] border border-stone-200 bg-white/84 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.26em] text-stone-500">Person Details</p>
      <h3 className="mt-2 text-2xl font-black text-stone-900">{selectedNode.fullName}</h3>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-stone-100 px-3 py-1 font-bold text-stone-700">
          الجيل {selectedNode.generation}
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1 font-bold text-stone-700">
          {selectedNode.descendantCount} ضمن هذا الفرع
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1 font-bold text-stone-700">
          {selectedNode.childCount} أبناء مباشرين
        </span>
      </div>

      <div className="mt-5 space-y-3 text-sm text-stone-700">
        {parent && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Parent</div>
            <div className="mt-1 font-bold text-stone-900">{parent.fullName}</div>
          </div>
        )}
        {selectedNode.nickname && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Nickname</div>
            <div className="mt-1 font-bold text-stone-900">{selectedNode.nickname}</div>
          </div>
        )}
        {selectedNode.birthPlace && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Birth Place</div>
            <div className="mt-1 font-bold text-stone-900">{selectedNode.birthPlace}</div>
          </div>
        )}
        {selectedNode.currentResidence && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Residence</div>
            <div className="mt-1 font-bold text-stone-900">{selectedNode.currentResidence}</div>
          </div>
        )}
        {selectedNode.occupation && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Occupation</div>
            <div className="mt-1 font-bold text-stone-900">{selectedNode.occupation}</div>
          </div>
        )}
        {selectedNode.fullLineageName && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Lineage</div>
            <div className="mt-1 leading-7 text-stone-900">{selectedNode.fullLineageName}</div>
          </div>
        )}
        {selectedNode.notes && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-stone-500">Notes</div>
            <div className="mt-1 leading-7 text-stone-900">{selectedNode.notes}</div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {selectedNode.childCount > 0 && (
          <button
            onClick={() => onToggleCollapse(selectedNode.id)}
            className="rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
          >
            {isCollapsed ? 'إظهار الذرية' : 'طي الذرية'}
          </button>
        )}
        <button
          onClick={() => onExpandAncestors(selectedNode.id)}
          className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
        >
          فتح المسار إليه
        </button>
      </div>
    </aside>
  )
}

const RealTreePage = () => {
  const [rootTree, setRootTree] = useState(null)
  const [sourceLabel, setSourceLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectionPathIds, setSelectionPathIds] = useState([])
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedNodeId, setFocusedNodeId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await loadRealTreePayload()
        setRootTree(result.tree)
        setSourceLabel(result.sourceLabel)
      } catch (loadError) {
        console.error(loadError)
        setError(loadError.message || 'تعذر تحميل بيانات الشجرة الحقيقية')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const rootNodeIndex = useMemo(() => (rootTree ? buildRealTreeNodeIndex(rootTree) : new Map()), [rootTree])
  const topLevelBranches = useMemo(() => getTopLevelBranchTrees(rootTree), [rootTree])

  useEffect(() => {
    if (!selectionPathIds.length && topLevelBranches.length > 0) {
      setSelectionPathIds([topLevelBranches[0].id])
    }
  }, [topLevelBranches, selectionPathIds.length])

  const selectionPathNodes = useMemo(() => {
    return selectionPathIds.map((id) => rootNodeIndex.get(id)).filter(Boolean)
  }, [selectionPathIds, rootNodeIndex])

  const selectorLevels = useMemo(() => {
    const levels = [
      {
        title: 'اختر الفرع الرئيسي',
        subtitle: 'ابدأ من أحد الفروع الرئيسية: صالح أو زهار أو إبراهيم.',
        nodes: topLevelBranches,
        selectedId: selectionPathIds[0] || null
      }
    ]

    let currentNode = selectionPathIds[0] ? rootNodeIndex.get(selectionPathIds[0]) : null

    for (let levelIndex = 1; levelIndex < TARGET_SELECTOR_DEPTH; levelIndex += 1) {
      if (!currentNode || !(currentNode.children || []).length) break

      levels.push({
        title: `اختر من أبناء ${currentNode.fullName}`,
        subtitle: 'هذا المستوى يفتح لك الفرع التالي فقط حتى نصل إلى المشجرة المستقلة.',
        nodes: currentNode.children,
        selectedId: selectionPathIds[levelIndex] || null
      })

      currentNode = selectionPathIds[levelIndex] ? rootNodeIndex.get(selectionPathIds[levelIndex]) : null
    }

    return levels
  }, [topLevelBranches, selectionPathIds, rootNodeIndex])

  const renderRoot = useMemo(() => {
    if (!selectionPathNodes.length) return null

    const lastNode = selectionPathNodes[selectionPathNodes.length - 1]
    const hasChildren = Boolean((lastNode.children || []).length)

    if (selectionPathNodes.length >= TARGET_SELECTOR_DEPTH || !hasChildren) {
      return lastNode
    }

    return null
  }, [selectionPathNodes])

  const renderRootIndex = useMemo(() => {
    return renderRoot ? buildRealTreeNodeIndex(renderRoot) : new Map()
  }, [renderRoot])

  const searchResults = useMemo(() => {
    return renderRoot ? findNodesByQuery(renderRoot, searchQuery).slice(0, 12) : []
  }, [renderRoot, searchQuery])

  const layout = useMemo(() => {
    if (!renderRoot) return null
    return layoutRealTreeBranch(renderRoot, collapsedIds)
  }, [renderRoot, collapsedIds])

  const visibleNodeIndex = layout?.nodeIndex || new Map()
  const visibleNodes = useMemo(() => layout?.nodes || [], [layout])

  const matchedNodeIds = useMemo(() => {
    if (!searchQuery) return new Set()
    return new Set(searchResults.map((node) => node.id))
  }, [searchQuery, searchResults])

  useEffect(() => {
    if (!renderRoot) {
      setCollapsedIds(new Set())
      setFocusedNodeId(null)
      setSelectedNodeId(null)
      return
    }

    setCollapsedIds(new Set())
    setFocusedNodeId(renderRoot.id)
    setSelectedNodeId(renderRoot.id)
  }, [renderRoot?.id])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return visibleNodeIndex.get(selectedNodeId) || renderRootIndex.get(selectedNodeId) || null
  }, [selectedNodeId, visibleNodeIndex, renderRootIndex])

  const handleSelectLevel = (levelIndex, nodeId) => {
    setSelectionPathIds((prev) => [...prev.slice(0, levelIndex), nodeId])
    setSearchQuery('')
  }

  const resetSelection = () => {
    if (!topLevelBranches.length) return
    setSelectionPathIds([topLevelBranches[0].id])
    setSearchQuery('')
  }

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId)
    setFocusedNodeId(nodeId)
  }

  const toggleCollapse = (nodeId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
    setFocusedNodeId(nodeId)
  }

  const expandAncestors = (nodeId) => {
    const ancestors = getRealTreeAncestorIds(renderRootIndex, nodeId)
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      for (const ancestorId of ancestors) {
        next.delete(ancestorId)
      }
      next.delete(nodeId)
      return next
    })
    setSelectedNodeId(nodeId)
    setFocusedNodeId(nodeId)
  }

  const collapseAllButRoot = () => {
    if (!renderRoot) return

    const next = new Set(
      flattenRealTree(renderRoot, [])
        .filter((node) => (node.children || []).length > 0)
        .map((node) => node.id)
    )

    next.delete(renderRoot.id)
    setCollapsedIds(next)
    setSelectedNodeId(renderRoot.id)
    setFocusedNodeId(renderRoot.id)
  }

  const expandAll = () => {
    setCollapsedIds(new Set())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf2d4,_#f4efe5_45%,_#fafaf9_78%)]" dir="rtl">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[32px] border border-white/70 bg-white/85 px-10 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
            <div className="mx-auto mb-5 h-16 w-16 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
            <p className="text-lg font-black text-emerald-900">جارٍ تجهيز نظام Real Tree للفروع الرئيسية...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !rootTree) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fbf2d4,_#f4efe5_45%,_#fafaf9_78%)]" dir="rtl">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-lg rounded-[32px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
            <div className="mb-4 text-5xl font-black text-red-600">!</div>
            <h2 className="text-xl font-black text-red-700">{error || 'تعذر تحميل الشجرة الحقيقية'}</h2>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#f4ecde]"
      dir="rtl"
      style={{
        backgroundImage:
          'radial-gradient(circle at top, rgba(251,191,36,0.14), transparent 22%), radial-gradient(circle at 85% 16%, rgba(34,197,94,0.13), transparent 20%), linear-gradient(180deg, rgba(255,255,255,0.58), rgba(244,236,222,0.96))'
      }}
    >
      <header className="border-b border-white/40 bg-[linear-gradient(135deg,#3e2614,#6b3f1d,#8c5a2e)] text-white shadow-[0_20px_55px_rgba(62,38,20,0.26)]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                to="/family-tree"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15"
              >
                العودة
              </Link>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.34em] text-amber-100/85">Real Tree Mode</p>
                <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                  الشجرة الحقيقية على مسار فروع متدرج
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/85 sm:text-base">
                  اختر أولاً الفرع الرئيسي، ثم أبناءه، ثم أبناء الأبناء. بعد ذلك تُفتح المشجرة
                  الخاصة بذلك الفرع فقط، حتى يبقى التحكم واضحاً ولا تتداخل الأغصان.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-amber-100/75">المصدر</div>
                <div className="mt-1 text-sm font-bold text-white">{sourceLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-amber-100/75">الفروع الرئيسية</div>
                <div className="mt-1 text-2xl font-black text-white">{topLevelBranches.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-amber-100/75">جذر العائلة</div>
                <div className="mt-1 text-sm font-bold text-white">{rootTree.fullName}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-amber-100/75">الأشخاص</div>
                <div className="mt-1 text-2xl font-black text-white">{countRealTreeMembers(rootTree)}</div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <ModeSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-stone-200 bg-white/84 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Selection Architecture</p>
              <h2 className="mt-2 text-2xl font-black text-stone-900">التنقل بالمراحل قبل فتح المشجرة</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">
                بدلاً من تحميل فرع ضخم دفعة واحدة، يتم النزول تدريجياً حتى نصل إلى الأب المناسب
                تقريباً عند الجيل الرابع، ثم نعرض له مشجرة مستقلة فقط.
              </p>
            </div>

            <button
              onClick={resetSelection}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
            >
              إعادة اختيار المسار
            </button>
          </div>
        </section>

        <SelectionBreadcrumbs pathNodes={selectionPathNodes} onSelectLevel={handleSelectLevel} />

        {selectorLevels.map((level, index) => (
          <SelectorLevel
            key={`selector-level-${index}`}
            title={level.title}
            subtitle={level.subtitle}
            nodes={level.nodes}
            selectedId={level.selectedId}
            onSelect={(nodeId) => handleSelectLevel(index, nodeId)}
          />
        ))}

        {!renderRoot && selectionPathNodes.length > 0 && (
          <section className="rounded-[32px] border border-stone-200 bg-white/84 p-6 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-black text-stone-900">اختر مستوى فرعي إضافي</h3>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              لم نصل بعد إلى الجذر المناسب للمشجرة. تابع اختيار الأبناء في المستوى التالي ليتم
              فتح المشجرة الخاصة بهذا الفرع فقط.
            </p>
          </section>
        )}

        {renderRoot && layout && (
          <div className="grid gap-6 xl:grid-cols-[1.7fr,0.9fr]">
            <div className="space-y-6">
              <section className="rounded-[32px] border border-stone-200 bg-white/84 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Independent Tree</p>
                    <h2 className="mt-2 text-2xl font-black text-stone-900">
                      مشجرة {getBranchShortName(renderRoot)}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      هذه المشجرة تخص الفرع المختار فقط، وهو ما يقلل التداخل بشكل كبير ويجعل
                      المراجعة أسرع وأكثر دقة.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={expandAll}
                      className="rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
                    >
                      فتح الجميع
                    </button>
                    <button
                      onClick={collapseAllButRoot}
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
                    >
                      طي الفروع
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="text-xs text-stone-500">الجذر المختار</div>
                    <div className="mt-1 text-xl font-black text-stone-900">{getBranchShortName(renderRoot)}</div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="text-xs text-stone-500">الأشخاص الظاهرون</div>
                    <div className="mt-1 text-xl font-black text-stone-900">{visibleNodes.length}</div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="text-xs text-stone-500">إجمالي أفراد هذا الفرع</div>
                    <div className="mt-1 text-xl font-black text-stone-900">{countRealTreeMembers(renderRoot)}</div>
                  </div>
                </div>
              </section>

              <RealTreeInteractionLayer
                layout={layout}
                selectedNodeId={selectedNodeId}
                matchedNodeIds={matchedNodeIds}
                focusNodeId={focusedNodeId}
                onNodeSelect={handleSelectNode}
              />
            </div>

            <div className="space-y-6">
              <section className="rounded-[32px] border border-stone-200 bg-white/84 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-stone-500">Branch Search</p>
                <h3 className="mt-2 text-xl font-black text-stone-900">ابحث داخل هذا الفرع</h3>

                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ابحث بالاسم أو اللقب..."
                  className="mt-4 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                />

                <div className="mt-4 space-y-2">
                  {searchQuery && searchResults.length === 0 && (
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                      لا توجد نتيجة مطابقة داخل هذا الفرع.
                    </div>
                  )}

                  {searchResults.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => expandAncestors(node.id)}
                      className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-right transition hover:border-emerald-300 hover:bg-white"
                    >
                      <div>
                        <div className="text-sm font-bold text-stone-900">{node.fullName}</div>
                        <div className="mt-1 text-xs text-stone-500">الجيل {node.generation}</div>
                      </div>
                      <span className="text-sm font-bold text-emerald-700">تركيز</span>
                    </button>
                  ))}
                </div>
              </section>

              <PersonDetailsPanel
                selectedNode={selectedNode}
                nodeIndex={renderRootIndex}
                collapsedIds={collapsedIds}
                onToggleCollapse={toggleCollapse}
                onExpandAncestors={expandAncestors}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default RealTreePage

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PersonModal } from '../components/FamilyTree'

const RECOVERY_TREE_URLS = [
  '/recovery-test/browser-family-tree.json',
  '/recovery-test/rebuilt-family-tree.json'
]

const GENERATION_THEMES = [
  {
    title: 'الجذر',
    subtitle: 'الأصل الأعلى',
    marker: 'circle',
    accent: 'from-amber-500 via-orange-400 to-rose-400',
    card: 'from-amber-100 via-orange-50 to-rose-50',
    border: 'border-amber-300',
    badge: 'bg-amber-900 text-amber-50',
    soft: 'bg-amber-100 text-amber-900 border-amber-200',
    line: 'bg-amber-300'
  },
  {
    title: 'المؤسسون',
    subtitle: 'أبناء الجذر',
    marker: 'square',
    accent: 'from-emerald-600 via-green-500 to-lime-400',
    card: 'from-emerald-100 via-green-50 to-lime-50',
    border: 'border-emerald-300',
    badge: 'bg-emerald-900 text-emerald-50',
    soft: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    line: 'bg-emerald-300'
  },
  {
    title: 'الامتداد',
    subtitle: 'بدايات التفرع',
    marker: 'diamond',
    accent: 'from-teal-600 via-cyan-500 to-sky-400',
    card: 'from-teal-100 via-cyan-50 to-sky-50',
    border: 'border-cyan-300',
    badge: 'bg-cyan-900 text-cyan-50',
    soft: 'bg-cyan-100 text-cyan-900 border-cyan-200',
    line: 'bg-cyan-300'
  },
  {
    title: 'التفرع',
    subtitle: 'اتساع البيوت',
    marker: 'hex',
    accent: 'from-sky-600 via-blue-500 to-indigo-400',
    card: 'from-sky-100 via-blue-50 to-indigo-50',
    border: 'border-sky-300',
    badge: 'bg-sky-900 text-sky-50',
    soft: 'bg-sky-100 text-sky-900 border-sky-200',
    line: 'bg-sky-300'
  },
  {
    title: 'الترسخ',
    subtitle: 'استقرار الفروع',
    marker: 'pill',
    accent: 'from-indigo-600 via-violet-500 to-fuchsia-400',
    card: 'from-indigo-100 via-violet-50 to-fuchsia-50',
    border: 'border-indigo-300',
    badge: 'bg-indigo-900 text-indigo-50',
    soft: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    line: 'bg-indigo-300'
  },
  {
    title: 'الانتشار',
    subtitle: 'اتساع النسل',
    marker: 'chevron',
    accent: 'from-fuchsia-600 via-pink-500 to-rose-400',
    card: 'from-fuchsia-100 via-pink-50 to-rose-50',
    border: 'border-fuchsia-300',
    badge: 'bg-fuchsia-900 text-fuchsia-50',
    soft: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
    line: 'bg-fuchsia-300'
  },
  {
    title: 'البيوت',
    subtitle: 'استقلال الفروع',
    marker: 'badge',
    accent: 'from-rose-600 via-red-500 to-orange-400',
    card: 'from-rose-100 via-red-50 to-orange-50',
    border: 'border-rose-300',
    badge: 'bg-rose-900 text-rose-50',
    soft: 'bg-rose-100 text-rose-900 border-rose-200',
    line: 'bg-rose-300'
  },
  {
    title: 'الأحفاد',
    subtitle: 'الأفرع الواسعة',
    marker: 'ticket',
    accent: 'from-orange-600 via-amber-500 to-yellow-400',
    card: 'from-orange-100 via-amber-50 to-yellow-50',
    border: 'border-orange-300',
    badge: 'bg-orange-900 text-orange-50',
    soft: 'bg-orange-100 text-orange-900 border-orange-200',
    line: 'bg-orange-300'
  },
  {
    title: 'التشعب',
    subtitle: 'فروع كثيرة',
    marker: 'leaf',
    accent: 'from-lime-600 via-green-500 to-emerald-400',
    card: 'from-lime-100 via-green-50 to-emerald-50',
    border: 'border-lime-300',
    badge: 'bg-lime-900 text-lime-50',
    soft: 'bg-lime-100 text-lime-900 border-lime-200',
    line: 'bg-lime-300'
  },
  {
    title: 'الانتشار الكبير',
    subtitle: 'وفرة الأسماء',
    marker: 'star',
    accent: 'from-cyan-600 via-sky-500 to-blue-400',
    card: 'from-cyan-100 via-sky-50 to-blue-50',
    border: 'border-blue-300',
    badge: 'bg-blue-900 text-blue-50',
    soft: 'bg-blue-100 text-blue-900 border-blue-200',
    line: 'bg-blue-300'
  },
  {
    title: 'الجيل الحديث',
    subtitle: 'أبناء العصر الحديث',
    marker: 'kite',
    accent: 'from-violet-600 via-purple-500 to-indigo-400',
    card: 'from-violet-100 via-purple-50 to-indigo-50',
    border: 'border-violet-300',
    badge: 'bg-violet-900 text-violet-50',
    soft: 'bg-violet-100 text-violet-900 border-violet-200',
    line: 'bg-violet-300'
  },
  {
    title: 'المعاصر',
    subtitle: 'الجيل القريب',
    marker: 'flag',
    accent: 'from-pink-600 via-rose-500 to-red-400',
    card: 'from-pink-100 via-rose-50 to-red-50',
    border: 'border-pink-300',
    badge: 'bg-pink-900 text-pink-50',
    soft: 'bg-pink-100 text-pink-900 border-pink-200',
    line: 'bg-pink-300'
  },
  {
    title: 'الأحدث',
    subtitle: 'آخر امتداد ظاهر',
    marker: 'crown',
    accent: 'from-stone-700 via-zinc-600 to-slate-500',
    card: 'from-stone-100 via-zinc-50 to-slate-50',
    border: 'border-stone-300',
    badge: 'bg-stone-900 text-stone-50',
    soft: 'bg-stone-100 text-stone-900 border-stone-200',
    line: 'bg-stone-300'
  }
]

const normalizeMetadata = (metadata) => {
  const safeMetadata = metadata || {}

  return {
    nickname: safeMetadata.nickname || '',
    gender:
      safeMetadata.gender === 'أنثى'
        ? 'female'
        : safeMetadata.gender === 'ذكر'
          ? 'male'
          : safeMetadata.gender || 'unknown',
    birthDate: safeMetadata.birthDate || '',
    birthPlace: safeMetadata.birthPlace || '',
    currentResidence: safeMetadata.currentResidence || '',
    occupation: safeMetadata.occupation || '',
    notes: safeMetadata.notes || ''
  }
}

const getGenerationTheme = (generation = 0) => {
  if (generation >= 0 && generation < GENERATION_THEMES.length) {
    return GENERATION_THEMES[generation]
  }

  return GENERATION_THEMES[generation % GENERATION_THEMES.length]
}

const getMarkerStyle = (marker) => {
  if (marker === 'circle') return { className: 'rounded-full' }
  if (marker === 'square') return { className: 'rounded-xl' }
  if (marker === 'diamond') return { style: { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' } }
  if (marker === 'hex') return { style: { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' } }
  if (marker === 'pill') return { className: 'rounded-full' }
  if (marker === 'chevron') return { style: { clipPath: 'polygon(0% 0%, 82% 0%, 100% 50%, 82% 100%, 0% 100%, 18% 50%)' } }
  if (marker === 'badge') return { style: { clipPath: 'polygon(50% 0%, 88% 18%, 100% 58%, 74% 100%, 26% 100%, 0% 58%, 12% 18%)' } }
  if (marker === 'ticket') return { style: { clipPath: 'polygon(10% 0%, 90% 0%, 100% 18%, 100% 82%, 90% 100%, 10% 100%, 0% 82%, 0% 18%)' } }
  if (marker === 'leaf') return { style: { clipPath: 'polygon(50% 0%, 84% 18%, 100% 50%, 84% 82%, 50% 100%, 16% 82%, 0% 50%, 16% 18%)' } }
  if (marker === 'star') return { style: { clipPath: 'polygon(50% 0%, 61% 34%, 98% 35%, 69% 57%, 80% 95%, 50% 72%, 20% 95%, 31% 57%, 2% 35%, 39% 34%)' } }
  if (marker === 'kite') return { style: { clipPath: 'polygon(50% 0%, 100% 35%, 82% 100%, 18% 100%, 0% 35%)' } }
  if (marker === 'flag') return { style: { clipPath: 'polygon(0% 0%, 82% 0%, 100% 30%, 82% 54%, 100% 100%, 0% 100%)' } }
  if (marker === 'crown') return { style: { clipPath: 'polygon(0% 100%, 0% 36%, 18% 54%, 34% 12%, 50% 54%, 66% 12%, 82% 54%, 100% 36%, 100% 100%)' } }

  return { className: 'rounded-full' }
}

const mapRecoveredNode = (node, parent = null) => {
  const normalizedMetadata = normalizeMetadata(node.metadata)

  const mappedNode = {
    _id: node.tempId,
    fullName: node.name,
    nickname: normalizedMetadata.nickname,
    gender: normalizedMetadata.gender,
    generation: node.generation,
    birthDate: normalizedMetadata.birthDate,
    deathDate: '',
    isAlive: true,
    showStatus: false,
    birthPlace: normalizedMetadata.birthPlace,
    currentResidence: normalizedMetadata.currentResidence,
    occupation: normalizedMetadata.occupation,
    biography: '',
    notes: normalizedMetadata.notes,
    isRoot: !parent,
    siblingOrder: 0,
    fullLineageName: node.fullLineage,
    fatherName: node.relation?.fatherName || '',
    parentNode: parent,
    children: []
  }

  mappedNode.children = (node.children || []).map((child) => mapRecoveredNode(child, mappedNode))
  mappedNode.ancestors = parent ? [parent, ...(parent.ancestors || [])] : []

  return mappedNode
}

const hydrateBrowserNode = (node, parent = null) => {
  const mappedNode = {
    ...node,
    nickname: node.nickname || '',
    gender: node.gender || 'unknown',
    birthDate: node.birthDate || '',
    deathDate: node.deathDate || '',
    birthPlace: node.birthPlace || '',
    currentResidence: node.currentResidence || '',
    occupation: node.occupation || '',
    biography: node.biography || '',
    notes: node.notes || '',
    fullLineageName: node.fullLineageName || '',
    fatherName: node.fatherName || '',
    parentNode: parent,
    children: []
  }

  mappedNode.children = (node.children || []).map((child) => hydrateBrowserNode(child, mappedNode))
  mappedNode.ancestors = parent ? [parent, ...(parent.ancestors || [])] : []

  return mappedNode
}

const collectStats = (root) => {
  let totalPersons = 0
  let leafCount = 0
  let maxGeneration = 0
  const generationCounts = {}

  const walk = (node) => {
    totalPersons += 1
    const generation = node.generation || 0
    maxGeneration = Math.max(maxGeneration, generation)
    generationCounts[generation] = (generationCounts[generation] || 0) + 1

    if (!node.children || node.children.length === 0) {
      leafCount += 1
      return
    }

    for (const child of node.children) {
      walk(child)
    }
  }

  walk(root)

  return {
    totalPersons,
    leafCount,
    maxGeneration,
    totalGenerations: maxGeneration + 1,
    generationCounts
  }
}

const GenerationMarker = ({ generation, size = 'md' }) => {
  const theme = getGenerationTheme(generation)
  const markerStyle = getMarkerStyle(theme.marker)
  const sizeClass =
    size === 'lg'
      ? 'w-16 h-16'
      : size === 'sm'
        ? 'w-8 h-8'
        : 'w-11 h-11'

  return (
    <div className="relative shrink-0">
      <div className={`absolute inset-0 blur-md opacity-30 bg-gradient-to-br ${theme.accent}`} />
      <div
        className={`${sizeClass} relative border border-white/70 bg-gradient-to-br ${theme.accent} shadow-lg ${markerStyle.className || ''}`}
        style={markerStyle.style}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-white">
        {generation}
      </div>
    </div>
  )
}

const GenerationLegend = ({ stats }) => {
  const generationEntries = Object.entries(stats.generationCounts).sort((a, b) => Number(a[0]) - Number(b[0]))

  return (
    <section className="rounded-[32px] border border-stone-200 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Generation Map</p>
          <h2 className="mt-2 text-2xl font-black text-stone-900">مفتاح الأجيال</h2>
          <p className="mt-1 text-sm text-stone-600">
            لكل جيل لون وشكل خاص حتى تصبح متابعة الفروع أسهل بصريًا.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs text-stone-500">إجمالي الأشخاص</div>
            <div className="mt-1 text-2xl font-black text-stone-900">{stats.totalPersons}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs text-stone-500">عدد الأجيال</div>
            <div className="mt-1 text-2xl font-black text-stone-900">{stats.totalGenerations}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs text-stone-500">الأوراق النهائية</div>
            <div className="mt-1 text-2xl font-black text-stone-900">{stats.leafCount}</div>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="text-xs text-stone-500">أعلى جيل</div>
            <div className="mt-1 text-2xl font-black text-stone-900">{stats.maxGeneration}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {generationEntries.map(([generation, count]) => {
          const theme = getGenerationTheme(Number(generation))

          return (
            <div
              key={generation}
              className={`rounded-[24px] border bg-gradient-to-br ${theme.card} ${theme.border} p-4 shadow-sm`}
            >
              <div className="flex items-start gap-4">
                <GenerationMarker generation={Number(generation)} size="sm" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>
                      الجيل {generation}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${theme.soft}`}>
                      {count} اسم
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-black text-stone-900">{theme.title}</h3>
                  <p className="mt-1 text-sm text-stone-700">{theme.subtitle}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const TreeBranchNode = ({
  node,
  depth = 0,
  expandedIds,
  onToggle,
  onOpenPerson
}) => {
  const children = node.children || []
  const hasChildren = children.length > 0
  const isExpanded = expandedIds.has(node._id)
  const theme = getGenerationTheme(node.generation)
  const markerColumnClass =
    depth >= 8
      ? 'w-8'
      : depth >= 5
        ? 'w-10'
        : depth >= 2
          ? 'w-12'
          : 'w-16'
  const childIndentClass =
    depth >= 8
      ? 'pr-1 md:pr-2'
      : depth >= 5
        ? 'pr-2 md:pr-3'
        : depth >= 2
          ? 'pr-3 md:pr-4'
          : 'pr-4 md:pr-6'
  const childBorderClass = depth >= 5 ? 'border-r border-dashed border-stone-200' : 'border-r-2 border-dashed border-stone-300'
  const cardPaddingClass =
    depth >= 7
      ? 'p-3 md:p-4'
      : depth >= 4
        ? 'p-4 md:p-5'
        : 'p-5 md:p-6'
  const titleClass =
    depth >= 7
      ? 'text-lg'
      : depth >= 4
        ? 'text-xl'
        : 'text-2xl'

  return (
    <div className={`${depth > 0 ? 'mt-5' : ''}`}>
      <div className="flex gap-4">
        <div className={`flex ${markerColumnClass} shrink-0 flex-col items-center`}>
          <GenerationMarker generation={node.generation} />
          {hasChildren && isExpanded && (
            <div className={`mt-2 w-1 flex-1 rounded-full ${theme.line}`} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className={`relative overflow-hidden rounded-[30px] border bg-gradient-to-br ${theme.card} ${theme.border} shadow-[0_18px_55px_rgba(15,23,42,0.08)]`}>
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${theme.accent}`} />
            <div className={`absolute bottom-0 right-0 top-0 w-1.5 bg-gradient-to-b ${theme.accent}`} />

            <div className={`relative ${cardPaddingClass}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>
                      الجيل {node.generation}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${theme.soft}`}>
                      {theme.title}
                    </span>
                    {hasChildren ? (
                      <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-stone-700">
                        {children.length} ذرية مباشرة
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold text-stone-700">
                        نهاية فرع
                      </span>
                    )}
                  </div>

                  <button onClick={() => onOpenPerson(node)} className="mt-4 w-full text-right">
                    <h3 className={`${titleClass} break-words font-black leading-tight text-stone-900 transition-colors hover:text-emerald-800`}>
                      {node.fullName}
                    </h3>
                  </button>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-stone-700">
                    {node.nickname && (
                      <span className="rounded-full border border-white/70 bg-white/65 px-3 py-1">
                        اللقب: {node.nickname}
                      </span>
                    )}
                    {node.fatherName && (
                      <span className="rounded-full border border-white/70 bg-white/65 px-3 py-1">
                        الأب: {node.fatherName}
                      </span>
                    )}
                    {node.gender && node.gender !== 'unknown' && (
                      <span className="rounded-full border border-white/70 bg-white/65 px-3 py-1">
                        {node.gender === 'female' ? 'أنثى' : 'ذكر'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {hasChildren && (
                    <button
                      onClick={() => onToggle(node._id)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
                    >
                      <span>{isExpanded ? 'إخفاء الذرية' : 'إظهار الذرية'}</span>
                      <span className={`text-base transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenPerson(node)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
                  >
                    التفاصيل
                  </button>
                </div>
              </div>

              {node.fullLineageName && (
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4 text-sm leading-7 text-stone-700 break-words">
                  <div className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-stone-500">
                    Full Lineage
                  </div>
                  {node.fullLineageName}
                </div>
              )}
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className={`mt-3 ${childBorderClass} ${childIndentClass}`}>
              {children.map((child) => (
                <TreeBranchNode
                  key={child._id}
                  node={child}
                  depth={depth + 1}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  onOpenPerson={onOpenPerson}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const RecoveryTreeTestPage = () => {
  const [payload, setPayload] = useState(null)
  const [loadedSource, setLoadedSource] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadRecoveryTree = async () => {
      try {
        setLoading(true)
        setError(null)

        let json = null
        let source = null

        for (const url of RECOVERY_TREE_URLS) {
          const response = await fetch(url, { cache: 'no-store' })
          if (!response.ok) {
            continue
          }

          json = await response.json()
          source = url
          break
        }

        if (!json) {
          throw new Error('Failed to load recovery tree payload')
        }

        setPayload(json)
        setLoadedSource(source)
      } catch (loadError) {
        console.error(loadError)
        setError('تعذر تحميل شجرة الاختبار المحلية')
      } finally {
        setLoading(false)
      }
    }

    loadRecoveryTree()
  }, [])

  const tree = useMemo(() => {
    if (!payload) return null
    if (payload.root) return mapRecoveredNode(payload.root)
    if (payload._id && payload.fullName) return hydrateBrowserNode(payload)
    return null
  }, [payload])

  const stats = useMemo(() => {
    if (!tree) return null
    return collectStats(tree)
  }, [tree])

  useEffect(() => {
    if (!tree?._id) return
    setExpandedIds(new Set([tree._id]))
  }, [tree])

  const handleNodeClick = (node) => {
    setSelectedPerson({
      ...node,
      children: node.children || []
    })
  }

  const toggleNode = (nodeId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const expandFirstLevel = () => {
    if (!tree) return
    setExpandedIds(new Set([tree._id, ...(tree.children || []).map((child) => child._id)]))
  }

  const collapseToRoot = () => {
    if (!tree?._id) return
    setExpandedIds(new Set([tree._id]))
  }

  const sourceLabel =
    loadedSource === '/recovery-test/browser-family-tree.json'
      ? 'نسخة المتصفح المسترجعة'
      : 'نسخة إعادة البناء من ملفات الاسترجاع'

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#ecfccb_35%,_#f5f5f4_75%)]" dir="rtl">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-[32px] border border-white/70 bg-white/80 px-10 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
            <div className="mx-auto mb-5 h-16 w-16 rounded-full border-4 border-emerald-700 border-t-transparent animate-spin" />
            <p className="text-lg font-black text-emerald-900">جارٍ تجهيز شجرة الاختبار المحلية...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#f6f1e7]"
      dir="rtl"
      style={{
        backgroundImage:
          'radial-gradient(circle at top, rgba(251,191,36,0.16), transparent 25%), radial-gradient(circle at 85% 18%, rgba(16,185,129,0.14), transparent 20%), linear-gradient(180deg, rgba(255,255,255,0.65), rgba(245,245,244,0.92))'
      }}
    >
      <header className="sticky top-0 z-40 border-b border-white/30 bg-[linear-gradient(135deg,#022c22,#065f46,#064e3b)] text-white shadow-[0_18px_55px_rgba(2,44,34,0.35)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link
                to="/family-tree"
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-bold transition hover:bg-white/15"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                العودة
              </Link>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.38em] text-emerald-200">Recovered Family Tree</p>
                <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
                  شجرة محلية بتصميم يوضح الأجيال بصريًا
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-50/90 sm:text-base">
                  هذه النسخة مخصصة للمراجعة المحلية فقط. تم تلوين كل جيل وإعطاؤه شكلًا بصريًا مختلفًا حتى يمكن تتبع الفروع والأسماء بسهولة أكبر.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-emerald-100/80">المصدر</div>
                <div className="mt-1 text-sm font-bold text-white">{sourceLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-emerald-100/80">إجمالي الأشخاص</div>
                <div className="mt-1 text-2xl font-black text-white">{stats?.totalPersons || 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-emerald-100/80">أعلى جيل</div>
                <div className="mt-1 text-2xl font-black text-white">{stats?.maxGeneration ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <div className="text-xs text-emerald-100/80">الأوراق النهائية</div>
                <div className="mt-1 text-2xl font-black text-white">{stats?.leafCount || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="max-w-lg rounded-[32px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
              <div className="mb-4 text-5xl font-black text-red-600">!</div>
              <h2 className="mb-2 text-xl font-black text-red-700">{error}</h2>
              <p className="text-stone-600">
                تأكد من وجود ملف الاسترجاع في
                {' '}
                <code className="text-sm">client/public/recovery-test/browser-family-tree.json</code>
                {' '}
                أو
                {' '}
                <code className="text-sm">client/public/recovery-test/rebuilt-family-tree.json</code>
              </p>
            </div>
          </div>
        ) : tree && stats ? (
          <div className="space-y-6">
            <section className="rounded-[32px] border border-stone-200 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Tree Explorer</p>
                  <h2 className="mt-2 text-2xl font-black text-stone-900">عرض هرمي تدريجي أوضح للفروع</h2>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    افتح الذرية تدريجيًا فرعًا فرعًا. ستلاحظ أن لون وشكل كل بطاقة يتغيران حسب الجيل، مما يساعد على التمييز السريع بين طبقات النسب.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={expandFirstLevel}
                    className="rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
                  >
                    فتح المستوى الأول
                  </button>
                  <button
                    onClick={collapseToRoot}
                    className="rounded-2xl border border-stone-200 bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200"
                  >
                    إغلاق الكل إلى الجذر
                  </button>
                </div>
              </div>
            </section>

            <GenerationLegend stats={stats} />

            <section className="rounded-[32px] border border-stone-200 bg-white/80 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[760px]">
                  <TreeBranchNode
                    node={tree}
                    expandedIds={expandedIds}
                    onToggle={toggleNode}
                    onOpenPerson={handleNodeClick}
                  />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="rounded-[32px] border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur">
              <p className="text-lg font-bold text-stone-700">لا توجد بيانات اختبار جاهزة للعرض</p>
            </div>
          </div>
        )}
      </main>

      {selectedPerson && (
        <PersonModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  )
}

export default RecoveryTreeTestPage

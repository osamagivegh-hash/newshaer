import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import RealTreeRenderer from './RealTreeRenderer'

const RealTreeInteractionLayer = ({
  layout,
  selectedNodeId,
  matchedNodeIds,
  focusNodeId,
  onNodeSelect
}) => {
  const wrapperRef = useRef(null)
  const svgRef = useRef(null)
  const viewportGroupRef = useRef(null)
  const zoomRef = useRef(null)
  const initialTransformRef = useRef(d3.zoomIdentity)

  const [viewport, setViewport] = useState({ width: 1200, height: 820 })
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    if (!wrapperRef.current) return undefined

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewport({
          width: Math.max(340, entry.contentRect.width),
          height: Math.max(560, entry.contentRect.height)
        })
      }
    })

    observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!layout || !svgRef.current || !viewportGroupRef.current) return undefined

    const svg = d3.select(svgRef.current)
    const viewportGroup = d3.select(viewportGroupRef.current)

    const zoom = d3.zoom()
      .scaleExtent([0.2, 4.5])
      .on('zoom', (event) => {
        viewportGroup.attr('transform', event.transform)
        setZoomLevel(event.transform.k)
      })

    zoomRef.current = zoom
    svg.call(zoom)

    const fitScale = Math.min(
      1,
      Math.max(
        0.22,
        Math.min(
          viewport.width / (layout.width + 90),
          viewport.height / (layout.height + 90)
        )
      )
    )

    const initialTransform = d3.zoomIdentity
      .translate(
        Math.max(24, (viewport.width - layout.width * fitScale) / 2),
        Math.max(18, (viewport.height - layout.height * fitScale) / 2)
      )
      .scale(fitScale)

    initialTransformRef.current = initialTransform
    svg.call(zoom.transform, initialTransform)

    return () => {
      svg.on('.zoom', null)
    }
  }, [layout, viewport.width, viewport.height])

  useEffect(() => {
    if (!focusNodeId || !layout || !svgRef.current || !zoomRef.current) return

    const target = layout.nodeIndex.get(focusNodeId)
    if (!target) return

    const nextScale = Math.max(0.9, zoomLevel)
    const nextTransform = d3.zoomIdentity
      .translate(viewport.width / 2 - target.x * nextScale, viewport.height / 2 - target.y * nextScale)
      .scale(nextScale)

    d3.select(svgRef.current)
      .transition()
      .duration(280)
      .call(zoomRef.current.transform, nextTransform)
  }, [focusNodeId, layout, viewport.width, viewport.height])

  const zoomControls = useMemo(() => ({
    zoomIn: () => {
      if (!svgRef.current || !zoomRef.current) return
      d3.select(svgRef.current).transition().duration(180).call(zoomRef.current.scaleBy, 1.18)
    },
    zoomOut: () => {
      if (!svgRef.current || !zoomRef.current) return
      d3.select(svgRef.current).transition().duration(180).call(zoomRef.current.scaleBy, 1 / 1.18)
    },
    reset: () => {
      if (!svgRef.current || !zoomRef.current) return
      d3.select(svgRef.current).transition().duration(260).call(zoomRef.current.transform, initialTransformRef.current)
    }
  }), [])

  return (
    <section className="overflow-hidden rounded-[34px] border border-stone-200 bg-[linear-gradient(180deg,#f7f1e6,#fbfaf7)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 border-b border-stone-200 bg-white/80 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Real Tree Canvas</p>
          <h3 className="mt-1 text-xl font-black text-stone-900">شجرة حقيقية مستقلة لهذا الفرع</h3>
          <p className="mt-1 text-sm text-stone-600">
            سحب للتنقل، عجلة الفأرة للتكبير، واضغط على أي شخص لفتح تفاصيله أو طي ذريته.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={zoomControls.zoomIn}
            className="rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
          >
            تكبير
          </button>
          <button
            onClick={zoomControls.zoomOut}
            className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            تصغير
          </button>
          <button
            onClick={zoomControls.reset}
            className="rounded-2xl border border-stone-200 bg-stone-100 px-4 py-2.5 text-sm font-bold text-stone-700 transition hover:bg-stone-200"
          >
            إعادة التموضع
          </button>
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-700">
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      </div>

      <div ref={wrapperRef} className="relative h-[78vh] min-h-[620px] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 18%, rgba(163,230,53,0.12), transparent 22%), radial-gradient(circle at 20% 22%, rgba(250,204,21,0.12), transparent 18%), radial-gradient(circle at 82% 28%, rgba(74,222,128,0.12), transparent 18%)'
          }}
        />

        <svg
          ref={svgRef}
          width={viewport.width}
          height={viewport.height}
          className="relative z-10 h-full w-full cursor-grab active:cursor-grabbing touch-action-none"
        >
          <g ref={viewportGroupRef}>
            <RealTreeRenderer
              layout={layout}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              matchedNodeIds={matchedNodeIds}
              onNodeHover={setHoveredNodeId}
              onNodeLeave={() => setHoveredNodeId(null)}
              onNodeSelect={onNodeSelect}
            />
          </g>
        </svg>
      </div>
    </section>
  )
}

export default RealTreeInteractionLayer

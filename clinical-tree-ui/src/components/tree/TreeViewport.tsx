/** TreeViewport — pan/zoom container. Exposes fitToView, fitBranch, panToNode via ref. */
import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { PositionedNode } from '../../types/tree'

export interface TreeViewportHandle {
  fitToView: () => void
  /** Fit a set of nodes into view. animMs defaults to 300ms. padX/padY default to 60/24. */
  fitBranch: (branchNodeIds: string[], nodes: PositionedNode[], animMs?: number, padX?: number, padY?: number) => void
  /** Pan to center a node. If targetScale is provided, zoom to that scale too. */
  panToNode: (node: PositionedNode, targetScale?: number) => void
}

interface Props {
  children: React.ReactNode
  /** SVG canvas dimensions — used to clamp min/max zoom */
  canvasWidth?: number
  canvasHeight?: number
  /** Total node count — max zoom scales inversely so context is preserved */
  nodeCount?: number
}

const TreeViewport = forwardRef<TreeViewportHandle, Props>(
  ({ children, canvasWidth = 2000, canvasHeight = 2000, nodeCount = 20 }, ref) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track container dimensions via ResizeObserver
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setContainerSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // minScale: hard stop at fit-to-view — you can never zoom out past the full tree
  const fitScale = containerSize.w > 0 && containerSize.h > 0
    ? Math.min(containerSize.w / canvasWidth, containerSize.h / canvasHeight)
    : 0.15
  const minScale = Math.max(0.05, fitScale)

  // maxScale: inversely proportional to node count so you can't zoom in so far
  // that you lose all context. 40 nodes → ~2x, 10 nodes → ~3x (capped at 3).
  const maxScale = Math.max(1.2, Math.min(3.0, 80 / Math.max(nodeCount, 1)))

  useImperativeHandle(ref, () => ({
    fitToView() {
      transformRef.current?.resetTransform(300, 'easeOut')
    },

    fitBranch(branchNodeIds, nodes, animMs = 300, padX = 60, padY = 24) {
      const api = transformRef.current
      const container = containerRef.current
      if (!api || !container) return

      const branchNodes = branchNodeIds
        .map(id => nodes.find(n => n.id === id))
        .filter((n): n is PositionedNode => !!n)
      if (branchNodes.length === 0) return

      const minX = Math.min(...branchNodes.map(n => n.x))
      const maxX = Math.max(...branchNodes.map(n => n.x + n.width))
      const minY = Math.min(...branchNodes.map(n => n.y))
      const maxY = Math.max(...branchNodes.map(n => n.y + n.height))
      const bw = maxX - minX || 1
      const bh = maxY - minY || 1

      const cw = container.clientWidth
      const ch = container.clientHeight
      const scale = Math.min((cw - padX * 2) / bw, (ch - padY * 2) / bh, 2.2)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const newX = cw / 2 - cx * scale
      const newY = ch / 2 - cy * scale
      api.setTransform(newX, newY, scale, animMs, 'easeOut')
    },

    panToNode(node, targetScale) {
      const api = transformRef.current
      const container = containerRef.current
      if (!api || !container) return

      const scale = targetScale ?? api.instance.transformState.scale
      const cw = container.clientWidth
      const ch = container.clientHeight
      const cx = node.x + node.width / 2
      const cy = node.y + node.height / 2
      const newX = cw / 2 - cx * scale
      const newY = ch / 2 - cy * scale
      api.setTransform(newX, newY, scale, 300, 'easeOut')
    },
  }))

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <TransformWrapper
        ref={transformRef}
        initialScale={Math.max(minScale, Math.min(0.72, maxScale))}
        minScale={minScale}
        maxScale={maxScale}
        limitToBounds={true}
        centerZoomedOut={true}
        centerOnInit={true}
        smooth={true}
        wheel={{ smoothStep: 0.001 }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: 'fit-content', height: 'fit-content' }}
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
})

TreeViewport.displayName = 'TreeViewport'
export default TreeViewport

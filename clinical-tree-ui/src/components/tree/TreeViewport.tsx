/** TreeViewport — pan/zoom container. Exposes fitToView, fitBranch, panToNode via ref. */
import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { PositionedNode } from '../../types/tree'

export interface TreeViewportHandle {
  fitToView: () => void
  /** Fit a set of nodes into view. animMs defaults to 300ms. */
  fitBranch: (branchNodeIds: string[], nodes: PositionedNode[], animMs?: number) => void
  /** Pan to center a node. If targetScale is provided, zoom to that scale too. */
  panToNode: (node: PositionedNode, targetScale?: number) => void
}

interface Props {
  children: React.ReactNode
}

const TreeViewport = forwardRef<TreeViewportHandle, Props>(({ children }, ref) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    fitToView() {
      transformRef.current?.resetTransform(300, 'easeOut')
    },

    fitBranch(branchNodeIds, nodes, animMs = 300) {
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
      const pad = 80
      const scale = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh, 1.4)
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
        initialScale={0.72}
        minScale={0.15}
        maxScale={3}
        limitToBounds={false}
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

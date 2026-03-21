/** TreeViewport — pan/zoom container wrapping the SVG canvas */
import React from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface Props {
  children: React.ReactNode
}

export default function TreeViewport({ children }: Props) {
  return (
    <TransformWrapper
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
  )
}

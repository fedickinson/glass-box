/** Icons — inline SVG icon set. All icons share the same 16×16 viewBox.
 *  Pass `size` (px) and `color` (CSS color string) to override defaults.
 */
import React from 'react'

type IconProps = { size?: number; color?: string; strokeWidth?: number }

export function XIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4L4 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function FlagIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3.5 13.5V2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M3.5 2l8 3-8 3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PaperclipIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M12 7L7 12a3.5 3.5 0 01-4.95-4.95L7.95 2.15a2 2 0 012.83 2.83L4.66 11.1a.5.5 0 01-.71-.71L9.5 4.84"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

export function LightningIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9.5 2L4 9h5.5L6.5 14L13 7H7.5L9.5 2z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function RefreshIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M13.5 8A5.5 5.5 0 013 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M2.5 8A5.5 5.5 0 0013 11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <path d="M3 2.5v3h3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 13.5v-3h-3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ScissorsIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="4.5" cy="4.5" r="2" stroke={color} strokeWidth={strokeWidth} />
      <circle cx="4.5" cy="11.5" r="2" stroke={color} strokeWidth={strokeWidth} />
      <path d="M6.2 5.5L13 9M6.2 10.5L13 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8l4 4 6-7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CrossIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4L4 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function WarningIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2.5L1.5 13.5h13L8 2.5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6.5v3.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.6" fill={color} />
    </svg>
  )
}

export function ArrowRightIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M13 8H3M7 4L3 8l4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ConvergeIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 3.5l4.5 4.5L2 12.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 8h12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

export function ShieldIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1.5L2.5 4v5c0 3 2.5 4.5 5.5 5.5 3-1 5.5-2.5 5.5-5.5V4L8 1.5z"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

export function NodeIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth={strokeWidth} />
      <path d="M8 5v3l2 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StarIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.4l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StarFilledIcon({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5l1.8 3.6 4 .6-2.9 2.8.7 4L8 10.4l-3.6 1.9.7-4L2.2 5.7l4-.6L8 1.5z" fill={color} stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PlayIcon({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 2.5l9 5.5-9 5.5V2.5z" fill={color} stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PauseIcon({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill={color} />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill={color} />
    </svg>
  )
}

export function DotFilledIcon({ size = 8, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" fill="none">
      <circle cx="4" cy="4" r="3" fill={color} />
    </svg>
  )
}

export function ThumbUpIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M4 13V7M2 8H1a.5.5 0 0 1-.5-.5v-4A.5.5 0 0 1 1 3h3M8 1v4a1 1 0 0 1-1 1H4L2 8m6-7c0 0 1 0 2.5 2.5L13 7v4.5A1.5 1.5 0 0 1 11.5 13H5a1 1 0 0 1-1-1v-4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ThumbDownIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M10 1v6M12 6h1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-3M6 13v-4a1 1 0 0 1 1-1h3L14 6M6 13c0 0-1 0-2.5-2.5L.5 7V2.5A1.5 1.5 0 0 1 2 1h6.5a1 1 0 0 1 1 1v4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function PencilIcon({ size = 14, color = 'currentColor', strokeWidth = 1.6 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M9.5 2.5L11.5 4.5L4.5 11.5L2 12L2.5 9.5L9.5 2.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

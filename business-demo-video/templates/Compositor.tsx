/**
 * Pure React Frame Compositor & Cubic-Bezier Camera Zoom Engine.
 * Renders Google Cloud 4-Color Theme, Business Requirement Cards (GIVEN/WHEN/THEN),
 * Cubic-Bezier Camera Zoom & Pan, Floating Captions, and Bottom Progress Rail.
 */
import React from 'react'
import { GOOGLE_THEME } from './theme'

export type Region = readonly [number, number, number, number]

export interface Beat {
  readonly mark: string
  readonly reqId?: string
  readonly caption?: string
  readonly businessOutcome?: string
  readonly focus?: Region
  readonly push?: number
  readonly accentColor?: string
}

export interface Chapter {
  readonly id: number
  readonly reqId: string
  readonly title: string
  readonly given: string
  readonly when: string
  readonly then: string
  readonly businessValue?: string
  readonly color: string
  readonly startSec: number
  readonly endSec: number
}

const FRAME_W = 1920
const FRAME_H = 1080
const CAPTION_ROOM = 180
const USABLE_H = FRAME_H - CAPTION_ROOM
const MAX_PUSH = 1.42
const HOLD = 0.25

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

interface Camera {
  readonly scale: number
  readonly x: number
  readonly y: number
}

function cameraFor(region: Region, scale: number): Camera {
  const [x, y, w, h] = region
  return {
    scale,
    x: clamp(FRAME_W / 2 - scale * (x + w / 2), FRAME_W - scale * FRAME_W, 0),
    y: clamp(USABLE_H / 2 - scale * (y + h / 2), Math.min(0, FRAME_H - scale * FRAME_H), 0),
  }
}

const scaleFor = (region: Region, ceiling: number = MAX_PUSH) =>
  clamp(Math.min(FRAME_W / region[2], USABLE_H / region[3]), 1, ceiling)

/**
 * Pure React Shot component driven by currentFrame and fps passed from Playwright deterministic renderer.
 */
export function Shot({
  beat,
  videoRef,
  clipStartFrame,
  durationInFrames,
  currentFrame,
}: {
  beat: Beat
  videoRef: React.RefObject<HTMLVideoElement | null>
  clipStartFrame: number
  durationInFrames: number
  currentFrame: number
}) {
  const localFrame = Math.max(0, currentFrame - clipStartFrame)
  const rawProgress = durationInFrames > 0 ? (localFrame - durationInFrames * HOLD) / (durationInFrames * (1 - HOLD)) : 0
  const progress = clamp(rawProgress, 0, 1)
  const eased = 1 - Math.pow(1 - progress, 3)

  const rest = cameraFor([0, 0, FRAME_W, FRAME_H], 1)
  const end = beat.focus ? cameraFor(beat.focus, scaleFor(beat.focus, beat.push)) : rest

  const scale = rest.scale + (end.scale - rest.scale) * eased
  const x = rest.x + (end.x - rest.x) * eased
  const y = rest.y + (end.y - rest.y) * eased

  return (
    <div
      style={{
        position: 'relative',
        width: FRAME_W,
        height: FRAME_H,
        backgroundColor: GOOGLE_THEME.colors.ink,
        overflow: 'hidden',
        fontFamily: GOOGLE_THEME.fonts.sans,
      }}
    >
      {/* Top Google Cloud 4-Color Gradient Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: GOOGLE_THEME.layout.topBarHeight,
          background: GOOGLE_THEME.gradient,
          zIndex: 20,
        }}
      />

      {/* Video Canvas with Declarative Camera Zoom & Pan */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: FRAME_W,
            height: FRAME_H,
            objectFit: 'cover',
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        />
      </div>

      {/* Floating Business Requirement Caption Banner */}
      {beat.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: GOOGLE_THEME.layout.railHeight + 24,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(32, 33, 36, 0.92)',
            color: '#FFFFFF',
            padding: '14px 28px',
            borderRadius: 9999,
            border: `1.5px solid ${beat.accentColor ?? GOOGLE_THEME.colors.blue}`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '0.01em',
            maxWidth: 1640,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 30,
          }}
        >
          {beat.reqId && (
            <span
              style={{
                backgroundColor: beat.accentColor ?? GOOGLE_THEME.colors.blue,
                color: '#FFFFFF',
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 700,
                marginRight: 14,
                verticalAlign: 'middle',
              }}
            >
              {beat.reqId}
            </span>
          )}
          <span style={{ verticalAlign: 'middle' }}>{beat.caption}</span>
        </div>
      )}
    </div>
  )
}

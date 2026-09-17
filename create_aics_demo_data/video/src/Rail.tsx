import React from 'react';
import { GOOGLE_THEME } from './theme';

export interface ChapterInfo {
  id: number;
  reqId: string;
  title: string;
  color: string;
}

export function TopGradientBar() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: GOOGLE_THEME.layout.topBarHeight,
        background: GOOGLE_THEME.gradient,
        zIndex: 50,
      }}
    />
  );
}

export function BottomProgressRail({
  chapters,
  activeReqId,
  progressRatio,
}: {
  chapters: ChapterInfo[];
  activeReqId: string;
  progressRatio: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: GOOGLE_THEME.layout.railHeight,
        backgroundColor: 'rgba(32, 33, 36, 0.96)',
        borderTop: `1px solid ${GOOGLE_THEME.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 36px',
        zIndex: 40,
      }}
    >
      {/* Overall Progress Bar at Top of Rail */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 3,
          width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
          background: GOOGLE_THEME.gradient,
        }}
      />

      {/* Brand Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            backgroundColor: '#004098',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 15,
            padding: '5px 12px',
            borderRadius: 6,
            letterSpacing: '0.04em',
          }}
        >
          EDION × Google Cloud
        </div>
        <span style={{ color: GOOGLE_THEME.colors.textSecondary, fontSize: 15, fontWeight: 600 }}>
          AI Commerce Search (Retail API v2)
        </span>
      </div>

      {/* Business Requirements Step Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {chapters.map((ch) => {
          const isActive = ch.reqId === activeReqId;
          return (
            <div
              key={ch.reqId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 999,
                backgroundColor: isActive ? ch.color : 'rgba(255, 255, 255, 0.06)',
                border: `1.5px solid ${isActive ? ch.color : 'rgba(255, 255, 255, 0.14)'}`,
                color: isActive ? '#FFFFFF' : GOOGLE_THEME.colors.textMuted,
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  backgroundColor: isActive ? 'rgba(0,0,0,0.22)' : ch.color,
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {ch.reqId}
              </span>
              <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ch.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

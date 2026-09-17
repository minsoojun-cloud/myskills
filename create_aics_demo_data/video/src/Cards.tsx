import React from 'react';
import { GOOGLE_THEME } from './theme';
import { TopGradientBar } from './Rail';

export function BusinessRequirementIntroCard({
  reqId,
  title,
  given,
  when,
  then,
  businessValue,
  accentColor,
}: {
  reqId: string;
  title: string;
  given: string;
  when: string;
  then: string;
  businessValue: string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        backgroundColor: GOOGLE_THEME.colors.ink,
        color: GOOGLE_THEME.colors.textPrimary,
        fontFamily: GOOGLE_THEME.fonts.sans,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 140px',
        overflow: 'hidden',
      }}
    >
      <TopGradientBar />

      {/* Background Subtle Glow */}
      <div
        style={{
          position: 'absolute',
          right: -150,
          top: -150,
          width: 720,
          height: 720,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}28 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
        <span
          style={{
            backgroundColor: accentColor,
            color: '#FFFFFF',
            padding: '10px 26px',
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.04em',
            boxShadow: `0 4px 20px ${accentColor}66`,
          }}
        >
          BUSINESS REQUIREMENT : {reqId}
        </span>
        <span
          style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: GOOGLE_THEME.colors.textSecondary,
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          定量インパクト目標: {businessValue}
        </span>
      </div>

      {/* Main Requirement Title */}
      <h1
        style={{
          fontSize: 54,
          fontWeight: 900,
          lineHeight: 1.25,
          marginBottom: 48,
          color: '#FFFFFF',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h1>

      {/* GIVEN / WHEN / THEN 3-Row Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: GOOGLE_THEME.colors.surface,
            borderLeft: `8px solid #EA4335`,
            borderRadius: 14,
            padding: '24px 32px',
            gap: 28,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ minWidth: 160 }}>
            <div style={{ color: '#EA4335', fontWeight: 800, fontSize: 16, letterSpacing: '0.08em' }}>GIVEN</div>
            <div style={{ color: GOOGLE_THEME.colors.textSecondary, fontWeight: 700, fontSize: 20 }}>業務背景・現場課題</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#E8EAED', lineHeight: 1.4 }}>{given}</div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: GOOGLE_THEME.colors.surface,
            borderLeft: `8px solid #4285F4`,
            borderRadius: 14,
            padding: '24px 32px',
            gap: 28,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ minWidth: 160 }}>
            <div style={{ color: '#4285F4', fontWeight: 800, fontSize: 16, letterSpacing: '0.08em' }}>WHEN</div>
            <div style={{ color: GOOGLE_THEME.colors.textSecondary, fontWeight: 700, fontSize: 20 }}>AI業務介入・自律遂行</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#E8EAED', lineHeight: 1.4 }}>{when}</div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: GOOGLE_THEME.colors.surface,
            borderLeft: `8px solid #34A853`,
            borderRadius: 14,
            padding: '24px 32px',
            gap: 28,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ minWidth: 160 }}>
            <div style={{ color: '#34A853', fontWeight: 800, fontSize: 16, letterSpacing: '0.08em' }}>THEN</div>
            <div style={{ color: GOOGLE_THEME.colors.textSecondary, fontWeight: 700, fontSize: 20 }}>達成ビジネス成果・ROI</div>
          </div>
          <div style={{ fontSize: 25, fontWeight: 700, color: '#81C995', lineHeight: 1.4 }}>{then}</div>
        </div>
      </div>
    </div>
  );
}

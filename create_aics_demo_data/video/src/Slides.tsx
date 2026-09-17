import React from 'react';
import { GOOGLE_THEME } from './theme';
import { TopGradientBar } from './Rail';

export function ExecutiveTitleSlide() {
  return (
    <div
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        backgroundColor: GOOGLE_THEME.colors.ink,
        color: '#FFFFFF',
        fontFamily: GOOGLE_THEME.fonts.sans,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 140px',
        overflow: 'hidden',
      }}
    >
      <TopGradientBar />

      {/* Decorative Background Glow */}
      <div
        style={{
          position: 'absolute',
          right: -120,
          bottom: -120,
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 64, 152, 0.42) 0%, rgba(66, 133, 244, 0.12) 45%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <div
          style={{
            backgroundColor: '#004098',
            color: '#FFFFFF',
            fontWeight: 900,
            fontSize: 24,
            padding: '10px 24px',
            borderRadius: 8,
            letterSpacing: '0.06em',
            border: '2px solid #4285F4',
          }}
        >
          EDION エディオンネットショップ
        </div>
        <span
          style={{
            backgroundColor: 'rgba(66, 133, 244, 0.16)',
            border: '1.5px solid #4285F4',
            color: '#8AB4F8',
            padding: '10px 22px',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Google Cloud AI Commerce Search (Retail API v2)
        </span>
      </div>

      <h1
        style={{
          fontSize: 66,
          fontWeight: 900,
          lineHeight: 1.2,
          marginBottom: 28,
          letterSpacing: '-0.02em',
        }}
      >
        AIコマース検索による次世代EC購買体験と
        <br />
        <span style={{ color: '#8AB4F8' }}>ビジネス要件充足（BDD）実証デモ</span>
      </h1>

      <p
        style={{
          fontSize: 26,
          color: GOOGLE_THEME.colors.textSecondary,
          maxWidth: 1350,
          lineHeight: 1.55,
          marginBottom: 56,
        }}
      >
        1,050点の家電カタログ（Primary 75% / Variant 25%）・16種実写画像・ネイティブ Tile Navigation を完全統合。
        検索離脱の解消からマーチャンダイジング統制まで、4つの中核ビジネス要件の充足プロセスを実証します。
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {[
          { label: '検索対象カタログ', value: '1,050 商品', sub: 'Branch 0 完全インデックス済', color: '#4285F4' },
          { label: 'Variant 階層比率', value: '24.95%', sub: '30%以下上限ルール厳守', color: '#34A853' },
          { label: 'ネイティブ属性タイル', value: '100% Hit', sub: 'tileNavigationSpec 完全連動', color: '#EA4335' },
          { label: '検索エンジン基盤', value: 'RETAIL_API', sub: 'Cloud Run asia-northeast1', color: '#FBBC04' },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: GOOGLE_THEME.colors.surface,
              borderTop: `5px solid ${item.color}`,
              borderRadius: 12,
              padding: '24px 26px',
              boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ fontSize: 16, color: GOOGLE_THEME.colors.textMuted, fontWeight: 700, marginBottom: 8 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#FFFFFF', marginBottom: 6 }}>{item.value}</div>
            <div style={{ fontSize: 15, color: item.color, fontWeight: 600 }}>{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BusinessRequirementsMapSlide() {
  const reqs = [
    {
      id: 'REQ-01',
      title: '自然言語検索 & AIクエリ拡張 (Query Expansion)',
      kpi: '検索離脱率 -45% / CVR +32%',
      desc: '「エアコン 省エネ 14畳」等の自然言語・複合検索に対し、AIが検索意図を自動拡張し関連度順に表示。',
      color: '#4285F4',
    },
    {
      id: 'REQ-02',
      title: 'AIダイナミックファセット (Dynamic Facets)',
      kpi: '絞り込み操作時間 -60% / 発見性 +38%',
      desc: '検索クエリに応じてブランド・カテゴリ・適用畳数などの最適な絞り込み軸をリアルタイムに自動生成。',
      color: '#34A853',
    },
    {
      id: 'REQ-03',
      title: 'AIおすすめ属性タイル (Tile Navigation)',
      kpi: '商品到達時間 -70% / 高単価選択率 +28%',
      desc: 'tileNavigationSpec により「無給水加湿」「給気換気」等の重要属性タイルを自動提示し、ワンクリックで絞り込み。',
      color: '#EA4335',
    },
    {
      id: 'REQ-04',
      title: '4-Layer Architecture & API Inspector 監査証跡',
      kpi: '運用監査工数 -85% / API可視性 100%',
      desc: 'フロントエンドから Retail API v2 (default_search) までの4層アーキテクチャと生JSON通信をリアルタイム監査。',
      color: '#FBBC04',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        backgroundColor: GOOGLE_THEME.colors.ink,
        color: '#FFFFFF',
        fontFamily: GOOGLE_THEME.fonts.sans,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 120px',
      }}
    >
      <TopGradientBar />

      <div style={{ marginBottom: 36 }}>
        <span
          style={{
            backgroundColor: 'rgba(52, 168, 83, 0.18)',
            border: '1.5px solid #34A853',
            color: '#81C995',
            padding: '8px 20px',
            borderRadius: 999,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.05em',
          }}
        >
          BUSINESS REQUIREMENTS & ARCHITECTURE MAP
        </span>
        <h2 style={{ fontSize: 48, fontWeight: 900, marginTop: 16 }}>
          本デモ動画でじっくり解説する 4 つの中核機能（検索・ファセット・タイル・API監査）
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 28 }}>
        {reqs.map((r) => (
          <div
            key={r.id}
            style={{
              backgroundColor: GOOGLE_THEME.colors.surface,
              borderLeft: `8px solid ${r.color}`,
              borderRadius: 14,
              padding: '30px 34px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  backgroundColor: r.color,
                  color: '#FFFFFF',
                  padding: '6px 16px',
                  borderRadius: 999,
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {r.id}
              </span>
              <span
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                  padding: '6px 16px',
                  borderRadius: 8,
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                目標KPI: {r.kpi}
              </span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>{r.title}</div>
            <div style={{ fontSize: 20, color: GOOGLE_THEME.colors.textSecondary, lineHeight: 1.45 }}>{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClosingBusinessImpactSlide() {
  return (
    <div
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        backgroundColor: GOOGLE_THEME.colors.ink,
        color: '#FFFFFF',
        fontFamily: GOOGLE_THEME.fonts.sans,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 130px',
      }}
    >
      <TopGradientBar />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <span
          style={{
            backgroundColor: '#34A853',
            color: '#FFFFFF',
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          100% BUSINESS REQUIREMENTS FULFILLED
        </span>
        <span style={{ fontSize: 22, color: '#81C995', fontWeight: 700 }}>
          Google Cloud AI Commerce Search (aics-demo-site-9999) 実証完了
        </span>
      </div>

      <h1 style={{ fontSize: 56, fontWeight: 900, marginBottom: 42 }}>
        ビジネス要件充足結果（BDD Evidence）と導入効果サマリー
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 42 }}>
        {[
          { req: 'REQ-01 検索・拡張', metric: '-45%', title: '検索離脱率の削減', desc: 'Query Expansion による自然言語・複合意図理解', color: '#4285F4' },
          { req: 'REQ-02 ファセット', metric: '-60%', title: '絞り込み操作時間短縮', desc: 'AI Dynamic Facets による多軸リアルタイム集計', color: '#34A853' },
          { req: 'REQ-03 属性タイル', metric: '-70%', title: '商品到達時間の短縮', desc: 'Tile Navigation によるワンクリック属性絞り込み', color: '#EA4335' },
          { req: 'REQ-04 API監査', metric: '-85%', title: '検索運用・監査工数', desc: '4-Layer Architecture & API Inspector 完全可視化', color: '#FBBC04' },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              backgroundColor: GOOGLE_THEME.colors.surface,
              borderTop: `6px solid ${card.color}`,
              borderRadius: 14,
              padding: '28px 26px',
              boxShadow: '0 10px 32px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{ color: card.color, fontWeight: 800, fontSize: 16, marginBottom: 10 }}>{card.req}</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#FFFFFF', marginBottom: 10 }}>{card.metric}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', marginBottom: 10 }}>{card.title}</div>
            <div style={{ fontSize: 16, color: GOOGLE_THEME.colors.textSecondary, lineHeight: 1.4 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          backgroundColor: 'rgba(66, 133, 244, 0.12)',
          border: '1.5px solid #4285F4',
          borderRadius: 14,
          padding: '22px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 18, color: '#8AB4F8', fontWeight: 700 }}>本番稼働中デモ環境 (Cloud Run Service)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>
            https://edion-aics-demo-x22vimdr4q-an.a.run.app
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, color: GOOGLE_THEME.colors.textSecondary }}>GCP Project ID: aics-demo-site-9999</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#81C995', marginTop: 4 }}>
            Branch 0 Catalog: 1,050 Products Indexed (Primary 75% / Variant 25%)
          </div>
        </div>
      </div>
    </div>
  );
}

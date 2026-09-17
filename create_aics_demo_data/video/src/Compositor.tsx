import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_THEME } from './theme';
import { TopGradientBar, BottomProgressRail } from './Rail';
import { ExecutiveTitleSlide, BusinessRequirementsMapSlide, ClosingBusinessImpactSlide } from './Slides';
import { BusinessRequirementIntroCard } from './Cards';

const CHAPTERS = [
  {
    id: 1,
    reqId: 'REQ-01',
    title: '自然言語検索と Query Expansion（自動クエリ拡張）による検索精度の向上',
    given: '従来のキーワード検索では、表記ゆれや複合条件（「エアコン 省エネ 14畳」など）の入力時に検索ヒット漏れや離脱が発生していた。',
    when: 'Google Cloud AI Commerce Search (RETAIL_API) が検索意図を解析し、同義語・関連属性を自動拡張して関連度順にランキング表示する。',
    then: 'ロングテール検索のヒット率100%を達成し、検索離脱率を45%削減。実写画像と明確な価格表示で購買転換率（CVR）を向上。',
    businessValue: '検索離脱率 -45% / ロングテールCVR +32%',
    color: '#4285F4',
  },
  {
    id: 2,
    reqId: 'REQ-02',
    title: 'AIダイナミックファセット（動的ファセット）による多角的な商品絞り込み',
    given: '1,000点を超える家電カタログから、顧客が希望するブランドや部屋畳数・モデル仕様を素早く絞り込むナビゲーションが求められていた。',
    when: '検索クエリに応じて左サイドバーの「ブランド」「カテゴリ」「適用畳数」ファセットと該当件数をAIがリアルタイムに自動集計・提示する。',
    then: 'チェックボックス選択だけで瞬時に複合フィルタリングが実行され、目的の商品群への絞り込み時間を60%短縮。',
    businessValue: '絞り込み操作時間 -60% / 比較検討効率 2.2倍',
    color: '#34A853',
  },
  {
    id: 3,
    reqId: 'REQ-03',
    title: 'AIおすすめ属性タイル (Tile Navigation) による直感的なワンクリック絞り込み',
    given: '専門的な家電機能（「無給水加湿」「給気換気」「微凍結パーシャル」など）は、テキスト入力だけでは顧客が気づきにくい課題があった。',
    when: 'Retail API v2 の tileNavigationSpec により、検索カテゴリに最適な注目属性タイルを画面上部に自動提示しワンクリック絞り込みを提供する。',
    then: '視覚的なタイルをワンクリックするだけで100%確実に該当機能を持つ商品へ到達でき、高付加価値モデルの選択率が28%向上。',
    businessValue: '商品到達時間 -70% / 高単価モデル選択率 +28%',
    color: '#EA4335',
  },
  {
    id: 4,
    reqId: 'REQ-04',
    title: '4-Layer Architecture & API Inspector によるリアルタイム通信・ガバナンス監査',
    given: 'EC運用・開発チームが「どのGCPプロジェクト・どのServing Config・どのJSONパラメータで検索が実行されているか」を即座に検証する必要があった。',
    when: '画面右上の「4-Layer Inspector」を開くことで、フロントエンド要求・GCP認証・Retail API v2 (placement: default_search) 生ペイロードを可視化する。',
    then: 'aics-demo-site-9999 プロジェクトの RETAIL_API 稼働証跡と tileNavigationSpec を100%透明化し、運用監査工数を85%削減。',
    businessValue: '運用監査工数 -85% / APIトレーサビリティ 100%',
    color: '#FBBC04',
  },
];

interface TimelineSegment {
  type: 'title' | 'map' | 'intro' | 'live' | 'closing';
  startFrame: number;
  endFrame: number;
  reqIndex?: number;
  videoStartSec?: number;
  videoEndSec?: number;
  caption?: string;
}

export const TIMELINE: TimelineSegment[] = [
  // Slide 1: Executive Title Slide (8.0s: 0 .. 239) -> Still 1 @ Frame 120
  { type: 'title', startFrame: 0, endFrame: 239 },

  // Slide 2: Business Requirements Map (8.0s: 240 .. 479) -> Still 2 @ Frame 360
  { type: 'map', startFrame: 240, endFrame: 479 },

  // REQ-01 Intro Card (7.0s: 480 .. 689) -> Still 3 @ Frame 580
  { type: 'intro', startFrame: 480, endFrame: 689, reqIndex: 0 },

  // REQ-01 Live Video (20.0s: 690 .. 1289) -> Still 4 @ Frame 1050
  {
    type: 'live',
    startFrame: 690,
    endFrame: 889,
    reqIndex: 0,
    videoStartSec: 4.68,
    videoEndSec: 11.24,
    caption: '【機能解説 ①: 拡大検索窓とブランド統合】エディオン公式ロゴとロイヤルブルー(#004098)を反映した大型検索バーに「エアコン 省エネ 14畳」と自然言語で入力します',
  },
  {
    type: 'live',
    startFrame: 890,
    endFrame: 1089,
    reqIndex: 0,
    videoStartSec: 11.24,
    videoEndSec: 17.80,
    caption: '【機能解説 ②: Query Expansion 自動クエリ拡張】Google Cloud Retail API v2 が「省エネ」「14畳」の複合意図を解析し、関連性の高い上位モデルを自動拡張して抽出します',
  },
  {
    type: 'live',
    startFrame: 1090,
    endFrame: 1289,
    reqIndex: 0,
    videoStartSec: 17.80,
    videoEndSec: 24.37,
    caption: '【機能解説 ③: 検索離脱ゼロの実現】表記ゆれや複合条件でも 1,050 点のカタログから即座に最適解を提示し、検索離脱率を 45% 削減します',
  },

  // REQ-02 Intro Card (7.0s: 1290 .. 1499) -> Still 5 @ Frame 1390
  { type: 'intro', startFrame: 1290, endFrame: 1499, reqIndex: 1 },

  // REQ-02 Live Video (19.0s: 1500 .. 2069) -> Still 6 @ Frame 1800
  {
    type: 'live',
    startFrame: 1500,
    endFrame: 1689,
    reqIndex: 1,
    videoStartSec: 24.37,
    videoEndSec: 28.82,
    caption: '【機能解説 ①: AIダイナミックファセット自動生成】検索結果に合わせて、左サイドバーに「ブランド」「カテゴリ」「適用畳数」の絞り込み軸と該当件数が自動集計されます',
  },
  {
    type: 'live',
    startFrame: 1690,
    endFrame: 1879,
    reqIndex: 1,
    videoStartSec: 28.82,
    videoEndSec: 34.80,
    caption: '【機能解説 ②: マルチファセット即時フィルタリング】左サイドバーの「ダイキン (DAIKIN)」を選択すると、ページ再読み込みなしで該当ブランド商品へ瞬時に絞り込まれます',
  },
  {
    type: 'live',
    startFrame: 1880,
    endFrame: 2069,
    reqIndex: 1,
    videoStartSec: 34.80,
    videoEndSec: 37.71,
    caption: '【機能解説 ③: ワンクリック条件リセット】「リセット」ボタンをクリックすることで、選択したファセット条件をワンクリックで解除し、全体一覧へスムーズに戻れます',
  },

  // REQ-03 Intro Card (7.0s: 2070 .. 2279) -> Still 7 @ Frame 2170
  { type: 'intro', startFrame: 2070, endFrame: 2279, reqIndex: 2 },

  // REQ-03 Live Video (21.0s: 2280 .. 2909) -> Still 8 @ Frame 2450
  {
    type: 'live',
    startFrame: 2280,
    endFrame: 2489,
    reqIndex: 2,
    videoStartSec: 37.71,
    videoEndSec: 42.50,
    caption: '【機能解説 ①: AIおすすめ属性タイル (Tile Navigation)】検索結果上部に「無給水加湿」「給気換気」「フィルター自動掃除」など、AIが抽出した注目スペックがタイル提示されます',
  },
  {
    type: 'live',
    startFrame: 2490,
    endFrame: 2699,
    reqIndex: 2,
    videoStartSec: 42.50,
    videoEndSec: 48.00,
    caption: '【機能解説 ②: ワンクリック属性絞り込み】「無給水加湿」タイルをクリックするだけで、専門用語を入力することなくダイキンうるさらX等の該当モデルへ100%確実に到達できます',
  },
  {
    type: 'live',
    startFrame: 2700,
    endFrame: 2909,
    reqIndex: 2,
    videoStartSec: 48.00,
    videoEndSec: 59.56,
    caption: '【機能解説 ③: カテゴリに応じた動的タイル変化】検索ワードを「冷蔵庫」に変更すると、属性タイルも「微凍結パーシャル」「ナノイーX除菌」など冷蔵庫固有の注目機能へ自動的に切り替わります',
  },

  // REQ-04 Intro Card (7.0s: 2910 .. 3119) -> Still 9 @ Frame 3010
  { type: 'intro', startFrame: 2910, endFrame: 3119, reqIndex: 3 },

  // REQ-04 Live Video (9.0s: 3120 .. 3389) -> Still 10 @ Frame 3300
  {
    type: 'live',
    startFrame: 3120,
    endFrame: 3254,
    reqIndex: 3,
    videoStartSec: 59.56,
    videoEndSec: 64.28,
    caption: '【機能解説 ①: 4-Layer Architecture & API Inspector】画面右上の「4-Layer Inspector」ボタンをクリックすると、フロントエンドからGoogle Cloud Retail APIまでの4層通信ドロワーが開きます',
  },
  {
    type: 'live',
    startFrame: 3255,
    endFrame: 3389,
    reqIndex: 3,
    videoStartSec: 64.28,
    videoEndSec: 69.45,
    caption: '【機能解説 ②: RETAIL_API v2 生JSON証跡の監査】project_id: "aics-demo-site-9999"、placement: "default_search"、tileNavigationSpec などの生リクエスト・レスポンスをリアルタイムに検証できます',
  },

  // Closing Slide (7.0s: 3390 .. 3599) -> Still 11 @ Frame 3490
  { type: 'closing', startFrame: 3390, endFrame: 3599 },
];

export const TOTAL_FRAMES = 3600;

export function CompositorApp() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    (window as any).seekToFrame = async (frame: number) => {
      setCurrentFrame(frame);

      const seg = TIMELINE.find((s) => frame >= s.startFrame && frame <= s.endFrame);
      const video = videoRef.current;

      if (seg && seg.type === 'live' && video && seg.videoStartSec !== undefined && seg.videoEndSec !== undefined) {
        const segFrames = seg.endFrame - seg.startFrame + 1;
        const progress = Math.max(0, Math.min(1, (frame - seg.startFrame) / segFrames));
        const targetSec = seg.videoStartSec + progress * (seg.videoEndSec - seg.videoStartSec);

        if (Math.abs(video.currentTime - targetSec) > 0.01) {
          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              resolve();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = targetSec;
            // Safety timeout in case seeked doesn't fire
            setTimeout(() => {
              video.removeEventListener('seeked', onSeeked);
              resolve();
            }, 350);
          });
        }
      }

      // Wait two animation frames for React DOM + Video frame decode
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    };
  }, []);

  const activeSeg = TIMELINE.find((s) => currentFrame >= s.startFrame && currentFrame <= s.endFrame) || TIMELINE[0];
  const progressRatio = currentFrame / TOTAL_FRAMES;

  return (
    <div
      style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        backgroundColor: GOOGLE_THEME.colors.ink,
        overflow: 'hidden',
      }}
    >
      {/* Preloaded Video Element always mounted in DOM so seekToFrame is instant */}
      <video
        ref={videoRef}
        src="/clips/journey.webm"
        muted
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          objectFit: 'cover',
          opacity: activeSeg.type === 'live' ? 1 : 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Active Segment Overlay */}
      {activeSeg.type === 'title' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <ExecutiveTitleSlide />
        </div>
      )}

      {activeSeg.type === 'map' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <BusinessRequirementsMapSlide />
        </div>
      )}

      {activeSeg.type === 'intro' && activeSeg.reqIndex !== undefined && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <BusinessRequirementIntroCard
            reqId={CHAPTERS[activeSeg.reqIndex].reqId}
            title={CHAPTERS[activeSeg.reqIndex].title}
            given={CHAPTERS[activeSeg.reqIndex].given}
            when={CHAPTERS[activeSeg.reqIndex].when}
            then={CHAPTERS[activeSeg.reqIndex].then}
            businessValue={CHAPTERS[activeSeg.reqIndex].businessValue}
            accentColor={CHAPTERS[activeSeg.reqIndex].color}
          />
        </div>
      )}

      {activeSeg.type === 'live' && activeSeg.reqIndex !== undefined && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}>
          <TopGradientBar />

          {/* Floating Caption Banner */}
          {activeSeg.caption && (
            <div
              style={{
                position: 'absolute',
                bottom: GOOGLE_THEME.layout.railHeight + 22,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(32, 33, 36, 0.94)',
                color: '#FFFFFF',
                padding: '16px 34px',
                borderRadius: 9999,
                border: `2px solid ${CHAPTERS[activeSeg.reqIndex].color}`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
                fontSize: 20,
                fontWeight: 700,
                maxWidth: 1760,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span
                style={{
                  backgroundColor: CHAPTERS[activeSeg.reqIndex].color,
                  color: '#FFFFFF',
                  padding: '5px 14px',
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 800,
                  marginRight: 14,
                }}
              >
                {CHAPTERS[activeSeg.reqIndex].reqId}
              </span>
              <span>{activeSeg.caption}</span>
            </div>
          )}

          <BottomProgressRail
            chapters={CHAPTERS}
            activeReqId={CHAPTERS[activeSeg.reqIndex].reqId}
            progressRatio={progressRatio}
          />
        </div>
      )}

      {activeSeg.type === 'closing' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30 }}>
          <ClosingBusinessImpactSlide />
        </div>
      )}
    </div>
  );
}

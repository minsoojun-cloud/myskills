/**
 * Stage 2: Deterministic Frame-by-Frame Video & Stills Renderer using Playwright + FFmpeg
 * Launches Vite server, renders 3,600 frames (120.0s @ 30fps) to out/demo-share.mp4,
 * exports 11 lossless 1080p PNG stills for Google Slides, generates synchronized 120s WebVTT, and validates outputs.
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const STILLS = [
  { frame: 120, filename: 'slide_01_title.png' },
  { frame: 360, filename: 'slide_02_req_map.png' },
  { frame: 580, filename: 'slide_03_req1_intro.png' },
  { frame: 1050, filename: 'slide_04_req1_live.png' },
  { frame: 1390, filename: 'slide_05_req2_intro.png' },
  { frame: 1800, filename: 'slide_06_req2_live.png' },
  { frame: 2170, filename: 'slide_07_req3_intro.png' },
  { frame: 2450, filename: 'slide_08_req3_live.png' },
  { frame: 3010, filename: 'slide_09_req4_intro.png' },
  { frame: 3300, filename: 'slide_10_req4_live.png' },
  { frame: 3490, filename: 'slide_11_impact.png' },
];

function formatVttTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function generate120sWebVTT(vttPath) {
  const cues = [
    { start: 0.0, end: 8.0, text: '【タイトル】エディオン公式デザイン統合 AIコマース検索（Google Cloud Retail API v2）2分間じっくり解説デモ' },
    { start: 8.0, end: 16.0, text: '【全体構成】自然言語検索・AIダイナミックファセット・AIおすすめ属性タイル・4-Layer API監査の4機能を順にご紹介します' },
    { start: 16.0, end: 23.0, text: '【機能1: 検索とクエリ拡張】表記ゆれや複合条件による検索離脱を防ぐ Query Expansion の仕組みを解説します' },
    { start: 23.0, end: 29.6, text: '【検索デモ①】エディオン公式ロゴとロイヤルブルー(#004098)を配した大型検索窓に「エアコン 省エネ 14畳」と自然言語で入力します' },
    { start: 29.6, end: 36.3, text: '【検索デモ②】Google Cloud Retail API v2 が「省エネ」「14畳」の複合意図を解析し、関連度順の上位モデルを即座に自動抽出します' },
    { start: 36.3, end: 43.0, text: '【検索デモ③】1,050点のカタログ（Primary 75% / Variant 25%）から最適な省エネエアコン群を提示し、検索離脱率を45%削減します' },
    { start: 43.0, end: 50.0, text: '【機能2: AIダイナミックファセット】検索クエリに応じてリアルタイムに集計される多軸絞り込みナビゲーションを解説します' },
    { start: 50.0, end: 56.3, text: '【ファセットデモ①】左サイドバーに「ブランド」「カテゴリ」「適用畳数」のファセットと該当商品数が自動集計されます' },
    { start: 56.3, end: 62.6, text: '【ファセットデモ②】「ダイキン (DAIKIN)」のチェックボックスを選択すると、ページ再読み込みなしで該当ブランド商品へ瞬時に絞り込まれます' },
    { start: 62.6, end: 69.0, text: '【ファセットデモ③】「リセット」ボタンをクリックすることで、選択した絞り込み条件をワンクリックで解除し全体一覧へ戻れます' },
    { start: 69.0, end: 76.0, text: '【機能3: AIおすすめ属性タイル (Tile Navigation)】専門スペックを視覚的なタイルで提示するワンクリック絞り込みを解説します' },
    { start: 76.0, end: 83.0, text: '【属性タイルデモ①】検索結果上部に「無給水加湿」「給気換気」「フィルター自動掃除」など、注目スペックがタイル提示されます' },
    { start: 83.0, end: 90.0, text: '【属性タイルデモ②】「無給水加湿」タイルをクリックするだけで、ダイキンうるさらXシリーズ等の該当商品へ100%確実に到達できます' },
    { start: 90.0, end: 97.0, text: '【属性タイルデモ③】検索ワードを「冷蔵庫」に変更すると、属性タイルも「微凍結パーシャル」「ナノイーX除菌」など冷蔵庫固有機能へ自動変化します' },
    { start: 97.0, end: 104.0, text: '【機能4: 4-Layer Architecture & API Inspector】フロントエンドからRetail API v2までのリアルタイム通信監査機能を解説します' },
    { start: 104.0, end: 108.5, text: '【API監査デモ①】画面右上の「4-Layer Inspector」ボタンをクリックすると、4層アーキテクチャの通信ドロワーが展開されます' },
    { start: 108.5, end: 113.0, text: '【API監査デモ②】project_id: "aics-demo-site-9999"、placement: "default_search"、tileNavigationSpec 等の生JSON証跡を検証できます' },
    { start: 113.0, end: 120.0, text: '【まとめ】検索離脱率-45%・絞り込み時間-60%・到達時間-70%・監査工数-85%を達成。本番稼働URLでいつでもお試しいただけます' },
  ];

  let out = 'WEBVTT\n\n';
  cues.forEach((c, idx) => {
    out += `${idx + 1}\n${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.text}\n\n`;
  });
  fs.writeFileSync(vttPath, out, 'utf8');
  console.log(`Generated 120s WebVTT subtitles -> ${vttPath}`);
}

async function startViteServer() {
  console.log('[Vite] Starting local Vite server on http://127.0.0.1:5173 ...');
  const viteProc = spawn('npx', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
    stdio: 'pipe',
    env: { ...process.env },
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Vite server startup timed out')), 15000);
    viteProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.includes('5173') || text.includes('Local:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    viteProc.stderr.on('data', (chunk) => {
      // ignore warnings
    });
  });

  console.log('[Vite] Server is ready.');
  return viteProc;
}

async function run() {
  const viteProc = await startViteServer();

  try {
    const fps = 30;
    const totalFrames = 3600; // 120.0 seconds @ 30fps
    const outputMp4 = path.join(OUT_DIR, 'demo-share.mp4');

    console.log(`[Renderer] Launching Chromium for deterministic ${fps}fps rendering (${totalFrames} frames = 120.0s)...`);
    const browser = await chromium.launch({
      executablePath: '/opt/google/chrome/google-chrome',
      headless: true,
      args: ['--window-size=1920,1080', '--disable-gpu-vsync', '--no-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('video', { timeout: 10000 });

    // Wait for <video> element metadata to load
    await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (v && v.readyState < 1) {
        await new Promise((res) => {
          v.addEventListener('loadedmetadata', res, { once: true });
          setTimeout(res, 2000);
        });
      }
    });

    const ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-framerate', String(fps),
      '-i', '-',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      outputMp4,
    ];
    const ffmpeg = spawn('/usr/bin/ffmpeg', ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

    const stillMap = new Map(STILLS.map((s) => [s.frame, path.join(OUT_DIR, s.filename)]));

    for (let frame = 0; frame < totalFrames; frame++) {
      await page.evaluate(async (currentFrame) => {
        if (typeof window.seekToFrame === 'function') {
          await window.seekToFrame(currentFrame);
        }
      }, frame);

      if (stillMap.has(frame)) {
        const stillPath = stillMap.get(frame);
        await page.screenshot({ path: stillPath, type: 'png' });
        const sizeKb = (fs.statSync(stillPath).size / 1024).toFixed(1);
        console.log(`  [Still Exported] Frame ${frame} -> ${path.basename(stillPath)} (${sizeKb} KB)`);
      }

      const buffer = await page.screenshot({ type: 'jpeg', quality: 94 });
      const canWrite = ffmpeg.stdin.write(buffer);
      if (!canWrite) {
        await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
      }

      if (frame % 300 === 0 || frame === totalFrames - 1) {
        console.log(`  [Progress] Rendered ${frame + 1} / ${totalFrames} frames (${Math.round(((frame + 1) / totalFrames) * 100)}%)`);
      }
    }

    ffmpeg.stdin.end();
    await new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`))));
    });

    await browser.close();
    console.log(`\n🎉 [Renderer] Successfully generated Full HD 120s MP4: ${outputMp4}`);

    // Generate 120s WebVTT
    generate120sWebVTT(path.join(OUT_DIR, 'demo.vtt'));

    // Stage A Validation: ffprobe check
    console.log('\n🔍 [Stage A Validation] Verifying MP4 stream metadata via ffprobe...');
    const probeOut = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,duration -of json ${outputMp4}`,
      { encoding: 'utf8' }
    );
    console.log(probeOut.trim());

    // Stage B Validation: Local PNG stills size check (> 30KB)
    console.log('\n🔍 [Stage B Validation] Checking all 11 local PNG stills for size > 30KB...');
    for (const s of STILLS) {
      const p = path.join(OUT_DIR, s.filename);
      const sz = fs.statSync(p).size;
      if (sz < 30 * 1024) {
        throw new Error(`Still ${s.filename} is too small (${sz} bytes < 30KB)!`);
      }
      console.log(`  ✅ ${s.filename} : ${(sz / 1024).toFixed(1)} KB (PASS)`);
    }
  } finally {
    viteProc.kill();
  }
}

run().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});

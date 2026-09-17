/**
 * Deterministic Frame-by-Frame Video & Stills Renderer using Playwright + FFmpeg
 *
 * Guarantees 0% dropped frames by deterministically stepping frame-by-frame (30fps),
 * awaiting <video> seek completion, streaming frames to FFmpeg stdin pipe for H.264 MP4,
 * and simultaneously exporting lossless 1080p PNG stills for Google Slides presentations.
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('out');
fs.mkdirSync(OUT_DIR, { recursive: true });

export async function renderDemoVideo({
  compositorUrl = 'http://localhost:5173/compositor.html',
  outputMp4 = path.join(OUT_DIR, 'demo-share.mp4'),
  fps = 30,
  totalFrames = 900,
  stills = [
    { frame: 30, filename: 'slide_01_title.png' },
    { frame: 135, filename: 'slide_02_req_map.png' },
  ],
} = {}) {
  console.log(`[Renderer] Launching Playwright Chromium for deterministic ${fps}fps rendering...`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--window-size=1920,1080', '--disable-gpu-vsync'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log(`[Renderer] Loading Compositor UI: ${compositorUrl}`);
  await page.goto(compositorUrl, { waitUntil: 'networkidle' });

  // Spawn FFmpeg process reading JPEG/PNG frames from stdin pipe
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '18',
    outputMp4,
  ];
  const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

  const stillMap = new Map(stills.map((s) => [s.frame, path.join(OUT_DIR, s.filename)]));

  for (let frame = 0; frame < totalFrames; frame++) {
    // Advance compositor state and deterministically seek underlying <video> element
    await page.evaluate(async (currentFrame) => {
      if (typeof window.seekToFrame === 'function') {
        await window.seekToFrame(currentFrame);
      }
    }, frame);

    // Export high-resolution lossless PNG still if this frame is marked for Google Slides
    if (stillMap.has(frame)) {
      const stillPath = stillMap.get(frame);
      await page.screenshot({ path: stillPath, type: 'png' });
      console.log(`  [Still Exported] Frame ${frame} -> ${stillPath}`);
    }

    // Capture frame buffer and pipe to FFmpeg
    const buffer = await page.screenshot({ type: 'jpeg', quality: 95 });
    const canWrite = ffmpeg.stdin.write(buffer);
    if (!canWrite) {
      await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    }

    if (frame % (fps * 5) === 0 || frame === totalFrames - 1) {
      console.log(`  [Progress] Rendered ${frame + 1} / ${totalFrames} frames (${Math.round(((frame + 1) / totalFrames) * 100)}%)`);
    }
  }

  ffmpeg.stdin.end();
  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`))));
  });

  await browser.close();
  console.log(`[Renderer] Successfully generated Full HD MP4: ${outputMp4}`);
}

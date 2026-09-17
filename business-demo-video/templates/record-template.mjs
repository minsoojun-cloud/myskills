/**
 * Playwright Full-Bleed 1080p Recorder Template (1536x864 @ 1.25x Scale)
 * Records browser session and outputs public/clips/journey.webm & journey.json
 * Designed for Business-Driven Development (BDD / Business Requirements) Demo Videos.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CLIPS_DIR = path.resolve('public/clips');
fs.mkdirSync(CLIPS_DIR, { recursive: true });

export class JourneyRecorder {
  constructor() {
    this.t0 = 0;
    this.events = [];
    this.chapters = [];
    this.marks = {};
  }

  startClock() {
    this.t0 = Date.now();
  }

  nowSec() {
    return Number(((Date.now() - this.t0) / 1000).toFixed(2));
  }

  /**
   * Records a named timestamp mark (in seconds) for declarative camera focus / zoom in Compositor.
   */
  mark(name) {
    const sec = this.nowSec();
    this.marks[name] = sec;
    console.log(`  [Mark: ${name}] @ ${sec}s`);
    return sec;
  }

  /**
   * Logs a Business Requirement chapter (supports both object parameter and positional arguments).
   * @param {number|object} idOrObj - Scene ID number or chapter config object
   * @param {string} [title] - Business Requirement title
   * @param {string} [given] - GIVEN: Business Context & Pain Point (業務背景・課題)
   * @param {string} [when] - WHEN: Business Action & AI Execution (業務委譲・AI遂行)
   * @param {string} [then] - THEN: Business Outcome & Governance Value (ビジネス成果・ROI・統制価値)
   * @param {string} [color='#4285F4'] - Google Cloud 4-color theme accent
   * @param {string} [reqId] - Business Requirement ID (e.g., 'REQ-01')
   * @param {string} [businessValue] - Quantifiable KPI / SLA impact summary
   */
  logChapter(idOrObj, title, given, when, then, color = '#4285F4', reqId = null, businessValue = null) {
    const startSec = this.nowSec();
    let chapter;
    if (typeof idOrObj === 'object' && idOrObj !== null) {
      const id = idOrObj.id ?? this.chapters.length + 1;
      chapter = {
        id,
        reqId: idOrObj.reqId ?? `REQ-0${id}`,
        title: idOrObj.title ?? '',
        given: idOrObj.given ?? '',
        when: idOrObj.when ?? '',
        then: idOrObj.then ?? '',
        businessValue: idOrObj.businessValue ?? idOrObj.then ?? '',
        color: idOrObj.color ?? '#4285F4',
        startSec,
        endSec: startSec + 10,
      };
    } else {
      const id = idOrObj;
      chapter = {
        id,
        reqId: reqId ?? `REQ-0${id}`,
        title,
        given,
        when,
        then,
        businessValue: businessValue ?? then,
        color,
        startSec,
        endSec: startSec + 10,
      };
    }

    if (this.chapters.length > 0) {
      this.chapters[this.chapters.length - 1].endSec = startSec;
    }
    this.chapters.push(chapter);
    console.log(`[Business Req ${chapter.reqId} / Scene ${chapter.id}] ${chapter.title} @ ${startSec}s`);
  }

  logCaption(text, sceneId = 1, reqId = null) {
    const startSec = this.nowSec();
    if (this.events.length > 0 && !this.events[this.events.length - 1].endSec) {
      this.events[this.events.length - 1].endSec = startSec;
    }
    this.events.push({ text, sceneId, reqId: reqId ?? `REQ-0${sceneId}`, startSec, endSec: null });
    console.log(`  [Caption @ ${startSec}s] ${text}`);
  }

  finalize() {
    const endSec = this.nowSec();
    if (this.chapters.length > 0) {
      this.chapters[this.chapters.length - 1].endSec = endSec;
    }
    if (this.events.length > 0 && !this.events[this.events.length - 1].endSec) {
      this.events[this.events.length - 1].endSec = endSec;
    }
    const payload = {
      durationSec: endSec,
      recordedAt: new Date().toISOString(),
      viewport: { width: 1536, height: 864, scaleFactor: 1.25, outputResolution: '1920x1080' },
      marks: this.marks,
      chapters: this.chapters,
      captions: this.events,
    };
    fs.writeFileSync(path.join(CLIPS_DIR, 'journey.json'), JSON.stringify(payload, null, 2));
    console.log(`Saved journey.json (total duration: ${endSec}s, ${this.chapters.length} business requirements)`);
  }
}

/**
 * Injects a visual click ripple indicator into the page so viewers can see where clicks occur.
 */
export async function injectVisualClickRipple(page) {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.style.position = 'fixed';
      ripple.style.left = `${e.clientX - 18}px`;
      ripple.style.top = `${e.clientY - 18}px`;
      ripple.style.width = '36px';
      ripple.style.height = '36px';
      ripple.style.borderRadius = '50%';
      ripple.style.border = '3px solid #4285F4';
      ripple.style.backgroundColor = 'rgba(66, 133, 244, 0.28)';
      ripple.style.pointerEvents = 'none';
      ripple.style.zIndex = '999999';
      ripple.style.transition = 'transform 0.45s ease-out, opacity 0.45s ease-out';
      document.body.appendChild(ripple);
      requestAnimationFrame(() => {
        ripple.style.transform = 'scale(2.2)';
        ripple.style.opacity = '0';
      });
      setTimeout(() => ripple.remove(), 500);
    }, true);
  });
}

/**
 * Launches Playwright browser configured for Full-Bleed 1080p recording
 */
export async function launchFullBleedRecorder() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--force-device-scale-factor=1.25', '--window-size=1536,864'],
  });
  const context = await browser.newContext({
    viewport: { width: 1536, height: 864 },
    deviceScaleFactor: 1.25,
    recordVideo: {
      dir: CLIPS_DIR,
      size: { width: 1920, height: 1080 },
    },
  });
  const page = await context.newPage();
  await injectVisualClickRipple(page);
  return { browser, context, page };
}

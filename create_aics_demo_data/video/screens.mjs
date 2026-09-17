/**
 * Slow-paced, high-visibility Playwright Custom Pointer & Interaction Helpers for 2-Minute Japanese BDD Demo Video.
 * Injects a Google Blue (#1A73E8) animated cursor with green click ripple (#34A853).
 */

export const BASE = 'https://edion-aics-demo-x22vimdr4q-an.a.run.app';

export const hold = (page, ms) => page.waitForTimeout(ms);

const POINTER_MS = 650;
const TYPE_MS = 85;

export async function installPointer(page) {
  await page.evaluate(() => {
    if (document.getElementById('__pointer')) return;
    const dot = document.createElement('div');
    dot.id = '__pointer';
    Object.assign(dot.style, {
      position: 'fixed',
      left: '768px',
      top: '432px',
      width: '30px',
      height: '30px',
      marginLeft: '-15px',
      marginTop: '-15px',
      borderRadius: '50%',
      background: 'rgba(26, 115, 232, 0.30)',
      border: '3px solid #1A73E8',
      boxShadow: '0 2px 14px rgba(26, 115, 232, 0.55)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: `left ${650}ms cubic-bezier(0.22, 1, 0.36, 1), top ${650}ms cubic-bezier(0.22, 1, 0.36, 1), transform 180ms ease`,
    });
    document.body.appendChild(dot);
  });
}

export async function movePointerTo(page, locator) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return;
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.evaluate(
    ([tx, ty]) => {
      const dot = document.getElementById('__pointer');
      if (dot) {
        dot.style.left = `${tx}px`;
        dot.style.top = `${ty}px`;
      }
    },
    [x, y]
  );
  await page.waitForTimeout(POINTER_MS);
}

export async function clickWithPointer(page, locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await installPointer(page);
  await movePointerTo(page, locator);
  await page.evaluate(() => {
    const dot = document.getElementById('__pointer');
    if (dot) {
      dot.style.transform = 'scale(0.72)';
      dot.style.background = 'rgba(52, 168, 83, 0.55)';
      dot.style.borderColor = '#34A853';
    }
  });
  await page.waitForTimeout(160);
  await locator.click({ force: true });
  await page.evaluate(() => {
    const dot = document.getElementById('__pointer');
    if (dot) {
      dot.style.transform = 'scale(1)';
      dot.style.background = 'rgba(26, 115, 232, 0.30)';
      dot.style.borderColor = '#1A73E8';
    }
  });
  await page.waitForTimeout(350);
}

export async function typeWithPointer(page, locator, text) {
  await clickWithPointer(page, locator);
  await locator.fill('');
  for (const char of text) {
    await locator.type(char, { delay: TYPE_MS });
  }
  await page.waitForTimeout(450);
}

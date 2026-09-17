/**
 * Reusable Playwright Custom Pointer & Interaction Helpers for BDD (Business-Driven Development / Business Requirements) Demo Videos.
 * Injects a high-visibility Google Blue (#1A73E8) animated cursor with green click ripple (#34A853) to highlight business evidence.
 */

export const BASE = (process.env.DEMO_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const hold = (page, ms) => page.waitForTimeout(ms)

const POINTER_MS = 480
const TYPE_MS = 35

export async function installPointer(page) {
  await page.evaluate(() => {
    if (document.getElementById('__pointer')) return
    const dot = document.createElement('div')
    dot.id = '__pointer'
    Object.assign(dot.style, {
      position: 'fixed',
      left: '960px',
      top: '540px',
      width: '28px',
      height: '28px',
      marginLeft: '-14px',
      marginTop: '-14px',
      borderRadius: '50%',
      background: 'rgba(26, 115, 232, 0.28)',
      border: '2.5px solid #1A73E8',
      boxShadow: '0 2px 12px rgba(26, 115, 232, 0.45)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: `left ${480}ms cubic-bezier(0.22, 1, 0.36, 1), top ${480}ms cubic-bezier(0.22, 1, 0.36, 1), transform 150ms ease`,
    })
    document.body.appendChild(dot)
  })
}

export async function movePointerTo(page, locator) {
  const box = await locator.boundingBox()
  if (!box) return
  const x = Math.round(box.x + box.width / 2)
  const y = Math.round(box.y + box.height / 2)
  await page.evaluate(
    ([tx, ty]) => {
      const dot = document.getElementById('__pointer')
      if (dot) {
        dot.style.left = `${tx}px`
        dot.style.top = `${ty}px`
      }
    },
    [x, y],
  )
  await page.waitForTimeout(POINTER_MS)
}

export async function clickWithPointer(page, locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await movePointerTo(page, locator)
  await page.evaluate(() => {
    const dot = document.getElementById('__pointer')
    if (dot) {
      dot.style.transform = 'scale(0.75)'
      dot.style.background = 'rgba(52, 168, 83, 0.45)'
      dot.style.borderColor = '#34A853'
    }
  })
  await page.waitForTimeout(120)
  await locator.click({ force: true })
  await page.evaluate(() => {
    const dot = document.getElementById('__pointer')
    if (dot) {
      dot.style.transform = 'scale(1)'
      dot.style.background = 'rgba(26, 115, 232, 0.28)'
      dot.style.borderColor = '#1A73E8'
    }
  })
  await page.waitForTimeout(200)
}

export async function typeWithPointer(page, locator, text) {
  await clickWithPointer(page, locator)
  await locator.fill('')
  for (const char of text) {
    await locator.type(char, { delay: TYPE_MS })
  }
  await page.waitForTimeout(250)
}

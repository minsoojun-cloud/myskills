/**
 * Automated Google Slides Deck Builder & Post-Build Validator Template
 *
 * 1. Validates local 1080p PNG stills (checks existence & file size > 30KB to catch blank/black frames).
 * 2. Populates Google Slides presentation Full-Bleed (720x405pt at 0,0) via `insert-image-from-file`
 *    with direct `--width 720 --height 405 --x 0 --y 0` flags (avoiding `move-element` scale reset bug).
 * 3. Injects structured BDD speaker notes (GIVEN / WHEN / THEN & Quantifiable ROI).
 * 4. Runs strict Post-Build Validation via `gslides readonly list-slides --json` to verify:
 *    - Every slide has an image element (`hasImage === true`)
 *    - Rendered image dimensions equal Full-Bleed Widescreen (`720pt x 405pt`, `scaleX >= 180`)
 *    - Zero leftover default placeholder textboxes (`pageElements.length === 1`)
 *    - Speaker notes are populated and non-empty
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const GSLIDES = '/google/bin/releases/gemini-agents-gslides/gslides'
const PRES_ID = process.argv[2]

if (!PRES_ID) {
  console.error('Usage: node build-slides.mjs <PRESENTATION_ID>')
  process.exit(1)
}

// Define slides in order (override with your project's slide definitions)
const SLIDE_DEFINITIONS = [
  {
    file: 'slide_01_title.png',
    notes: '【Slide 1: エグゼクティブ・タイトル】\nGIVEN / WHEN / THEN & ROI Summary...',
  },
]

function runGslides(args) {
  return execFileSync(GSLIDES, args, { encoding: 'utf8' }).trim()
}

/**
 * Step 1: Pre-flight validation of local PNG stills to catch blank/black renders early.
 */
function validateLocalPngStills(definitions, outDir) {
  console.log('🔍 [Pre-Check] Validating local PNG stills...')
  const MIN_FILE_SIZE_BYTES = 30 * 1024 // 30 KB threshold (blank/solid 1080p PNGs are usually < 15 KB)

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i]
    const imgPath = path.join(outDir, def.file)
    if (!fs.existsSync(imgPath)) {
      throw new Error(`Missing local PNG still for Slide ${i + 1}: ${imgPath}`)
    }
    const stats = fs.statSync(imgPath)
    if (stats.size < MIN_FILE_SIZE_BYTES) {
      throw new Error(
        `Local PNG still ${def.file} is abnormally small (${(stats.size / 1024).toFixed(1)} KB < 30 KB). ` +
          `This indicates a blank, solid black, or unrendered video frame!`
      )
    }
  }
  console.log(`   ✅ All ${definitions.length} local PNG stills passed size & integrity checks.`)
}

/**
 * Step 2: Post-build validation of Google Slides API elements to guarantee zero blank/microscopic slides.
 */
function validateGoogleSlidesDeck(presId, expectedCount) {
  console.log('\n🔍 [Post-Validation] Verifying Google Slides presentation layout & dimensions via API...')
  const EMU_PER_PT = 12700
  const slides = JSON.parse(runGslides(['readonly', 'list-slides', presId, '--json']))

  if (slides.length < expectedCount) {
    throw new Error(`Slide count mismatch: expected ${expectedCount}, found ${slides.length}`)
  }

  let allPassed = true
  console.log('-----------------------------------------------------------------------------------------')
  console.log('Slide # | Slide ID               | Elements | Rendered Size (pt) | Notes Len | Status')
  console.log('-----------------------------------------------------------------------------------------')

  for (let i = 0; i < expectedCount; i++) {
    const slide = slides[i]
    const slideId = slide.objectId
    const elements = slide.pageElements || []
    const imgEl = elements.find((el) => el.image)

    let widthPt = 0
    let heightPt = 0
    if (imgEl && imgEl.size && imgEl.transform) {
      const wEmu = (imgEl.size.width?.magnitude || 0) * (imgEl.transform.scaleX || 1)
      const hEmu = (imgEl.size.height?.magnitude || 0) * (imgEl.transform.scaleY || 1)
      widthPt = wEmu / EMU_PER_PT
      heightPt = hEmu / EMU_PER_PT
    }

    // Extract speaker notes text length
    const notesElements = slide.slideProperties?.notesPage?.pageElements || []
    let notesText = ''
    for (const nel of notesElements) {
      const textElements = nel.shape?.text?.textElements || []
      for (const te of textElements) {
        if (te.textRun?.content) notesText += te.textRun.content
      }
    }
    const notesLen = notesText.trim().length

    // Validation assertions:
    // 1. Must have an image element
    // 2. Image must be Full-Bleed Widescreen (~720x405pt; reject if < 700x390pt e.g. scale reset to 1.0)
    // 3. No leftover default placeholder shapes (elements.length should be 1)
    // 4. Speaker notes must be populated
    const isFullBleed = widthPt >= 700 && heightPt >= 390
    const hasNoPlaceholders = elements.length === 1
    const hasNotes = notesLen >= 20
    const passed = Boolean(imgEl && isFullBleed && hasNoPlaceholders && hasNotes)

    if (!passed) allPassed = false

    const sizeStr = imgEl ? `${widthPt.toFixed(1)} x ${heightPt.toFixed(1)} pt` : 'MISSING IMAGE'
    const statusStr = passed ? '✅ PASS' : '❌ FAIL'
    console.log(
      `Slide ${String(i + 1).padStart(2, ' ')} | ${slideId.padEnd(22, ' ')} | ${String(elements.length).padEnd(8, ' ')} | ${sizeStr.padEnd(18, ' ')} | ${String(notesLen).padEnd(9, ' ')} | ${statusStr}`
    )
  }
  console.log('-----------------------------------------------------------------------------------------')

  if (!allPassed) {
    throw new Error(
      '❌ Google Slides Post-Build Validation FAILED! One or more slides are blank, microscopic (scale reset), have leftover placeholders, or lack speaker notes.'
    )
  }
  console.log('🎉 Post-Build Validation PASSED: All slides are verified 100% Full-Bleed (720x405pt) with speaker notes!')
}

export { validateLocalPngStills, validateGoogleSlidesDeck }

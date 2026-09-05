import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { jsPDF } from 'jspdf'

import { QuotationError } from '../errors'

export type PdfFontOptions = {
  configuredPath?: string
  systemPaths?: readonly string[]
}

// Only standalone TrueType fonts: jsPDF cannot embed system TTC collections or CFF OTF fonts.
export function systemQuotationFontPaths(): string[] {
  if (process.platform === 'win32') {
    const root = process.env.WINDIR || 'C:\\Windows'
    return ['simhei.ttf', 'NotoSansSC-Regular.ttf', 'NotoSansSC-VF.ttf', 'Deng.ttf']
      .map((name) => join(root, 'Fonts', name))
  }
  const directories = process.platform === 'darwin'
    ? ['/Library/Fonts', join(homedir(), 'Library/Fonts')]
    : ['/usr/share/fonts/truetype/noto', '/usr/share/fonts/truetype/wqy', '/usr/local/share/fonts', join(homedir(), '.local/share/fonts')]
  return directories.flatMap((directory) => ['NotoSansSC-Regular.ttf', 'NotoSansSC-VF.ttf', 'wqy-microhei.ttf', 'simhei.ttf']
    .map((name) => join(directory, name)))
}

function supportsText(metadata: unknown, text: string): boolean {
  if (!metadata || typeof metadata !== 'object' || !('characterToGlyph' in metadata)
    || typeof metadata.characterToGlyph !== 'function') return false
  const characterToGlyph = metadata.characterToGlyph.bind(metadata)
  return [...new Set(text)].every((character) => {
    if (/\s/.test(character)) return true
    const code = character.codePointAt(0)
    // jsPDF's TrueType writer consumes UTF-16 code units, not supplementary code points.
    return code !== undefined && code <= 0xffff && characterToGlyph(code) > 0
  })
}

export async function configureQuotationPdfFont(
  document: jsPDF,
  visibleText: string,
  options: PdfFontOptions = {},
): Promise<string> {
  // Bullet is added by the specification renderer and supported by built-in Helvetica.
  if (!/[^\x00-\x7f\u2022]/.test(visibleText)) return 'helvetica'
  const configuredPath = (options.configuredPath ?? process.env.QUOTATION_PDF_FONT_PATH)?.trim()
  const paths = [...new Set([...(configuredPath ? [configuredPath] : []), ...(options.systemPaths ?? systemQuotationFontPaths())])]
  for (const [index, path] of paths.entries()) {
    try {
      const font = await readFile(path)
      if (font.length < 12 || font.readUInt32BE(0) !== 0x00010000) continue
      const fileName = `QuotationUnicode${index}.ttf`
      const family = `QuotationUnicode${index}`
      document.addFileToVFS(fileName, font.toString('base64'))
      document.addFont(fileName, family, 'normal')
      document.setFont(family, 'normal')
      if (!supportsText(document.getFont().metadata, visibleText)) continue
      document.addFont(fileName, family, 'bold')
      return family
    } catch {
      // Missing, unreadable or incompatible configured fonts may fall back to a system font.
      continue
    }
  }
  throw new QuotationError(
    'DOCUMENT_GENERATION_FAILED',
    'No usable system font covers the text displayed in this PDF. Install a compatible Chinese .ttf font or set QUOTATION_PDF_FONT_PATH to a readable font file on the server.',
  )
}

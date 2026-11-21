import { inflateSync } from 'node:zlib'

/**
 * Minimal PDF text extractor (no native deps).
 * Handles common Tj / TJ / ' / " operators inside content streams.
 * Good enough for many Vlaamse EPC PDFs; falls back with a warning otherwise.
 */

export function extractPdfText(bytes: Uint8Array): { text: string; warnings: string[] } {
  const warnings: string[] = []
  const raw = decodePdfBytes(bytes)
  const streams = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)].map((m) => m[1] ?? '')
  if (streams.length === 0) {
    warnings.push('No PDF content streams found')
    return { text: '', warnings }
  }

  const chunks: string[] = []
  for (const stream of streams) {
    const inflated = maybeInflate(stream, warnings)
    chunks.push(extractOperators(inflated))
  }

  const text = chunks
    .join('\n')
    .replace(/\s+/g, ' ')
    .replace(/(\w)\s+(?=\w)/g, '$1')
    .trim()

  if (text.length < 40) {
    warnings.push('Extracted little text — PDF may be scanned or use unsupported encoding')
  }
  return { text, warnings }
}

function decodePdfBytes(bytes: Uint8Array): string {
  // Prefer latin1 so binary Flate streams stay round-trippable as bytes via charCodeAt
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return s
}

function maybeInflate(stream: string, warnings: string[]): string {
  // Detect FlateDecode by looking at zlib header in binary
  const bytes = Uint8Array.from(stream, (c) => c.charCodeAt(0))
  if (bytes.length >= 2 && bytes[0] === 0x78) {
    try {
      const inflated = inflateSync(bytes)
      return new TextDecoder('latin1').decode(inflated)
    } catch {
      warnings.push('FlateDecode stream could not be inflated')
      return stream
    }
  }
  return stream
}

function extractOperators(content: string): string {
  const out: string[] = []
  // Grab literal strings used with text-showing ops
  const simple = /\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|\[(.*?)\]\s*TJ/gs
  let m: RegExpExecArray | null
  while ((m = simple.exec(content))) {
    if (m[0].includes('TJ') && m[1] != null) {
      const parts = [...m[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((p) => unescapePdfString(p[0]!.slice(1, -1)))
      out.push(parts.join(''))
    } else {
      const lit = m[0].match(/\((?:\\.|[^\\)])*\)/)
      if (lit) out.push(unescapePdfString(lit[0].slice(1, -1)))
    }
  }
  return out.join(' ')
}

function unescapePdfString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([nrtbf()\\])/g, '$1')
    .replace(/\\(\d{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)))
}

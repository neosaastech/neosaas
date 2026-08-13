export interface TocHeading {
  id: string
  text: string
  level: 2 | 3 | 4
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
}

/** Payload's HTML output entity-escapes heading text (French apostrophes/quotes) — undo that for display; slugify() below strips the rest anyway. */
function decodeEntities(text: string): string {
  return text
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code) => {
      if (code[0] === "#") {
        const codePoint = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
        return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
      }
      return NAMED_ENTITIES[code] ?? match
    })
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).trim()
}

const COMBINING_MARKS_RE = new RegExp("[\\u0300-\\u036f]", "g")

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

const HEADING_RE = /<h([234])([^>]*)>([\s\S]*?)<\/h\1>/g

/**
 * Payload's convertLexicalToHTML (payload-cms's own richtext-lexical/html
 * converter) never adds `id` attributes to headings — there's nothing to
 * anchor a TOC link to without this. Done here on the site side (not in
 * payload-cms) so it stays a pure render-time concern, doesn't touch the
 * synced bodyHtml column, and re-derives cleanly if an article is edited.
 */
export function injectHeadingIds(html: string): string {
  const seen = new Map<string, number>()
  return html.replace(HEADING_RE, (match, level, attrs, inner) => {
    if (/\sid=/.test(attrs)) return match // already has one — don't clobber an editor-set anchor
    const base = slugify(stripTags(inner)) || `section-${level}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    const id = count === 0 ? base : `${base}-${count}`
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`
  })
}

/** Reads back the ids injectHeadingIds just wrote — call after it, not before. */
export function extractHeadings(html: string): TocHeading[] {
  const headings: TocHeading[] = []
  for (const match of html.matchAll(HEADING_RE)) {
    const [, level, attrs, inner] = match
    const idMatch = attrs.match(/\sid="([^"]+)"/)
    if (!idMatch) continue
    headings.push({ id: idMatch[1], text: stripTags(inner), level: Number(level) as 2 | 3 | 4 })
  }
  return headings
}

/**
 * Splits after the first top-level paragraph (the article's usual
 * quote/intro line) so the TOC can render between it and the rest of the
 * body — a heuristic, not a real HTML parse: fine for Lexical's own output,
 * which always opens a block-level element flush against the start of the
 * string, but would misbehave on hand-crafted HTML with a leading comment
 * or wrapper div (not something this pipeline ever produces).
 */
export function splitAfterFirstParagraph(html: string): { before: string; after: string } {
  const match = html.match(/^\s*<p[^>]*>[\s\S]*?<\/p>/)
  if (!match) return { before: "", after: html }
  return { before: match[0], after: html.slice(match[0].length) }
}

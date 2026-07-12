"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $setSelection,
  FORMAT_TEXT_COMMAND,
  type EditorState,
  type RangeSelection,
} from "lexical"
import { $setBlocksType } from "@lexical/selection"
import { $createParagraphNode, type LexicalEditor } from "lexical"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from "@lexical/list"
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react"
import { loadLinkOptions, type LinkOption } from "./link-field-input"
import { getContentMedia } from "@/app/actions/pages"
import type { PayloadMediaSummary } from "@/lib/payload-bridge"
import { UploadNode, $createUploadNode } from "./lexical-upload-node"

/**
 * Real WYSIWYG editor (2026-07-04, Charles: "il faut un véritable éditeur,
 * l'inverse ne serait pas serieux") — Lexical, the same library Payload's
 * own admin uses for richText fields (@payloadcms/richtext-lexical is built
 * on the standalone `lexical`/`@lexical/react` packages used here), so the
 * serialized editor state is genuinely Payload-compatible, not a lossy
 * plain-text stand-in. Toolbar covers the common blog-post cases (bold/
 * italic/underline, H1-H6, lists, quote, link, image) — not full parity with
 * every feature Payload's default lexicalEditor() registers (relationship
 * blocks aren't reproduced here, that stays Payload-admin-only). Image
 * insertion (lexical-upload-node.tsx) exports the exact same {type:"upload",
 * relationTo, value, fields} shape as Payload's own UploadNode (verified
 * against the installed @payloadcms/richtext-lexical package), so
 * convertLexicalToHTML — the server-side converter that renders this into
 * the live site's <img>/<picture> — needs no awareness this editor exists.
 */

const theme = {
  paragraph: "mb-2",
  heading: {
    h1: "text-2xl font-bold mt-4 mb-2",
    h2: "text-xl font-bold mt-4 mb-2",
    h3: "text-lg font-bold mt-3 mb-2",
    h4: "text-base font-bold mt-3 mb-2",
    h5: "text-sm font-bold mt-2 mb-1",
    h6: "text-xs font-bold uppercase tracking-wide mt-2 mb-1",
  },
  list: {
    ul: "list-disc list-inside mb-2",
    ol: "list-decimal list-inside mb-2",
  },
  quote: "border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground my-2",
  link: "text-primary underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
  },
}

function Toolbar() {
  const [editor] = useLexicalComposerContext()

  const formatHeading = (tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(tag))
      }
    })
  }

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode())
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}>
        <Underline className="h-4 w-4" />
      </Button>
      <div className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h1")}>
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h2")}>
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h3")}>
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h4")}>
        <Heading4 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h5")}>
        <Heading5 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h6")}>
        <Heading6 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={formatParagraph}>
        P
      </Button>
      <div className="mx-1 h-5 w-px bg-border" />
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={formatQuote}>
        <Quote className="h-4 w-4" />
      </Button>
      <LinkInsertButton editor={editor} />
      <ImageInsertButton editor={editor} />
    </div>
  )
}

// Charles (2026-07-11): "pas d'image alors que l'on avait parlé d'avoir un
// gestionnaire de media en sous menu de content" — the Media sub-menu
// already exists (cms.neokube.fr/admin/collections/media) but the rich
// editor itself had no way to insert one into the body. Reuses the same
// media list (getContentMedia) as MediaPickerField, filtered to images,
// in the same Popover+Command combobox pattern as LinkInsertButton above.
let cachedImageMedia: PayloadMediaSummary[] | null = null

function ImageInsertButton({ editor }: { editor: LexicalEditor }) {
  const [open, setOpen] = useState(false)
  const [media, setMedia] = useState<PayloadMediaSummary[]>(cachedImageMedia ?? [])

  useEffect(() => {
    if (open && !cachedImageMedia) {
      getContentMedia({ limit: 100 }).then((result) => {
        if (result.success) {
          const images = result.data.filter((m) => (m.mimeType ?? "").startsWith("image/"))
          cachedImageMedia = images
          setMedia(images)
        }
      })
    }
  }, [open])

  function insertImage(item: PayloadMediaSummary) {
    editor.update(() => {
      const node = $createUploadNode({
        relationTo: "media",
        value: item.id,
        fields: item.alt ? { alt: item.alt } : undefined,
        url: item.url,
        filename: item.filename,
      })
      $insertNodes([node])
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search media by filename..." />
          <CommandList>
            <CommandEmpty>No image found.</CommandEmpty>
            <CommandGroup>
              {media.map((m) => (
                <CommandItem key={m.id} value={m.filename} onSelect={() => insertImage(m)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Payload media URL, not a local /public asset next/image can optimize */}
                  <img src={m.url} alt="" className="mr-2 h-6 w-6 rounded object-cover" />
                  {m.filename}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Charles (2026-07-09): "on aimerait pouvoir récupérer les liens directement
 * dans un selecteur des pages actives" — the link toolbar button used a bare
 * window.prompt() for the URL, no different from typing a raw URL into a
 * text field. Reuses LinkFieldInput's own option-loading (same cached pages/
 * articles list, now including the hardcoded /pricing and /legal/* routes)
 * so the same search box exists everywhere a link is created, not just on
 * *Href block fields.
 */
function LinkInsertButton({ editor }: { editor: LexicalEditor }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<LinkOption[]>([])
  const [customUrl, setCustomUrl] = useState("")
  // Opening the Popover moves DOM focus into its CommandInput, and Lexical
  // re-syncs its model selection from the (now empty) DOM selection on the
  // next focus-out — losing the text the user had highlighted before the
  // link's own selection ever reaches TOGGLE_LINK_COMMAND. Snapshotting the
  // selection at open time and restoring it right before dispatching the
  // command (same pattern Lexical's own playground FloatingLinkEditor uses)
  // fixes it — confirmed live: without this, clicking a link option toggled
  // nothing, no error, no visible link.
  const savedSelectionRef = useRef<RangeSelection | null>(null)

  function openPicker() {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      savedSelectionRef.current = $isRangeSelection(selection) ? selection.clone() : null
    })
    setOpen(true)
  }

  useEffect(() => {
    if (open && options.length === 0) {
      loadLinkOptions().then(setOptions)
    }
  }, [open, options.length])

  function applyLink(url: string) {
    if (!url) return
    if (savedSelectionRef.current) {
      const restored = savedSelectionRef.current
      editor.update(() => {
        $setSelection(restored)
      })
    }
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    setOpen(false)
    setCustomUrl("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" onClick={openPicker}>
          <LinkIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by title or path..." />
          <CommandList>
            <CommandEmpty>No page found.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => applyLink(o.value)}>
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex gap-1 border-t p-2">
          <Input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https:// or /path"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                applyLink(customUrl.trim())
              }
            }}
          />
          <Button type="button" size="sm" className="h-8" disabled={!customUrl.trim()} onClick={() => applyLink(customUrl.trim())}>
            Add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface RichTextEditorProps {
  /** Payload's Lexical editor state, as JSON — same shape as the richText field stores. Undefined/null for a new, empty article. */
  initialValue?: unknown
  onChange: (value: unknown) => void
}

/** Read-only render of the same Lexical value — reuses the editor's own nodes/theme so the preview can't drift from what the editor actually produces (no separate JSON-to-JSX renderer to keep in sync). */
export function RichTextPreview({ value }: { value: unknown }) {
  const editorStateJson = value && typeof value === "object" ? JSON.stringify(value) : undefined
  if (!editorStateJson) {
    return <p className="text-sm text-muted-foreground">Aucun contenu.</p>
  }
  const initialConfig = {
    namespace: "article-body-preview",
    theme,
    editable: false,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, UploadNode],
    editorState: editorStateJson,
    onError: (error: Error) => {
      console.error("[RichTextPreview] Lexical error:", error)
    },
  }
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="text-sm outline-hidden" />}
        placeholder={null}
        ErrorBoundary={LexicalErrorBoundary}
      />
    </LexicalComposer>
  )
}

export function RichTextEditor({ initialValue, onChange }: RichTextEditorProps) {
  const [editorStateJson] = useState(() =>
    initialValue && typeof initialValue === "object" ? JSON.stringify(initialValue) : undefined,
  )

  const initialConfig = {
    namespace: "article-body",
    theme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, UploadNode],
    editorState: editorStateJson,
    onError: (error: Error) => {
      console.error("[RichTextEditor] Lexical error:", error)
    },
  }

  const handleChange = useCallback(
    (state: EditorState) => {
      onChange(state.toJSON())
    },
    [onChange],
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="rounded-md border">
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[240px] px-3 py-2 text-sm outline-hidden" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-0 top-0 px-3 py-2 text-sm text-muted-foreground">
                Écrivez le contenu de l&apos;article...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <ClearEditorPlugin />
        <OnChangePlugin onChange={handleChange} />
      </div>
    </LexicalComposer>
  )
}

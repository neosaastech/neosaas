"use client"

import { useCallback, useState } from "react"
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, type EditorState } from "lexical"
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
import { Bold, Italic, Underline, List, ListOrdered, Quote, Heading2, Heading3, Link as LinkIcon } from "lucide-react"

/**
 * Real WYSIWYG editor (2026-07-04, Charles: "il faut un véritable éditeur,
 * l'inverse ne serait pas serieux") — Lexical, the same library Payload's
 * own admin uses for richText fields (@payloadcms/richtext-lexical is built
 * on the standalone `lexical`/`@lexical/react` packages used here), so the
 * serialized editor state is genuinely Payload-compatible, not a lossy
 * plain-text stand-in. Toolbar covers the common blog-post cases (bold/
 * italic/underline, H2/H3, lists, quote, link) — not full parity with every
 * feature Payload's default lexicalEditor() registers (media embeds,
 * relationship blocks aren't reproduced here, those stay Payload-admin-only).
 */

const theme = {
  paragraph: "mb-2",
  heading: { h2: "text-xl font-bold mt-4 mb-2", h3: "text-lg font-bold mt-3 mb-2" },
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

  const formatHeading = (tag: "h2" | "h3") => {
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

  const insertLink = () => {
    const url = window.prompt("URL du lien")
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
    }
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
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h2")}>
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => formatHeading("h3")}>
        <Heading3 className="h-4 w-4" />
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
      <Button type="button" variant="ghost" size="sm" onClick={insertLink}>
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
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
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    editorState: editorStateJson,
    onError: (error: Error) => {
      console.error("[RichTextPreview] Lexical error:", error)
    },
  }
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable className="text-sm outline-none" />}
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
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
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
              <ContentEditable className="min-h-[240px] px-3 py-2 text-sm outline-none" />
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

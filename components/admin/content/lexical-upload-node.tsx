"use client"

import { DecoratorBlockNode, type SerializedDecoratorBlockNode } from "@lexical/react/LexicalDecoratorBlockNode"
import type { ElementFormatType, LexicalNode, NodeKey, SerializedLexicalNode, Spread } from "lexical"
import type { JSX } from "react"

/**
 * Matches @payloadcms/richtext-lexical's own UploadNode serialized shape
 * exactly (type:"upload", version:3, id/relationTo/value/fields — verified
 * against payload-cms's installed package, dist/features/upload/server/
 * nodes/UploadNode.js) so a document edited here round-trips through
 * Payload's own admin and, critically, through convertLexicalToHTML (the
 * server-side converter that turns this into the real <img>/<picture> on
 * the live site) without payload-cms needing any awareness that neosaas-v2
 * has its own standalone editor — it just sees a standard upload node.
 *
 * `url`/`filename`/`alt` are NOT part of Payload's shape (extra, harmless —
 * importJSON on Payload's side only reads id/fields/pending/relationTo/
 * value) but let this editor render/reopen an inserted image immediately
 * without a round-trip fetch by id.
 */
export interface UploadNodeData {
  id: string
  relationTo: string
  value: string | number
  fields?: { alt?: string } | null
  url?: string
  filename?: string
}

export type SerializedUploadNode = Spread<UploadNodeData, SerializedDecoratorBlockNode>

function randomObjectId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

export class UploadNode extends DecoratorBlockNode {
  __data: UploadNodeData

  constructor(data: UploadNodeData, format?: ElementFormatType, key?: NodeKey) {
    super(format, key)
    this.__data = data
  }

  static getType(): string {
    return "upload"
  }

  static clone(node: UploadNode): UploadNode {
    return new UploadNode(node.__data, node.__format, node.__key)
  }

  static importJSON(serialized: SerializedLexicalNode & Record<string, unknown>): UploadNode {
    const serializedNode = serialized as unknown as SerializedUploadNode
    const node = $createUploadNode({
      id: serializedNode.id,
      relationTo: serializedNode.relationTo,
      value: serializedNode.value,
      fields: serializedNode.fields,
      url: serializedNode.url,
      filename: serializedNode.filename,
    })
    node.setFormat(serializedNode.format)
    return node
  }

  exportJSON(): SerializedUploadNode {
    return {
      ...super.exportJSON(),
      ...this.getData(),
      type: "upload",
      version: 3,
    }
  }

  getData(): UploadNodeData {
    return this.getLatest().__data
  }

  decorate(): JSX.Element {
    const { url, filename, fields } = this.getData()
    if (!url) {
      return (
        <div className="my-2 rounded-md border bg-muted p-4 text-xs text-muted-foreground">
          Image indisponible
        </div>
      )
    }
    return (
      <img
        src={url}
        alt={fields?.alt ?? filename ?? ""}
        className="my-2 max-w-full rounded-md"
      />
    )
  }
}

export function $createUploadNode(data: Omit<UploadNodeData, "id"> & { id?: string }): UploadNode {
  return new UploadNode({ ...data, id: data.id ?? randomObjectId() })
}

export function $isUploadNode(node: LexicalNode | null | undefined): node is UploadNode {
  return node instanceof UploadNode
}

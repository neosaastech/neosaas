"use client"

import { Puck, type Config, type Data } from "@puckeditor/core"
import "@puckeditor/core/puck.css"

export function PuckEditor({
  config,
  data,
  onPublish,
}: {
  config: Config
  data: Data
  onPublish: (data: Data) => void
}) {
  return <Puck config={config} data={data} onPublish={onPublish} />
}

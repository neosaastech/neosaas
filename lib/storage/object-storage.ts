import { AwsClient } from "aws4fetch"

/**
 * Object storage is optional: the boilerplate must keep working (base64-in-Postgres)
 * for any fork/client deployment that hasn't provisioned a bucket. Every export here
 * checks configuration lazily and returns null/false instead of throwing at import time
 * (see CLAUDE-neosaas.md Gotcha #2 — top-level throws break the Next.js build).
 */
interface ObjectStorageConfig {
  accessKey: string
  secretKey: string
  bucketEndpoint: string
  region: string
}

function readConfig(): ObjectStorageConfig | null {
  const accessKey = process.env.SCW_ACCESS_KEY
  const secretKey = process.env.SCW_SECRET_KEY
  const bucketEndpoint = process.env.SCW_BUCKET_ENDPOINT
  const region = process.env.SCW_REGION

  if (!accessKey || !secretKey || !bucketEndpoint || !region) {
    return null
  }
  return { accessKey, secretKey, bucketEndpoint, region }
}

export function isObjectStorageConfigured(): boolean {
  return readConfig() !== null
}

function getClient(config: ObjectStorageConfig): AwsClient {
  return new AwsClient({
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    region: config.region,
    service: "s3",
  })
}

/**
 * Uploads a buffer to the configured Scaleway Object Storage bucket.
 * Throws if object storage isn't configured — callers must check
 * isObjectStorageConfigured() first and fall back to another storage path.
 */
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const config = readConfig()
  if (!config) {
    throw new Error("Object storage is not configured (SCW_* env vars missing)")
  }

  const url = `${config.bucketEndpoint}/${key}`
  const client = getClient(config)
  const response = await client.fetch(url, {
    method: "PUT",
    body: new Uint8Array(body),
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Object storage upload failed (${response.status}): ${text}`)
  }

  return url
}

export async function deleteObject(key: string): Promise<void> {
  const config = readConfig()
  if (!config) {
    throw new Error("Object storage is not configured (SCW_* env vars missing)")
  }

  const url = `${config.bucketEndpoint}/${key}`
  const client = getClient(config)
  const response = await client.fetch(url, { method: "DELETE" })

  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => "")
    throw new Error(`Object storage delete failed (${response.status}): ${text}`)
  }
}

/** Returns the public URL for a key without performing any I/O. */
export function getPublicUrl(key: string): string | null {
  const config = readConfig()
  if (!config) return null
  return `${config.bucketEndpoint}/${key}`
}

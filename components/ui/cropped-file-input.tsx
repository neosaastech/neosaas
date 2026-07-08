"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"
import { ImageCropper } from "@/components/ui/image-cropper"

interface CroppedFileInputProps {
  onFileReady: (file: File) => void
  accept?: string
  aspectRatio?: number
  fileName?: string
  /** Set to make the underlying input participate in a native form submission
   *  (e.g. `<form id="x">` elsewhere on the page) via the `form` attribute,
   *  in addition to the `onFileReady` callback. */
  name?: string
  form?: string
}

export interface CroppedFileInputHandle {
  open: () => void
  clear: () => void
}

/**
 * Drop-in replacement for a hidden `<input type="file">`: same imperative
 * `.open()` trigger, but routes the picked file through the shared
 * ImageCropper (react-easy-crop) before handing back a File, so every
 * avatar/logo picker in the app gets the same interactive crop step
 * instead of each screen doing its own silent server-side auto-crop.
 */
export const CroppedFileInput = forwardRef<CroppedFileInputHandle, CroppedFileInputProps>(
  ({ onFileReady, accept = "image/*", aspectRatio = 1, fileName = "image.png", name, form }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [cropperOpen, setCropperOpen] = useState(false)

    useImperativeHandle(ref, () => ({
      open: () => inputRef.current?.click(),
      clear: () => {
        if (inputRef.current) inputRef.current.value = ""
      },
    }))

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageSrc(reader.result as string)
        setCropperOpen(true)
      }
      reader.readAsDataURL(file)
    }

    const handleCropComplete = (blob: Blob) => {
      const file = new File([blob], fileName, { type: "image/png" })

      // When wired to a native form via `name`/`form`, replace the input's
      // FileList with the cropped result so a plain `new FormData(form)`
      // submission picks up the crop instead of the original raw file.
      if (name && inputRef.current) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        inputRef.current.files = dataTransfer.files
      } else if (inputRef.current) {
        inputRef.current.value = ""
      }

      onFileReady(file)
    }

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          name={name}
          form={form}
          onChange={handleFileChange}
        />
        <ImageCropper
          imageSrc={imageSrc}
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          onCropComplete={handleCropComplete}
          aspectRatio={aspectRatio}
        />
      </>
    )
  }
)
CroppedFileInput.displayName = "CroppedFileInput"

export interface UploadResponse {
  objectKey: string
  publicUrl: string
  fileName?: string
  success: boolean
}

export interface PresignResponse {
  uploadUrl: string
  publicUrl: string
  objectKey: string
  success?: boolean
}

export interface ViewResponse {
  viewUrl: string
  objectKey: string
  success?: boolean
}

export interface DeleteResponse {
  success: boolean
}

export function useStorage() {
  async function getPresignedUrl(fileName: string, fileType: string, folder = 'receipts'): Promise<PresignResponse> {
    const res: any = await $fetch('/api/storage/presign', {
      method: 'POST',
      body: { fileName, fileType, folder },
    })

    if (!res?.uploadUrl) {
      throw new Error(res?.statusMessage || 'Gagal mendapatkan presigned URL dari Cloudflare R2')
    }

    return res
  }

  async function getViewUrl(objectKey: string): Promise<ViewResponse> {
    const res: any = await $fetch('/api/storage/view', {
      query: { objectKey },
    })

    if (!res?.viewUrl) {
      throw new Error('Gagal mendapatkan view URL')
    }

    return res
  }

  async function deleteObject(objectKey: string): Promise<DeleteResponse> {
    const res: any = await $fetch('/api/storage/delete', {
      method: 'DELETE',
      body: { objectKey },
    })

    return res
  }

  // Upload to Cloudflare R2 via Nuxt Server proxy (CORS-free, highly reliable)
  async function uploadFile(
    fileOrBase64: File | Blob | string,
    fileName?: string,
    fileType?: string,
    folder = 'receipts'
  ): Promise<UploadResponse> {
    let base64String = ''
    let name = fileName || `receipt_${Date.now()}.jpg`
    let type = fileType || 'image/jpeg'

    if (typeof fileOrBase64 === 'string') {
      base64String = fileOrBase64
    } else {
      if (fileOrBase64 instanceof File) {
        name = fileOrBase64.name
        type = fileOrBase64.type || type
      }
      base64String = await blobToBase64(fileOrBase64)
    }

    const res: any = await $fetch('/api/storage/upload', {
      method: 'POST',
      body: {
        base64: base64String,
        fileName: name,
        fileType: type,
        folder,
      },
    })

    if (!res?.success || !res?.objectKey) {
      throw new Error(res?.statusMessage || 'Gagal mengunggah foto struk ke Cloudflare R2')
    }

    return res
  }

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result || '')
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  return {
    getPresignedUrl,
    getViewUrl,
    deleteObject,
    uploadFile,
  }
}
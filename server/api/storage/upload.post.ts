import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const accessKeyId = config.r2AccessKeyId
    const secretAccessKey = config.r2SecretAccessKey
    const accountId = config.r2AccountId
    const bucketName = config.r2BucketName

    if (!accessKeyId || !secretAccessKey || !accountId || !bucketName) {
      throw createError({
        statusCode: 500,
        statusMessage: 'R2 configuration missing on server',
      })
    }

    const body = await readBody(event)
    const { base64, fileName = `receipt_${Date.now()}.jpg`, fileType = 'image/jpeg', folder = 'receipts' } = body || {}

    if (!base64) {
      throw createError({
        statusCode: 400,
        statusMessage: 'base64 image data is required',
      })
    }

    // Clean base64 string
    let cleanBase64 = base64
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1]
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '')

    const buffer = Buffer.from(cleanBase64, 'base64')
    const objectKey = `${folder}/${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const s3 = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: buffer,
      ContentType: fileType,
    })

    await s3.send(command)

    const publicUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`

    return {
      success: true,
      objectKey,
      publicUrl,
      fileName,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[storage.upload] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Gagal mengunggah ke Cloudflare R2' })
  }
})

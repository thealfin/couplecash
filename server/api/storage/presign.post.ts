import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { fileName, fileType, folder = 'uploads' } = body

    if (!fileName || !fileType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'fileName and fileType are required',
      })
    }

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

    const s3 = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const objectKey = `${folder}/${crypto.randomUUID()}-${fileName}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: fileType,
    })

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    const publicUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`

    return {
      success: true,
      uploadUrl,
      publicUrl,
      objectKey,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[storage.presign] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
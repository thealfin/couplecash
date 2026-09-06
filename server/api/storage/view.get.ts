import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { objectKey } = query

    if (!objectKey) {
      throw createError({
        statusCode: 400,
        statusMessage: 'objectKey is required',
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

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    })

    const viewUrl = await getSignedUrl(s3, command, { expiresIn: 300 })

    return {
      success: true,
      viewUrl,
      objectKey,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[storage.view] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
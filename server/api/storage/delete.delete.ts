import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { objectKey } = body

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

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    })

    await s3.send(command)

    return {
      success: true,
      message: 'Object deleted successfully',
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[storage.delete] error:', err?.message ?? err)
    throw createError({ statusCode: 500, statusMessage: err?.message ?? 'Internal server error' })
  }
})
import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export default defineEventHandler(async (event) => {
  const apiKey = getHeader(event, 'x-gemini-api-key');
  if (!apiKey) {
    throw createError({
      statusCode: 401,
      statusMessage: 'AI_KEY_MISSING',
      message: 'Gemini API Key tidak ditemukan. Silakan atur di menu Akun > AI.',
    });
  }

    const body = await readBody(event);
  const { objectKey, bucket, imageBase64: directBase64, fileType = 'image/jpeg', preferredModel = 'gemini-2.5-flash' } = body || {};

  let finalBase64 = directBase64;
  let finalMimeType = fileType;

  // Jika objectKey diberikan dan directBase64 kosong, ambil file dari R2
  if (!finalBase64 && objectKey && bucket) {
    const config = useRuntimeConfig();
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2AccessKeyId,
        secretAccessKey: config.r2SecretAccessKey,
      },
    });

    const getCmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
    const response = await r2.send(getCmd);
    if (!response.Body) {
      throw createError({ statusCode: 404, statusMessage: 'OBJECT_NOT_FOUND', message: 'Foto struk tidak ditemukan di storage' });
    }
    const bytes = await response.Body.transformToByteArray();
    finalBase64 = Buffer.from(bytes).toString('base64');
    finalMimeType = response.ContentType || 'image/jpeg';
  }

  if (!finalBase64) {
    throw createError({ statusCode: 400, statusMessage: 'IMAGE_DATA_MISSING', message: 'Data gambar struk tidak ditemukan' });
  }

  // Bersihkan base64 dari prefix data URI dan whitespace
  let cleanBase64 = finalBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }
  cleanBase64 = cleanBase64.replace(/\s+/g, '');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentYear = today.getFullYear();

    const prompt = `Ekstrak data transaksi keuangan dari foto struk/nota belanja ini secara akurat menjadi format JSON.
Catatan Waktu Sistem: Tanggal hari ini adalah ${todayStr} (Tahun ${currentYear}).
Format output JSON WAJIB dengan field berikut:
{
  "merchant": string (nama toko/restoran/penjual, misal "Grand Lucky", "Starbucks", "Indomaret"),
  "date": string (format YYYY-MM-DD. Gunakan tanggal transaksi jika tertera jelas di struk. Jika tahun tidak tertera jelas, hanya 2 digit, atau struk baru, WAJIB gunakan tahun berjalan ${currentYear}. Jika tanggal tidak terbaca sama sekali, gunakan tanggal hari ini "${todayStr}"),
  "time": string (format HH:mm, default "12:00" jika tidak ada),
  "subtotal": number (subtotal belanja sebelum pajak dan diskon dalam Rupiah, bulat integer tanpa desimal, default 0),
  "discount": number (nilai total diskon/potongan harga jika ada dalam Rupiah, bulat integer, default 0),
  "tax_amount": number (pajak / PPN / PB1 jika tercantum dalam struk dalam Rupiah, bulat integer tanpa desimal, default 0),
  "service_charge": number (biaya layanan/service charge jika ada dalam Rupiah, bulat integer, default 0),
  "amount": number (grand total nominal akhir yang dibayarkan dalam Rupiah, bulat integer tanpa koma/desimal),
  "payment_method": string atau null (salah satu dari: "QRIS", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "VIRTUAL_ACCOUNT", atau null jika tunai/cash/tidak diketahui),
  "suggested_category": string (rekomendasi kategori CoupleCash yang paling cocok: "Makan & Minum", "Belanja Bulanan", "Transportasi", "Hutang & Kewajiban", "Tagihan & Utilitas", "Hiburan & Rekreasi", "Kesehatan", "Pendidikan", atau "Lainnya"),
  "confidence": number (nilai 0.0 sampai 1.0 yang menunjukkan tingkat keyakinan ekstraksi),
  "items": array of objects [{"name": string, "qty": number, "price": number}]
}

Ketentuan Khusus:
1. "amount" adalah grand total akhir yang dibayar konsumen.
2. "tax_amount" adalah komponen pajak yang termasuk dalam grand total (bukan tambahan di luar grand total). tax_amount tidak boleh lebih besar dari amount.
3. Hanya gunakan enum payment_method yang ditentukan jika jelas tercantum di struk. Jika tunai/cash, set payment_method ke null.
4. "date" WAJIB berformat YYYY-MM-DD yang valid. Jangan gunakan tahun lampau sebelum ${currentYear} kecuali tertera secara eksplisit dengan 4 digit tahun di atas kertas struk.`;

    // Candidate models: enforce Gemini >= 2.5 (with auto-fallback to gemini-3.6-flash / gemini-flash-latest)
    const candidateModels = preferredModel === 'gemini-2.5-pro'
      ? ['gemini-2.5-pro', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash']
      : ['gemini-2.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-pro'];

    let lastError: any = null;
    let result: any = null;
    let usedModel = '';

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: 'application/json' },
        });

        result = await model.generateContent([
          { inlineData: { data: cleanBase64, mimeType: finalMimeType } },
          { text: prompt },
        ]);

        if (result?.response) {
          usedModel = modelName;
          console.log(`[analyze-receipt] Successfully processed using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[analyze-receipt] Model ${modelName} failed:`, err?.message || err);
      }
    }

    if (!result && lastError) {
      throw lastError;
    }

    const rawText = result.response.text();
    const cleanJson = rawText.replace(/```(?:json)?/gi, '').trim();
    const parsedData = JSON.parse(cleanJson);

    // Sanitize numeric fields
    const amount = Math.max(0, Math.round(Number(parsedData.amount) || 0));
    const subtotal = Math.max(0, Math.round(Number(parsedData.subtotal) || amount));
    const discount = Math.max(0, Math.round(Number(parsedData.discount) || 0));
    let taxAmount = Math.max(0, Math.round(Number(parsedData.tax_amount) || 0));
    if (taxAmount > amount) {
      taxAmount = 0; // Guard constraint
    }
    const serviceCharge = Math.max(0, Math.round(Number(parsedData.service_charge) || 0));

    // Validate payment method
    const validMethods = ['QRIS', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT'];
    const paymentMethod = validMethods.includes(parsedData.payment_method) ? parsedData.payment_method : null;

    return {
      success: true,
      data: {
        ...parsedData,
        amount,
        subtotal,
        discount,
        tax_amount: taxAmount,
        service_charge: serviceCharge,
        payment_method: paymentMethod,
        modelUsed: usedModel,
      },
    };
  } catch (err: any) {
    console.error('AI receipt scan error:', err);
    const errMsg = err?.message || '';
    let code = 'AI_UNKNOWN_ERROR';
    let userMsg = 'Gagal membaca struk dengan AI';

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || err?.status === 401) {
      code = 'AI_KEY_INVALID';
      userMsg = 'API Key Gemini tidak valid. Silakan periksa kembali di menu Akun > AI.';
    } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || err?.status === 429) {
      code = 'AI_QUOTA_EXCEEDED';
      userMsg = 'Kuota Gemini API habis atau rate limit tercapai. Silakan coba beberapa saat lagi.';
    } else if (errMsg.includes('SAFETY') || errMsg.includes('blocked')) {
      code = 'AI_SAFETY_BLOCKED';
      userMsg = 'Gambar struk tidak dapat diproses oleh kebijakan keamanan AI.';
    } else if (errMsg) {
      userMsg = errMsg;
    }

    throw createError({
      statusCode: 400,
      statusMessage: code,
      message: userMsg,
      data: { originalError: errMsg },
    });
  }
});

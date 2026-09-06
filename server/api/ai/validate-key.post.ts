import { GoogleGenerativeAI } from '@google/generative-ai';

export default defineEventHandler(async (event) => {
  const apiKey = getHeader(event, 'x-gemini-api-key');

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { valid: false, error: 'Kunci API Gemini tidak boleh kosong' };
  }

  const cleanKey = apiKey.trim();

  try {
    // 1. Fast, quota-free metadata check against Google Gemini models endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`);
    const data = await response.json();

    if (response.ok && data.models && Array.isArray(data.models)) {
      return { valid: true };
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || '';
      const isQuota = response.status === 429 || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        return { valid: false, error: 'Kuota Gemini API Key Anda telah habis. Silakan periksa di Google AI Studio.' };
      }
      if (response.status === 400 || response.status === 401 || response.status === 403 || errorMsg.includes('API key not valid')) {
        return { valid: false, error: 'Kunci API Gemini tidak valid atau tidak memiliki akses (periksa kembali kunci Anda).' };
      }
      return { valid: false, error: errorMsg || 'Validasi kunci Gemini API gagal.' };
    }

    // 2. Fallback check with SDK if models endpoint response was non-standard
    const genAI = new GoogleGenerativeAI(cleanKey);
    const candidateModels = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.5-flash'];
    let lastErr: any = null;
    let tested = false;

    for (const m of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        await model.generateContent('ping');
        tested = true;
        break;
      } catch (e: any) {
        lastErr = e;
        if (e?.status === 404) continue;
        throw e;
      }
    }

    if (!tested && lastErr) throw lastErr;

    return { valid: true };
  } catch (error: any) {
    const isQuota = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
    const message = isQuota
      ? 'Kuota Gemini API Key Anda telah habis. Silakan periksa di Google AI Studio.'
      : (error?.message || 'Kunci API Gemini tidak valid atau tidak memiliki akses.');

    return { valid: false, error: message };
  }
});

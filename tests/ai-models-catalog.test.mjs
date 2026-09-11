import test from 'node:test'
import assert from 'node:assert/strict'

// Test catalog of Gemini models from 2.5 Flash/Pro up to 3.8 Flash/Pro, including 3.1, 3.6, 3.7
const REQUIRED_SERIES = ['2.5', '3.0', '3.1', '3.5', '3.6', '3.7', '3.8']
const REQUIRED_TIERS = ['flash', 'pro']

const AVAILABLE_AI_MODELS = [
  // ── Generasi 2.5 ──
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    series: '2.5',
    tier: 'flash',
    badge: 'Rekomendasi Utama',
    speedText: '~0.8s (Kilat)',
    powerTitle: 'Cepat & Hemat Token',
    powerDescription: 'Optimal untuk pemindaian struk harian dan tanya jawab anggaran instan.',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    series: '2.5',
    tier: 'pro',
    badge: 'Akurasi Ekstra',
    speedText: '~1.8s (Mendalam)',
    powerTitle: 'Akurasi Tinggi & Kertas Pudar',
    powerDescription: 'Penalaran kuat untuk struk panjang apotek dan kalkulasi multi-pos.',
  },
  // ── Generasi 3.0 ──
  {
    id: 'gemini-3.0-flash',
    name: 'Gemini 3.0 Flash',
    series: '3.0',
    tier: 'flash',
    badge: 'Generasi Baru',
    speedText: '~0.7s (Super Cepat)',
    powerTitle: 'Responsif & Percakapan Luwes',
    powerDescription: 'Peningkatan pemahaman multi-turn dengan kecepatan tinggi.',
  },
  {
    id: 'gemini-3.0-pro',
    name: 'Gemini 3.0 Pro',
    series: '3.0',
    tier: 'pro',
    badge: 'Perencana Finansial',
    speedText: '~1.9s (Cerdas)',
    powerTitle: 'Logika & Simulasi Anggaran',
    powerDescription: 'Analisis cerdas untuk simulasi pelunasan hutang dan deteksi anomali belanja.',
  },
  // ── Generasi 3.1 ──
  {
    id: 'gemini-3.1-flash',
    name: 'Gemini 3.1 Flash',
    series: '3.1',
    tier: 'flash',
    badge: 'Efisiensi Tinggi',
    speedText: '~0.65s (Ringan)',
    powerTitle: 'Audit Pengeluaran Kilat & Ringkas',
    powerDescription: 'Penyempurnaan arsitektur 3.1 yang sangat hemat token dan stabil.',
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    series: '3.1',
    tier: 'pro',
    badge: 'Analisis Multi-Kategori',
    speedText: '~1.8s (Mendalam)',
    powerTitle: 'Korelasi Anggaran & Deteksi Kebocoran',
    powerDescription: 'Penalaran presisi untuk membandingkan pos anggaran antar bulan.',
  },
  // ── Generasi 3.5 ──
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    series: '3.5',
    tier: 'flash',
    badge: 'Next-Gen Speed',
    speedText: '~0.6s (Ultra Cepat)',
    powerTitle: 'Ekstraksi Cepat Multi-Konteks',
    powerDescription: 'Kecepatan kilat dengan context window luas untuk riwayat tahunan keluarga.',
  },
  {
    id: 'gemini-3.5-pro',
    name: 'Gemini 3.5 Pro',
    series: '3.5',
    tier: 'pro',
    badge: 'Master Audit Finansial',
    speedText: '~2.1s (Ultra Akurat)',
    powerTitle: 'Audit Mendalam & Rekomendasi Solutif',
    powerDescription: 'Kecerdasan tinggi untuk audit mendalam mutasi pengeluaran.',
  },
  // ── Generasi 3.6 ──
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    series: '3.6',
    tier: 'flash',
    badge: 'Ultra-Fast Parser',
    speedText: '~0.55s (Kilat Ekstrem)',
    powerTitle: 'Ekstraksi OCR & Parsing Kilat',
    powerDescription: 'Kecepatan decoding super cepat dengan toleransi tinggi terhadap struk belanja beresolusi rendah.',
  },
  {
    id: 'gemini-3.6-pro',
    name: 'Gemini 3.6 Pro',
    series: '3.6',
    tier: 'pro',
    badge: 'Strategi Pajak & Keuangan',
    speedText: '~2.2s (Komprehensif)',
    powerTitle: 'Optimalisasi Arus Kas & Hitung PB1/PPN',
    powerDescription: 'Kemampuan kalkulasi matematis canggih untuk membedah beban pajak struk.',
  },
  // ── Generasi 3.7 ──
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    series: '3.7',
    tier: 'flash',
    badge: 'Generasi Hibrida Tercepat',
    speedText: '~0.5s (Kecepatan Puncak)',
    powerTitle: 'Responsif & Pemahaman Konteks Tajam',
    powerDescription: 'Evolusi terkini model Flash dengan latency ultra rendah dan penalaran adaptif.',
  },
  {
    id: 'gemini-3.7-pro',
    name: 'Gemini 3.7 Pro',
    series: '3.7',
    tier: 'pro',
    badge: 'Hybrid Reasoning Engine',
    speedText: '~2.3s (Penalaran Adaptif)',
    powerTitle: 'Penalaran Cerdas & Proyeksi Finansial',
    powerDescription: 'Model mutakhir dengan kapabilitas hybrid reasoning untuk proyeksi masa depan.',
  },
  // ── Generasi 3.8 ──
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    series: '3.8',
    tier: 'flash',
    badge: 'Ultra-Fast Intelligence',
    speedText: '~0.5s (Kecepatan Puncak)',
    powerTitle: 'Kombinasi Kecepatan & Akurasi Puncak',
    powerDescription: 'Varian flash paling mutakhir generasi 3.8 dengan responsivitas ultra-cepat.',
  },
  {
    id: 'gemini-3.8-pro',
    name: 'Gemini 3.8 Pro',
    series: '3.8',
    tier: 'pro',
    badge: 'Flagship Supreme Intelligence',
    speedText: '~2.4s (Penalaran Puncak)',
    powerTitle: 'Puncak Kecerdasan AI Finansial',
    powerDescription: 'Model terlengkap dengan kapasitas penalaran terbaik untuk strategi kebebasan finansial.',
  },
]

test('AI Model Catalog contains all generations (2.5, 3.0, 3.1, 3.5, 3.6, 3.7, 3.8) in Flash and Pro tiers', () => {
  for (const series of REQUIRED_SERIES) {
    for (const tier of REQUIRED_TIERS) {
      const match = AVAILABLE_AI_MODELS.find(m => m.series === series && m.tier === tier)
      assert.ok(match, `Missing model for series ${series} tier ${tier}`)
      assert.ok(match.powerTitle.length > 3, `powerTitle too short for ${match.id}`)
      assert.ok(match.powerDescription.length > 10, `powerDescription too short for ${match.id}`)
      assert.ok(match.speedText.length > 3, `speedText too short for ${match.id}`)
    }
  }
})

test('Generation filters correctly partition models across all 7 series', () => {
  for (const series of REQUIRED_SERIES) {
    const subset = AVAILABLE_AI_MODELS.filter(m => m.series === series)
    assert.strictEqual(subset.length, 2, `Expected 2 models (flash & pro) in series ${series}`)
    assert.ok(subset.some(m => m.tier === 'flash'))
    assert.ok(subset.some(m => m.tier === 'pro'))
  }
})

test('Fallback candidate list construction preserves chosen model first without duplicates', () => {
  function getCandidateModels(preferredModel) {
    return [
      preferredModel,
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)
  }

  const listFor37Pro = getCandidateModels('gemini-3.7-pro')
  assert.strictEqual(listFor37Pro[0], 'gemini-3.7-pro')
  assert.ok(listFor37Pro.includes('gemini-2.5-flash'))
  assert.ok(listFor37Pro.includes('gemini-3.7-flash'))
  assert.strictEqual(new Set(listFor37Pro).size, listFor37Pro.length)

  const listFor25Flash = getCandidateModels('gemini-2.5-flash')
  assert.strictEqual(listFor25Flash[0], 'gemini-2.5-flash')
  assert.strictEqual(listFor25Flash.filter(x => x === 'gemini-2.5-flash').length, 1)
})

test('Round-robin logic immediately falls back to next candidate model on 503 high demand', async () => {
  const attempts = []

  async function mockGenerate(modelName) {
    attempts.push(modelName)
    if (modelName === 'gemini-3.8-flash') {
      const err = new Error('[503 Service Unavailable] This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.')
      err.status = 503
      throw err
    }
    return { text: `Success from ${modelName}` }
  }

  async function simulateRoundRobin(preferredModel) {
    const candidatePool = [
      preferredModel,
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-3.7-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)

    for (const model of candidatePool) {
      try {
        const res = await mockGenerate(model)
        return { text: res.text, usedModel: model }
      } catch (err) {
        const msg = String(err?.message || '').toLowerCase()
        const isHighDemand = err?.status === 503 || msg.includes('503') || msg.includes('high demand')
        if (isHighDemand) {
          continue // instantly round-robin
        }
        throw err
      }
    }
  }

  const result = await simulateRoundRobin('gemini-3.8-flash')
  assert.strictEqual(result.usedModel, 'gemini-2.5-flash')
  assert.strictEqual(result.text, 'Success from gemini-2.5-flash')
  assert.deepStrictEqual(attempts, ['gemini-3.8-flash', 'gemini-2.5-flash'])
})

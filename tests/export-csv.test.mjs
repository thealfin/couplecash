import assert from 'node:assert'

function sanitizeCsvCell(value) {
  if (value === null || value === undefined) {
    return '""'
  }
  let str = String(value)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

function generateTransactionsCsv(rows) {
  const headers = [
    'Tanggal',
    'Waktu',
    'Jenis Mutasi',
    'Kategori',
    'Pos Akun',
    'Nominal (Rupiah)',
    'Pajak (Rupiah)',
    'Kepemilikan',
    'Merchant / Toko',
    'Catatan Transaksi',
  ]

  const lines = []
  lines.push(headers.map(sanitizeCsvCell).join(','))

  for (const r of rows) {
    const rowValues = [
      r.date || '',
      r.time || '',
      r.type || '',
      r.category || '-',
      r.account || '-',
      r.amount ?? 0,
      r.taxAmount ?? 0,
      r.ownership || 'Bersama',
      r.merchant || '-',
      r.note || '',
    ]
    lines.push(rowValues.map(sanitizeCsvCell).join(','))
  }

  return '\uFEFF' + lines.join('\r\n')
}

console.log('🧪 Testing CSV Formula Injection Sanitization...')

// Test 1: Formula Injection test
const dangerousInputs = [
  '=SUM(A1:A10)',
  '+cmd| /C calc!A0',
  '-1337',
  '@SUM(1+1)',
  '\tmaliciousTab',
  '\rmaliciousReturn',
]

for (const input of dangerousInputs) {
  const sanitized = sanitizeCsvCell(input)
  assert(sanitized.startsWith('"\''), `Input ${input} was not properly escaped with leading apostrophe! Got: ${sanitized}`)
  console.log(`  ✓ Properly escaped: ${input} -> ${sanitized}`)
}

// Test 2: Standard Safe String & Quotes escaping
const quoteInput = 'Belanja di "Superindo"'
const sanitizedQuote = sanitizeCsvCell(quoteInput)
assert.strictEqual(sanitizedQuote, '"Belanja di ""Superindo"""')
console.log(`  ✓ Quotes escaped: ${quoteInput} -> ${sanitizedQuote}`)

// Test 3: CSV with BOM generation
const testRows = [
  {
    date: '2026-09-11',
    time: '14:30',
    type: 'Pengeluaran',
    category: 'Makan & Minum',
    account: 'BCA Utama',
    amount: 55000,
    taxAmount: 5500,
    ownership: 'Bersama',
    merchant: 'Kopi Kenangan',
    note: '=SUM(1,2) promo buy 1 get 1',
  }
]

const csvOutput = generateTransactionsCsv(testRows)
assert(csvOutput.startsWith('\uFEFF'), 'CSV output missing UTF-8 BOM mark!')
assert(csvOutput.includes('"\'=SUM(1,2) promo buy 1 get 1"'), 'Formula injection in note was not neutralized!')
console.log('  ✓ CSV Output includes UTF-8 BOM and neutralized formulas.')

console.log('\n🎉 ALL EXPORT CSV TESTS PASSED SUCCESSFULLY!')

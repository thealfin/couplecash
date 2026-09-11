/**
 * Utility Ekspor Data Finansial Keluarga CoupleCash ke format CSV standar Excel
 * Mengadopsi ExportService.ts dari referensi D:\React\CoupleCash
 * Dilengkapi proteksi Formula Injection & UTF-8 BOM untuk Microsoft Excel & Google Sheets
 */

/**
 * Sanitasi cell terhadap serangan Spreadsheet Formula Injection
 * Mencegah eksekusi rumus berbahaya jika string diawali =, +, -, @, tab, return
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""'
  }

  let str = String(value)

  // Proteksi formula injection: jika karakter pertama adalah simbol formula Excel
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // Escape tanda kutip ganda di dalam cell CSV
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

/**
 * Menghasilkan file CSV Riwayat Transaksi dengan UTF-8 BOM
 */
export function generateTransactionsCsv(rows: any[]): string {
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

  const lines: string[] = []
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

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 Indonesian characters and numbers cleanly
  return '\uFEFF' + lines.join('\r\n')
}

/**
 * Menghasilkan file CSV Ringkasan Pos Akun dengan UTF-8 BOM
 */
export function generateAccountsCsv(rows: any[]): string {
  const headers = [
    'Nama Pos Akun',
    'Tipe Akun',
    'Kepemilikan',
    'Saldo Awal (Rupiah)',
    'Saldo Saat Ini (Rupiah)',
    'Status',
    'Keterangan',
  ]

  const lines: string[] = []
  lines.push(headers.map(sanitizeCsvCell).join(','))

  for (const r of rows) {
    const rowValues = [
      r.name || '',
      r.type || '',
      r.ownership || 'Bersama',
      r.initialBalance ?? 0,
      r.currentBalance ?? 0,
      r.status || 'Aktif',
      r.description || '',
    ]
    lines.push(rowValues.map(sanitizeCsvCell).join(','))
  }

  return '\uFEFF' + lines.join('\r\n')
}

/**
 * Memicu browser download otomatis berkas CSV
 */
export function downloadCsvFile(csvContent: string, filename: string) {
  if (typeof window === 'undefined') return

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

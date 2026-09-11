import assert from 'node:assert'

function formatDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function calculatePeriodRange(activeDate, periodFilter) {
  const base = new Date(activeDate)
  const y = base.getFullYear()
  const m = base.getMonth()

  if (periodFilter === '1w') {
    const dayOfWeek = base.getDay() // 0 = Sun
    const start = new Date(base)
    start.setDate(base.getDate() - dayOfWeek)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
      startDateStr: formatDateKey(start),
      endDateStr: formatDateKey(end),
      daysCount: 7,
      startDay: start.getDay(), // Should be 0 (Sunday)
      endDay: end.getDay(), // Should be 6 (Saturday)
    }
  } else if (periodFilter === '2w') {
    const dayOfWeek = base.getDay() // 0 = Sun
    const start = new Date(base)
    start.setDate(base.getDate() - dayOfWeek - 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 13)
    return {
      startDateStr: formatDateKey(start),
      endDateStr: formatDateKey(end),
      daysCount: 14,
      startDay: start.getDay(), // Should be 0 (Sunday)
      endDay: end.getDay(), // Should be 6 (Saturday)
    }
  } else {
    // 1m (Default)
    const start = new Date(y, m, 1)
    const end = new Date(y, m + 1, 0)
    return {
      startDateStr: formatDateKey(start),
      endDateStr: formatDateKey(end),
      daysCount: end.getDate(),
      startDay: start.getDay(),
      endDay: end.getDay(),
    }
  }
}

console.log('🧪 Testing Calendar Period Calculations (Week starts on Sunday)...')

// Test 1: 1w (1 Minggu)
// Example date: Friday, 2026-09-11
const testDate = new Date(2026, 8, 11) // Sep 11, 2026 (Friday)
const res1w = calculatePeriodRange(testDate, '1w')
assert.strictEqual(res1w.daysCount, 7, '1w must span 7 days')
assert.strictEqual(res1w.startDay, 0, '1w start must be Sunday')
assert.strictEqual(res1w.endDay, 6, '1w end must be Saturday')
assert.strictEqual(res1w.startDateStr, '2026-09-06', 'Sunday of that week should be 2026-09-06')
assert.strictEqual(res1w.endDateStr, '2026-09-12', 'Saturday of that week should be 2026-09-12')
console.log(`  ✓ 1w range: ${res1w.startDateStr} (Sun) to ${res1w.endDateStr} (Sat)`)

// Test 2: 2w (2 Minggu)
const res2w = calculatePeriodRange(testDate, '2w')
assert.strictEqual(res2w.daysCount, 14, '2w must span 14 days')
assert.strictEqual(res2w.startDay, 0, '2w start must be Sunday')
assert.strictEqual(res2w.endDay, 6, '2w end must be Saturday')
assert.strictEqual(res2w.startDateStr, '2026-08-30', 'Sunday of previous week should be 2026-08-30')
assert.strictEqual(res2w.endDateStr, '2026-09-12', 'Saturday of current week should be 2026-09-12')
console.log(`  ✓ 2w range: ${res2w.startDateStr} (Sun) to ${res2w.endDateStr} (Sat)`)

// Test 3: 1m (1 Bulan - Default)
const res1m = calculatePeriodRange(testDate, '1m')
assert.strictEqual(res1m.startDateStr, '2026-09-01', '1m start must be 1st of month')
assert.strictEqual(res1m.endDateStr, '2026-09-30', '1m end must be 30th of September')
console.log(`  ✓ 1m range: ${res1m.startDateStr} to ${res1m.endDateStr}`)

console.log('\n🎉 ALL CALENDAR PERIOD TESTS PASSED SUCCESSFULLY!')

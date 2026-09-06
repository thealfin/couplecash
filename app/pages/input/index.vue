<script setup lang="ts">
definePageMeta({ layout: 'app' })
useHead({ title: 'Pilih Input — CoupleCash' })
</script>

<template>
  <div class="input-select-page animate-fade-in px-page">

    <div class="header-section">
      <h1 class="page-title">Tambah Data Keuangan</h1>
      <p class="page-subtitle">Pilih metode input yang ingin kamu gunakan</p>
    </div>

    <div class="options-grid">

      <!-- Option 1: AI Receipt Scan -->
      <NuxtLink to="/input/kamera" class="option-card option-card--ai" id="opt-scan-ai">
        <div class="option-badge">✨ Direkomendasikan</div>
        <div class="option-icon option-icon--ai">
          <span class="material-symbols-outlined" style="font-size:28px">document_scanner</span>
        </div>
        <div class="option-info">
          <h2 class="option-title">Scan Struk AI</h2>
          <p class="option-desc">Foto struk belanja/cafe, AI mengektrak nominal & merchant otomatis.</p>
        </div>
        <span class="material-symbols-outlined option-arrow">arrow_forward</span>
      </NuxtLink>

      <!-- Option 2: Transaksi Manual -->
      <NuxtLink to="/input/transaksi" class="option-card" id="opt-manual">
        <div class="option-icon option-icon--manual">
          <span class="material-symbols-outlined" style="font-size:28px">edit_note</span>
        </div>
        <div class="option-info">
          <h2 class="option-title">Transaksi Manual</h2>
          <p class="option-desc">Input cepat pemasukan atau pengeluaran dalam 3 langkah mudah.</p>
        </div>
        <span class="material-symbols-outlined option-arrow">arrow_forward</span>
      </NuxtLink>

      <!-- Option 3: Atur Budget Baru -->
      <NuxtLink to="/budget" class="option-card" id="opt-budget">
        <div class="option-icon option-icon--budget">
          <span class="material-symbols-outlined" style="font-size:28px">savings</span>
        </div>
        <div class="option-info">
          <h2 class="option-title">Atur Budget Baru</h2>
          <p class="option-desc">Tentukan alokasi batas belanja bulanan per kategori.</p>
        </div>
        <span class="material-symbols-outlined option-arrow">arrow_forward</span>
      </NuxtLink>

    </div>

  </div>
</template>

<style scoped>
.input-select-page { display:flex; flex-direction:column; gap:20px; padding-top:16px; padding-bottom:24px; }
.px-page { padding-left:16px; padding-right:16px; }

.header-section { text-align:center; display:flex; flex-direction:column; gap:4px; margin-bottom:8px; }
.page-title { margin:0; font-size:20px; font-weight:700; color:var(--on-surface); }
.page-subtitle { margin:0; font-size:13px; color:var(--muted); }

.options-grid { display:flex; flex-direction:column; gap:14px; }

.option-card {
  display:flex; align-items:center; gap:14px; padding:18px; border-radius:20px;
  background:var(--surface-container-lowest); text-decoration:none; color:inherit;
  box-shadow:0 2px 10px rgba(0,0,0,0.05); position:relative; overflow:hidden;
  transition:all 0.15s ease; border:1px solid transparent;
}
.option-card:active { transform:scale(0.98); }

.option-card--ai {
  background:linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, white) 0%, color-mix(in srgb, var(--secondary) 10%, white) 100%);
  border-color:color-mix(in srgb, var(--primary) 25%, transparent);
}

.option-badge {
  position:absolute; top:10px; right:12px; font-size:10px; font-weight:700;
  color:var(--primary); background:rgba(70,72,212,0.12); padding:2px 8px; border-radius:10px;
}

.option-icon {
  width:52px; height:52px; border-radius:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.option-icon--ai { background:var(--primary); color:white; box-shadow:0 4px 12px rgba(70,72,212,0.3); }
.option-icon--manual { background:var(--income); color:white; box-shadow:0 4px 12px rgba(16,185,129,0.3); }
.option-icon--budget { background:var(--secondary); color:white; box-shadow:0 4px 12px rgba(107,56,212,0.3); }

.option-info { flex:1; min-width:0; }
.option-title { margin:0 0 4px; font-size:16px; font-weight:700; color:var(--on-surface); }
.option-desc { margin:0; font-size:12px; color:var(--on-surface-variant); line-height:1.4; }

.option-arrow { color:var(--muted); flex-shrink:0; }
</style>

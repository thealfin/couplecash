<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Atur Ulang Kata Sandi — CoupleCash' })

const supabase = useSupabase()
const email = ref('')
const isLoading = ref(false)
const message = ref('')
const isError = ref(false)

async function handleReset() {
  if (!email.value) return
  isLoading.value = true
  message.value = ''
  
  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/auth/update-password`,
  })

  isLoading.value = false
  if (error) {
    isError.value = true
    message.value = error.message
  } else {
    isError.value = false
    message.value = 'Tautan atur ulang kata sandi telah dikirim ke email Anda.'
  }
}
</script>

<template>
  <div class="auth-container animate-fade-in">
    <div class="auth-content">
      <div class="auth-header">
        <h1 class="auth-title">Lupa <span class="auth-gradient-text">Kata Sandi?</span></h1>
        <p class="auth-subtitle">Masukkan email Anda untuk menerima tautan atur ulang kata sandi.</p>
      </div>

      <div class="form-box">
        <div v-if="message" :class="['message-banner', isError ? 'error' : 'success']">
          {{ message }}
        </div>

        <div class="input-group">
          <label class="input-label">Email</label>
          <div class="input-field">
            <span class="material-symbols-outlined input-icon">email</span>
            <input type="email" v-model="email" placeholder="contoh@email.com" class="text-input" @keyup.enter="handleReset" />
          </div>
        </div>

        <button class="primary-btn" @click="handleReset" :disabled="isLoading || !email">
          <span v-if="!isLoading">Kirim Tautan</span>
          <span v-else class="material-symbols-outlined animate-spin">refresh</span>
        </button>

        <button class="secondary-btn" @click="navigateTo('/auth/login')">Kembali ke Masuk</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reuse styles from login.vue via shared classes or copy essential ones */
.message-banner { padding: 10px; border-radius: 12px; font-size: 13px; margin-bottom: 10px; }
.error { background: #fee2e2; color: #991b1b; }
.success { background: #f0fdf4; color: #166534; }
/* ... existing auth styles ... */
</style>

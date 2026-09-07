export interface VaultCredentialItem {
  id: string
  platformType: 'bank' | 'e_wallet' | 'crypto_wallet' | 'lainnya'
  platformName: string
  bankName: string
  name: string
  usernameMasked: string
  owner: string
  ownerUserId: string
  isOwner: boolean
  secretEncrypted: string
  secretEncryptionIv: string
  encryptionVersion: number
  createdAt: string
  updatedAt: string
}

export function useVault() {
  const { getAuthToken } = useAuth()
  const { encryptSecret } = useVaultSecurity()

  const items = ref<VaultCredentialItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchVaultItems() {
    if (!import.meta.client) return
    loading.value = true
    error.value = null
    try {
      const token = await getAuthToken()
      if (!token) return

      const res: any = await $fetch('/api/vault', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res?.items) {
        items.value = res.items
      }
    } catch (err: any) {
      console.error('[useVault] fetchVaultItems error:', err)
      error.value = err?.data?.statusMessage || err?.message || 'Gagal memuat kredensial brankas'
    } finally {
      loading.value = false
    }
  }

  async function createVaultItem(payload: {
    platformType: 'bank' | 'e_wallet' | 'crypto_wallet' | 'lainnya'
    platformName: string
    usernameMasked: string
    secretPlaintext: string
    ownerUserId?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Sesi masuk tidak ditemukan')

      // Client-side encryption: secret never leaves browser in plaintext
      const encrypted = await encryptSecret(payload.secretPlaintext)

      const res: any = await $fetch('/api/vault', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          platformType: payload.platformType,
          platformName: payload.platformName,
          usernameMasked: payload.usernameMasked,
          secretEncrypted: encrypted.ciphertext,
          secretEncryptionIv: encrypted.iv,
          encryptionVersion: encrypted.version,
          ownerUserId: payload.ownerUserId,
        },
      })

      await fetchVaultItems()
      return res
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.message || 'Gagal menambah kredensial'
      error.value = msg
      throw new Error(msg)
    } finally {
      loading.value = false
    }
  }

  async function updateVaultItem(
    id: string,
    payload: {
      platformType?: 'bank' | 'e_wallet' | 'crypto_wallet' | 'lainnya'
      platformName?: string
      usernameMasked?: string
      newSecretPlaintext?: string
      ownerUserId?: string
    }
  ) {
    loading.value = true
    error.value = null
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Sesi masuk tidak ditemukan')

      const body: Record<string, any> = {
        platformType: payload.platformType,
        platformName: payload.platformName,
        usernameMasked: payload.usernameMasked,
        ownerUserId: payload.ownerUserId,
      }

      // If user is replacing the secret, encrypt new one client-side
      if (payload.newSecretPlaintext && payload.newSecretPlaintext.trim() !== '') {
        const encrypted = await encryptSecret(payload.newSecretPlaintext)
        body.secretEncrypted = encrypted.ciphertext
        body.secretEncryptionIv = encrypted.iv
        body.encryptionVersion = encrypted.version
      }

      const res: any = await $fetch(`/api/vault/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })

      await fetchVaultItems()
      return res
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.message || 'Gagal memperbarui kredensial'
      error.value = msg
      throw new Error(msg)
    } finally {
      loading.value = false
    }
  }

  async function deleteVaultItem(id: string) {
    loading.value = true
    error.value = null
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Sesi masuk tidak ditemukan')

      await $fetch(`/api/vault/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      items.value = items.value.filter((i) => i.id !== id)
      return true
    } catch (err: any) {
      const msg = err?.data?.statusMessage || err?.message || 'Gagal menghapus kredensial'
      error.value = msg
      throw new Error(msg)
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    fetchVaultItems,
    createVaultItem,
    updateVaultItem,
    deleteVaultItem,
  }
}

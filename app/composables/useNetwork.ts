export function useNetwork() {
  const isOnline = useState<boolean>('isOnline', () => {
    if (typeof window !== 'undefined') {
      return navigator.onLine
    }
    return true
  })

  const wasOffline = useState<boolean>('wasOffline', () => false)
  const showBackOnlineToast = useState<boolean>('showBackOnlineToast', () => false)

  let timer: any = null

  const setOnline = (online: boolean) => {
    if (isOnline.value === online) return

    if (!online) {
      isOnline.value = false
      wasOffline.value = true
      showBackOnlineToast.value = false
    } else {
      isOnline.value = true
      if (wasOffline.value) {
        showBackOnlineToast.value = true
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          showBackOnlineToast.value = false
          wasOffline.value = false
        }, 3500)
      }
    }
  }

  return {
    isOnline,
    wasOffline,
    showBackOnlineToast,
    setOnline,
  }
}

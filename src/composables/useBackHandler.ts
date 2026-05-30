import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import router from '@/router'

let backHandlerReady = false

export function useBackHandler() {
  const setupBackHandler = async () => {
    if (backHandlerReady) return
    backHandlerReady = true

    if (Capacitor.getPlatform() !== 'android') return

    await CapacitorApp.addListener('backButton', () => {
      const currentRoute = router.currentRoute.value

      if (currentRoute.name !== 'home' && window.history.length > 1) {
        router.back()
        return
      }

      // Do nothing on home/root so app does not exit.
      console.log('At root route; not exiting app')
    })
  }

  return {
    setupBackHandler,
  }
}

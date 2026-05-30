import router from '@/router'

let swipeBackReady = false

let startX = 0
let startY = 0
let startTime = 0

const minDistance = 80
const maxVerticalMovement = 60
const maxTime = 500
const edgeWidth = 40

const onTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]

  startX = touch.clientX
  startY = touch.clientY
  startTime = Date.now()
}

const onTouchEnd = (event: TouchEvent) => {
  const touch = event.changedTouches[0]

  const deltaX = touch.clientX - startX
  const deltaY = Math.abs(touch.clientY - startY)
  const elapsed = Date.now() - startTime

  const startedNearLeftEdge = startX < edgeWidth
  const swipedRight = deltaX > minDistance

  if (
    startedNearLeftEdge &&
    swipedRight &&
    deltaY < maxVerticalMovement &&
    elapsed < maxTime &&
    window.history.length > 1
  ) {
    router.back()
  }
}

export function useSwipeBack() {
  const addSwipeBack = () => {
    if (swipeBackReady) return
    swipeBackReady = true

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
  }

  const removeSwipeBack = () => {
    if (!swipeBackReady) return
    swipeBackReady = false

    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
  }

  return {
    addSwipeBack,
    removeSwipeBack,
  }
}

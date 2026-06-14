import { ref } from 'vue'

export function useDraggable() {
  const isDragging = ref(false)
  const position = ref({ x: 0, y: 0 })
  const startPos = ref({ x: 0, y: 0 })
  const initialOffset = ref({ x: 0, y: 0 })
  let hasMoved = false

  function onMouseDown(e: MouseEvent) {
    hasMoved = false
    isDragging.value = true
    startPos.value = { x: e.clientX, y: e.clientY }
    initialOffset.value = { ...position.value }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return
    const dx = e.clientX - startPos.value.x
    const dy = e.clientY - startPos.value.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved = true
    }
    position.value = {
      x: initialOffset.value.x + dx,
      y: initialOffset.value.y + dy
    }
  }

  function onMouseUp() {
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  // Touch events
  function onTouchStart(e: TouchEvent) {
    hasMoved = false
    isDragging.value = true
    const touch = e.touches[0]
    startPos.value = { x: touch.clientX, y: touch.clientY }
    initialOffset.value = { ...position.value }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  function onTouchMove(e: TouchEvent) {
    if (!isDragging.value) return
    e.preventDefault()
    const touch = e.touches[0]
    const dx = touch.clientX - startPos.value.x
    const dy = touch.clientY - startPos.value.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved = true
    }
    position.value = {
      x: initialOffset.value.x + dx,
      y: initialOffset.value.y + dy
    }
  }

  function onTouchEnd() {
    isDragging.value = false
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  }

  return {
    isDragging,
    position,
    hasMoved,
    onMouseDown,
    onTouchStart
  }
}

import { watch, onUnmounted, type Ref } from 'vue'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let activeLenis: Lenis | null = null

export function scrollToTarget(target: string | number | HTMLElement, offset = -76): void {
  if (activeLenis) {
    activeLenis.scrollTo(target, { offset, duration: 1.05 })
    return
  }

  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' })
    return
  }

  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (el instanceof HTMLElement) {
    const top = el.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
}

export function useSmoothScroll(enabledRef: Ref<boolean>): void {
  let tickerCallback: ((time: number) => void) | null = null

  const destroy = (): void => {
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback)
      tickerCallback = null
    }
    if (activeLenis) {
      activeLenis.destroy()
      activeLenis = null
    }
  }

  const init = (): void => {
    destroy()
    if (typeof window === 'undefined') return

    // Respetar preferencia de movimiento reducido del sistema operativo
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5
    })

    activeLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)

    tickerCallback = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tickerCallback)
    gsap.ticker.lagSmoothing(0)
  }

  watch(
    enabledRef,
    (isEnabled) => {
      if (isEnabled) {
        init()
      } else {
        destroy()
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    destroy()
  })
}

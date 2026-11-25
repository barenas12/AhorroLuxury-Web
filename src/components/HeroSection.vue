<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { scrollToTarget } from '../composables/useSmoothScroll'

interface HeroMetric {
  value: string
  numericTarget: number
  prefix?: string
  suffix?: string
  decimals?: number
  label: string
  hint: string
}

const metrics: HeroMetric[] = [
  { value: '20%', numericTarget: 20, suffix: '%', decimals: 0, label: 'Rentabilidad mínima', hint: 'Garantizada al cierre' },
  { value: '$20.7M', numericTarget: 20.7, prefix: '$', suffix: 'M', decimals: 1, label: 'Premios en juego', hint: '36 oportunidades al año' },
  { value: '100%', numericTarget: 100, suffix: '%', decimals: 0, label: 'Capital asegurado', hint: 'Respaldo en activos reales' }
]

const heroRef = ref<HTMLElement | null>(null)
const displayValues = ref<string[]>(metrics.map((m) => m.value))
let gsapCtx: gsap.Context | null = null

// Efecto spotlight interactivo inspirado en ReactBits (nativo en Vue, cero dependencias React)
const handleCardPointerMove = (e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--my', `${e.clientY - rect.top}px`)
}

onMounted(() => {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsapCtx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.hero-anim', {
        y: 28,
        opacity: 0,
        duration: 0.72,
        stagger: 0.1
      }).from(
        '.metric-card',
        {
          x: 28,
          opacity: 0,
          duration: 0.65,
          stagger: 0.12
        },
        '-=0.45'
      )

      // Animación suave de conteo numérico
      metrics.forEach((m, idx) => {
        const counter = { val: 0 }
        gsap.to(counter, {
          val: m.numericTarget,
          duration: 1.35,
          delay: 0.25 + idx * 0.12,
          ease: 'power2.out',
          onUpdate: () => {
            const formatted = m.decimals ? counter.val.toFixed(m.decimals) : Math.round(counter.val).toString()
            displayValues.value[idx] = `${m.prefix || ''}${formatted}${m.suffix || ''}`
          }
        })
      })
    }, heroRef.value || undefined)
  })
})

onUnmounted(() => {
  gsapCtx?.revert()
})
</script>

<template>
  <section ref="heroRef" class="hero-section">
    <div class="hero-ambient" aria-hidden="true">
      <div class="orb orb-emerald"></div>
      <div class="orb orb-gold"></div>
      <div class="grid-overlay"></div>
    </div>

    <div class="container hero-content">
      <div class="hero-text">
        <span class="hero-tag hero-anim">
          <span class="tag-dot" aria-hidden="true"></span>
          Ahorro Programado Inteligente
        </span>
        <h1 class="hero-anim">
          Tu capital respaldado, tu <span class="text-gradient">rentabilidad garantizada</span>
        </h1>
        <p class="hero-anim">
          Forma parte de <strong>Ahorro Luxury</strong>: aportes semanales o quincenales,
          respaldo en activos reales y 36 oportunidades al año para ganar con nuestra rifa.
        </p>
        <div class="hero-actions hero-anim">
          <a
            href="#como-funciona"
            class="btn-primary"
            @click.prevent="scrollToTarget('#como-funciona', -78)"
          >
            Conocer Sistema
          </a>
          <a
            href="#actividades"
            class="btn-secondary"
            @click.prevent="scrollToTarget('#actividades', -78)"
          >
            Ver Premios
          </a>
        </div>
      </div>

      <div class="hero-badges">
        <div
          v-for="(item, idx) in metrics"
          :key="item.label"
          class="metric-card"
          @pointermove="handleCardPointerMove"
        >
          <div class="metric-info">
            <span class="metric-label">{{ item.label }}</span>
            <small class="metric-hint">{{ item.hint }}</small>
          </div>
          <span class="metric-value">{{ displayValues[idx] }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: linear-gradient(135deg var(--in-oklab), #061522 0%, var(--color-primary) 52%, #0e3247 100%);
  color: var(--color-text-light);
  padding: clamp(4.2rem, 8.5vw, 6.8rem) 0 clamp(3.8rem, 7.5vw, 5.8rem);
}

.hero-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(78px);
  opacity: 0.42;
}

.orb-emerald {
  width: 440px;
  height: 440px;
  top: -140px;
  right: -90px;
  background: radial-gradient(circle, var(--color-secondary-bright), transparent 70%);
}

.orb-gold {
  width: 340px;
  height: 340px;
  bottom: -140px;
  left: -80px;
  background: radial-gradient(circle, rgba(214, 169, 84, 0.55), transparent 70%);
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, black 35%, transparent 80%);
}

.hero-content {
  display: grid;
  grid-template-columns: 1.3fr 0.92fr;
  gap: clamp(2rem, 4.5vw, 3.8rem);
  align-items: center;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  background: rgba(31, 122, 99, 0.22);
  color: #7ee3c7;
  border: 1px solid rgba(42, 163, 132, 0.5);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  margin-bottom: 1.35rem;
  backdrop-filter: blur(8px);
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #48e5b8;
  box-shadow: 0 0 12px #48e5b8;
}

.hero-text h1 {
  font-size: clamp(2.05rem, 4.2vw, 3.25rem);
  line-height: 1.12;
  margin-bottom: 1.3rem;
  font-weight: 800;
  color: #ffffff;
}

.text-gradient {
  background: linear-gradient(90deg var(--in-oklab), #6ee7c8 0%, #f0cf85 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-text p {
  color: rgba(244, 247, 250, 0.9);
  font-size: clamp(1rem, 1.5vw, 1.12rem);
  line-height: 1.68;
  margin-bottom: 2.1rem;
  max-width: 570px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-primary {
  background: linear-gradient(135deg var(--in-oklab), var(--color-secondary) 0%, var(--color-secondary-bright) 100%);
  color: #ffffff;
  padding: 0.9rem 1.8rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 10px 24px -6px rgba(31, 122, 99, 0.65);
  transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.26);
  padding: 0.9rem 1.8rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  backdrop-filter: blur(8px);
  transition: background-color 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px -6px rgba(42, 163, 132, 0.72);
  filter: brightness(1.06);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.45);
  transform: translateY(-2px);
}

.hero-badges {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.metric-card {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.13);
  padding: 1.35rem 1.7rem;
  border-radius: var(--radius-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(12px);
  transition: transform 0.25s ease, border-color 0.25s ease;
}

.metric-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    260px circle at var(--mx, 50%) var(--my, 50%),
    rgba(72, 229, 184, 0.2),
    transparent 65%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.metric-card:hover {
  transform: translateY(-3px);
  border-color: rgba(110, 231, 200, 0.42);
}

.metric-card:hover::before {
  opacity: 1;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.metric-label {
  font-size: 0.98rem;
  font-weight: 600;
  color: #ffffff;
}

.metric-hint {
  font-size: 0.78rem;
  color: rgba(244, 247, 250, 0.72);
}

.metric-value {
  font-family: var(--font-display);
  font-size: clamp(1.65rem, 2.5vw, 2.05rem);
  font-weight: 800;
  color: #6ee7c8;
  white-space: nowrap;
}

@media (max-width: 820px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-text p {
    margin-inline: auto;
  }
  .hero-actions {
    justify-content: center;
  }
  .metric-card {
    text-align: left;
  }
}
</style>

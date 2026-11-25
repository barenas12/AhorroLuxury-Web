<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface Metric {
  value: string
  label: string
}

const metrics: Metric[] = [
  { value: '20%+', label: 'Rentabilidad mínima garantizada' },
  { value: '36', label: 'Oportunidades de ganar en la rifa' },
  { value: '50%', label: 'Disponible en descapitalización' },
  { value: '100%', label: 'Retorno seguro de tu capital' }
]

const sectionRef = ref<HTMLElement | null>(null)
let gsapCtx: gsap.Context | null = null

const handlePointerMove = (e: PointerEvent) => {
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
      gsap.from('.about-reveal', {
        y: 30,
        opacity: 0,
        duration: 0.72,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.value,
          start: 'top 80%',
          once: true
        }
      })

      gsap.from('.stat-card', {
        y: 26,
        scale: 0.96,
        opacity: 0,
        duration: 0.65,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.stats-grid',
          start: 'top 82%',
          once: true
        }
      })
    }, sectionRef.value || undefined)
  })
})

onUnmounted(() => {
  gsapCtx?.revert()
})
</script>

<template>
  <section ref="sectionRef" id="quienes-somos" class="section-padding about-section">
    <div class="container grid-layout">
      <div class="card-highlight">
        <span class="badge about-reveal">Nuestra Trayectoria</span>
        <h2 class="about-reveal">¿Qué es el Ahorro Programado?</h2>
        <p class="description about-reveal">
          Es un sistema de ahorro semanal o quincenal que inició con una cuota de <strong>$50.000</strong>.
        </p>
        <p class="description about-reveal">
          Hasta la fecha, los socios han obtenido ganancias superiores a <strong>$1.000.000</strong> y han acumulado más de <strong>$2.000.000</strong> en ahorros.
        </p>
        <div class="guarantee-box about-reveal">
          Durante el proceso se han gestionado negocios como préstamos respaldados en <strong>oro, prendas, vehículos y efectivo</strong>, fortaleciendo la rentabilidad del fondo.
        </div>
      </div>

      <div class="stats-grid">
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="stat-card"
          @pointermove="handlePointerMove"
        >
          <h3>{{ metric.value }}</h3>
          <p>{{ metric.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-section {
  background-color: #ffffff;
  border-bottom: 1px solid var(--color-border);
}

.grid-layout {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: clamp(2rem, 5vw, 3.8rem);
  align-items: center;
}

.card-highlight h2 {
  font-size: clamp(1.7rem, 3vw, 2.35rem);
  color: var(--color-primary);
  margin-bottom: 1.1rem;
  line-height: 1.18;
}

.badge {
  display: inline-block;
  background-color: rgba(31, 122, 99, 0.12);
  color: var(--color-secondary);
  font-size: 0.84rem;
  font-weight: 700;
  padding: 0.38rem 0.95rem;
  border-radius: 999px;
  margin-bottom: 1rem;
  border: 1px solid rgba(31, 122, 99, 0.22);
}

.description {
  color: #3b4754;
  font-size: 1.04rem;
  line-height: 1.68;
  margin-bottom: 1rem;
}

.guarantee-box {
  margin-top: 1.4rem;
  background: linear-gradient(135deg var(--in-oklab), #f4faf8 0%, #eef5f9 100%);
  border: 1px solid rgba(31, 122, 99, 0.2);
  border-left: 4px solid var(--color-secondary);
  padding: 1.25rem 1.35rem;
  color: var(--color-primary);
  font-size: 0.96rem;
  border-radius: 0 var(--radius) var(--radius) 0;
  line-height: 1.58;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  container-type: inline-size;
}

.stat-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-top: 3px solid var(--color-secondary);
  padding: 1.75rem 1.4rem;
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: var(--shadow);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.stat-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    220px circle at var(--mx, 50%) var(--my, 50%),
    rgba(31, 122, 99, 0.1),
    transparent 65%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(31, 122, 99, 0.35);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card h3 {
  font-size: clamp(1.85rem, 3vw, 2.35rem);
  color: var(--color-secondary);
  margin-bottom: 0.45rem;
  font-weight: 800;
}

.stat-card p {
  font-size: 0.92rem;
  color: var(--color-muted);
  line-height: 1.45;
}

@media (max-width: 820px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

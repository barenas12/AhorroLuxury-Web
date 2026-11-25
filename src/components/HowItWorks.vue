<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface BenefitCard {
  title: string
  icon: string
  isImage?: boolean
  points: string[]
}

const benefits: BenefitCard[] = [
  {
    title: 'Ahorro y Rentabilidad',
    icon: '/img/cash-flow.png',
    isImage: true,
    points: [
      'Aporte semanal o quincenal según la modalidad acordada.',
      'Al finalizar recibes el 100% del capital + rentabilidad garantizada del 20% (con opción de ser mayor).',
      'Inicio del ahorro: 16 de enero.',
      'Cierre del ahorro: 4 de diciembre.',
      'Liquidación final: 11 de diciembre.'
    ]
  },
  {
    title: 'Beneficio de Descapitalización',
    icon: '/img/incentive.png',
    isImage: true,
    points: [
      'Retiro anticipado de hasta el 50% del ahorro acumulado.',
      '3,5% de rentabilidad reconocida si retiras en abril.',
      '7,0% de rentabilidad reconocida si retiras en agosto.',
      'Oportunidad para ponerte al día en créditos o cuotas sin recargo.'
    ]
  },
  {
    title: 'Préstamos y Respaldos',
    icon: '/img/loan.png',
    isImage: true,
    points: [
      'Préstamos a socios hasta el 100% de su monto ahorrado.',
      'Tasa de interés entre socios: 10% (disponibles hasta el 1 de nov).',
      'Préstamos a terceros: 15% efectivo, 10% prendas y 7% respaldado en oro.',
      'Pagos los viernes; mora del 10% sobre la cuota no cancelada.'
    ]
  }
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
      gsap.from('.how-header', {
        y: 24,
        opacity: 0,
        duration: 0.65,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.value,
          start: 'top 82%',
          once: true
        }
      })

      gsap.from('.benefit-card', {
        y: 34,
        opacity: 0,
        duration: 0.72,
        stagger: 0.14,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.cards-wrapper',
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
  <section ref="sectionRef" id="como-funciona" class="section-padding how-section">
    <div class="container">
      <h2 class="section-title how-header">¿Cómo Funciona?</h2>
      <p class="section-subtitle how-header">
        Conoce los lineamientos, plazos y condiciones diseñados para proteger y
        rentabilizar tu dinero.
      </p>

      <div class="cards-wrapper">
        <article
          v-for="(item, idx) in benefits"
          :key="item.title"
          class="benefit-card"
          @pointermove="handlePointerMove"
        >
          <span class="step-pill" aria-hidden="true">0{{ idx + 1 }}</span>

          <div class="icon">
            <img
              v-if="item.isImage"
              :src="item.icon"
              :alt="item.title"
              width="72"
              height="72"
              loading="lazy"
              class="icon-img"
            />
            <span v-else>{{ item.icon }}</span>
          </div>

          <h3>{{ item.title }}</h3>
          <ul>
            <li v-for="(point, pIdx) in item.points" :key="pIdx">
              {{ point }}
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.how-section {
  background: linear-gradient(180deg var(--in-oklab), var(--color-bg-light) 0%, #eef3f8 100%);
}

.cards-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 1.85rem;
}

.benefit-card {
  position: relative;
  overflow: hidden;
  background-color: var(--color-card-bg);
  border-radius: var(--radius-lg);
  padding: 2.3rem 2rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--color-border);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.benefit-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    280px circle at var(--mx, 50%) var(--my, 50%),
    rgba(31, 122, 99, 0.08),
    transparent 65%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.benefit-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-hover);
  border-color: rgba(31, 122, 99, 0.32);
}

.benefit-card:hover::before {
  opacity: 1;
}

.step-pill {
  position: absolute;
  top: 1.25rem;
  right: 1.35rem;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--color-secondary);
  background: rgba(31, 122, 99, 0.1);
  padding: 0.24rem 0.6rem;
  border-radius: 999px;
}

.icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 96px;
  height: 96px;
  margin: 0 auto 1.5rem;
  border-radius: 22px;
  background: linear-gradient(145deg var(--in-oklab), #edf7f4 0%, #f5f9fc 100%);
  border: 1px solid rgba(31, 122, 99, 0.15);
}

.icon-img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 6px 10px rgba(8, 28, 45, 0.12));
}

.benefit-card h3 {
  color: var(--color-primary);
  margin-bottom: 1.2rem;
  font-size: 1.3rem;
  text-align: center;
}

ul {
  list-style: none;
}

li {
  position: relative;
  padding-left: 1.55rem;
  margin-bottom: 0.85rem;
  font-size: 0.95rem;
  color: #3b4754;
  line-height: 1.58;
}

li::before {
  content: "✔";
  position: absolute;
  left: 0;
  color: var(--color-secondary);
  font-weight: 700;
}
</style>

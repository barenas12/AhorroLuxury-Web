<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface PrizeTier {
  position: string
  amount: string
}

interface TicketPlan {
  id: string
  title: string
  monthlyRate: string
  totalYearly: string
  isFeatured?: boolean
}

const grandPrizeTiers: PrizeTier[] = [
  { position: '2 últimas cifras', amount: '$10.000.000' },
  { position: '2 primeras cifras', amount: '$2.000.000' },
  { position: '2 cifras del medio', amount: '$1.000.000' }
]

const monthlyPrizeTiers: PrizeTier[] = [
  { position: '2 últimas cifras', amount: '$400.000' },
  { position: '2 primeras cifras', amount: '$200.000' },
  { position: '2 cifras del medio', amount: '$100.000' }
]

const plans: TicketPlan[] = [
  {
    id: 'plan-1',
    title: '1 Número',
    monthlyRate: '$30.000',
    totalYearly: '$360.000 en 12 meses',
    isFeatured: false
  },
  {
    id: 'plan-2',
    title: '2 Números',
    monthlyRate: '$56.000',
    totalYearly: '$672.000 en 12 meses',
    isFeatured: true
  }
]

const drawDates: string[] = [
  '30 de enero', '27 de febrero', '27 de marzo', '24 de abril',
  '29 de mayo', '26 de junio', '31 de julio', '28 de agosto',
  '25 de septiembre', '30 de octubre', '27 de noviembre', '18 de diciembre (Premio Mayor)'
]

const sectionRef = ref<HTMLElement | null>(null)
let gsapCtx: gsap.Context | null = null

onMounted(() => {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsapCtx = gsap.context(() => {
      gsap.from('.prize-card', {
        y: 34,
        opacity: 0,
        duration: 0.72,
        stagger: 0.16,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.prizes-grid',
          start: 'top 82%',
          once: true
        }
      })

      gsap.from('.plan', {
        y: 28,
        scale: 0.97,
        opacity: 0,
        duration: 0.65,
        stagger: 0.14,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.ticket-plans',
          start: 'top 85%',
          once: true
        }
      })

      gsap.from('.chip', {
        y: 16,
        opacity: 0,
        duration: 0.45,
        stagger: 0.04,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.calendar-chips',
          start: 'top 88%',
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
  <section ref="sectionRef" id="actividades" class="section-padding activities-section">
    <div class="container">
      <h2 class="section-title">Actividades y Rifa Anual</h2>
      <p class="section-subtitle">
        La participación en actividades es voluntaria. La <strong>rifa mensual es la única actividad obligatoria</strong>, con $20.700.000 en premios a lo largo del año.
      </p>

      <div class="prizes-grid">
        <div class="prize-card main-prize">
          <span class="tag">18 de Diciembre</span>
          <h3>Premio Mayor: $13.000.000</h3>
          <p class="desc">Distribución final:</p>
          <div class="prize-breakdown">
            <div v-for="tier in grandPrizeTiers" :key="tier.position">
              <span>{{ tier.position }}</span>
              <strong>{{ tier.amount }}</strong>
            </div>
          </div>
        </div>

        <div class="prize-card monthly-prize">
          <span class="tag">Último viernes de cada mes</span>
          <h3>Premios Mensuales: $700.000 c/u</h3>
          <p class="desc">Distribución mensual anticipada:</p>
          <div class="prize-breakdown">
            <div v-for="tier in monthlyPrizeTiers" :key="tier.position">
              <span>{{ tier.position }}</span>
              <strong>{{ tier.amount }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="ticket-plans">
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="['plan', { featured: plan.isFeatured }]"
        >
          <span v-if="plan.isFeatured" class="popular">Recomendado</span>
          <h4>{{ plan.title }}</h4>
          <p class="price">{{ plan.monthlyRate }} <span>/ mes</span></p>
          <small>{{ plan.totalYearly }}</small>
        </div>
      </div>

      <div class="dates-container">
        <h4>Fechas de Sorteos Oficiales</h4>
        <div class="calendar-chips">
          <span
            v-for="date in drawDates"
            :key="date"
            :class="['chip', { 'chip-grand': date.includes('Premio Mayor') }]"
          >
            {{ date }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.activities-section {
  background-color: #ffffff;
}

.prizes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.85rem;
  margin-bottom: 3rem;
}

.prize-card {
  position: relative;
  overflow: hidden;
  padding: 2.3rem;
  border-radius: var(--radius-lg);
  color: #ffffff;
  box-shadow: var(--shadow);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.prize-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

.main-prize {
  background: linear-gradient(135deg var(--in-oklab), var(--color-primary) 0%, #153854 100%);
}

.monthly-prize {
  background: linear-gradient(135deg var(--in-oklab), var(--color-secondary) 0%, #135545 100%);
}

.tag {
  display: inline-block;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.22);
  padding: 0.38rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 999px;
}

.prize-card h3 {
  margin: 1.2rem 0 0.4rem 0;
  font-size: clamp(1.3rem, 2.2vw, 1.55rem);
}

.desc {
  font-size: 0.92rem;
  color: rgba(255, 255, 255, 0.88);
  margin-bottom: 1.2rem;
}

.prize-breakdown div {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 0.95rem;
}

.prize-breakdown div:last-child {
  border-bottom: none;
}

.ticket-plans {
  display: flex;
  justify-content: center;
  gap: 1.8rem;
  margin-bottom: 3.2rem;
  flex-wrap: wrap;
}

.plan {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  padding: 2.25rem 3rem;
  border-radius: var(--radius-lg);
  text-align: center;
  position: relative;
  min-width: 265px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.plan:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
}

.plan.featured {
  background: #ffffff;
  border: 2px solid var(--color-secondary);
  box-shadow: var(--shadow);
}

.plan h4 {
  color: var(--color-primary);
  font-size: 1.15rem;
}

.plan .price {
  font-family: var(--font-display);
  font-size: 2.15rem;
  font-weight: 800;
  color: var(--color-primary);
  margin: 0.65rem 0;
}

.plan .price span {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-muted);
}

.plan small {
  color: var(--color-muted);
  font-weight: 500;
}

.popular {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg var(--in-oklab), var(--color-secondary) 0%, var(--color-secondary-bright) 100%);
  color: #ffffff;
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.28rem 0.85rem;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(31, 122, 99, 0.35);
}

.dates-container {
  text-align: center;
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.8rem 1.4rem;
}

.dates-container h4 {
  margin-bottom: 1.2rem;
  color: var(--color-primary);
  font-size: 1.1rem;
}

.calendar-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.65rem;
}

.chip {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  padding: 0.48rem 0.95rem;
  border-radius: 999px;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--color-primary);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.chip:hover {
  border-color: var(--color-secondary);
  transform: translateY(-2px);
}

.chip-grand {
  background: linear-gradient(135deg var(--in-oklab), var(--color-primary) 0%, #153854 100%);
  color: #ffffff;
  border-color: transparent;
}

@media (max-width: 768px) {
  .prizes-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
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
</script>

<template>
  <section id="actividades" class="section-padding activities-section">
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
          <span v-for="date in drawDates" :key="date" class="chip">
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
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 3rem;
}

.prize-card {
  padding: 2.2rem;
  border-radius: var(--radius);
  color: #ffffff;
}

.main-prize {
  background: linear-gradient(135deg, var(--color-primary) 0%, #173752 100%);
}

.monthly-prize {
  background: linear-gradient(135deg, var(--color-secondary) 0%, #145a49 100%);
}

.tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 12px;
}

.prize-card h3 {
  margin: 1.2rem 0 0.4rem 0;
  font-size: 1.45rem;
}

.desc {
  font-size: 0.9rem;
  opacity: 0.9;
  margin-bottom: 1.2rem;
}

.prize-breakdown div {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 0.92rem;
}

.ticket-plans {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 3rem;
  flex-wrap: wrap;
}

.plan {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  padding: 2.2rem 3rem;
  border-radius: var(--radius);
  text-align: center;
  position: relative;
  min-width: 260px;
}

.plan.featured {
  border: 2px solid var(--color-secondary);
  box-shadow: var(--shadow);
}

.plan .price {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0.6rem 0;
}

.plan .price span {
  font-size: 0.95rem;
  color: var(--color-muted);
}

.popular {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-secondary);
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 10px;
}

.dates-container {
  text-align: center;
}

.dates-container h4 {
  margin-bottom: 1.2rem;
  color: var(--color-primary);
}

.calendar-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}

.chip {
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-border);
  padding: 0.45rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .prizes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
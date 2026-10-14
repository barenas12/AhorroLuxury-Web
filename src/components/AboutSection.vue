<script setup lang="ts">
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
</script>

<template>
  <section id="quienes-somos" class="section-padding about-section">
    <div class="container grid-layout">
      <div class="card-highlight">
        <span class="badge">Nuestra Trayectoria</span>
        <h2>¿Qué es el Ahorro Programado?</h2>
        <p class="description">
          Es un sistema de ahorro semanal o quincenal que inició con una cuota de <strong>$50.000</strong>.
        </p>
        <p class="description">
          Hasta la fecha, los socios han obtenido ganancias superiores a <strong>$1.000.000</strong> y han acumulado más de <strong>$2.000.000</strong> en ahorros.
        </p>
        <div class="guarantee-box">
          Durante el proceso se han gestionado negocios como préstamos respaldados en <strong>oro, prendas, vehículos y efectivo</strong>, fortaleciendo la rentabilidad del fondo.
        </div>
      </div>

      <div class="stats-grid">
        <div v-for="metric in metrics" :key="metric.label" class="stat-card">
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
}

.grid-layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 3rem;
  align-items: center;
}

.card-highlight h2 {
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.badge {
  display: inline-block;
  background-color: rgba(31, 122, 99, 0.12);
  color: var(--color-secondary);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  margin-bottom: 1rem;
}

.description {
  color: #4A5568;
  font-size: 1.05rem;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.guarantee-box {
  background-color: var(--color-bg-light);
  border-left: 4px solid var(--color-secondary);
  padding: 1.2rem;
  color: var(--color-primary);
  font-size: 0.95rem;
  border-radius: 0 var(--radius) var(--radius) 0;
  line-height: 1.5;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.stat-card {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  padding: 1.8rem;
  border-radius: var(--radius);
  text-align: center;
}

.stat-card h3 {
  font-size: 2.2rem;
  color: var(--color-secondary);
  margin-bottom: 0.5rem;
}

.stat-card p {
  font-size: 0.9rem;
  color: var(--color-muted);
}

@media (max-width: 768px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>
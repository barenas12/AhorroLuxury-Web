<script setup lang="ts">
interface HeroMetric {
  value: string
  label: string
}

const metrics: HeroMetric[] = [
  { value: '20%', label: 'Rentabilidad mínima' },
  { value: '$20.7M', label: 'Premios en juego' },
  { value: '100%', label: 'Capital asegurado' }
]
</script>

<template>
  <section class="hero-section">
    <div class="container hero-content">
      <div class="hero-text">
        <span class="hero-tag">Ahorro Programado Inteligente</span>
        <h1>Tu capital respaldado, tu rentabilidad garantizada</h1>
        <p>
          Forma parte de <strong>Ahorro Luxury</strong>: aportes semanales o quincenales, 
          respaldo en activos reales y 36 oportunidades al año para ganar con nuestra rifa.
        </p>
        <div class="hero-actions">
          <a href="#como-funciona" class="btn-primary">Conocer Sistema</a>
          <a href="#actividades" class="btn-secondary">Ver Premios</a>
        </div>
      </div>

      <div class="hero-badges">
        <div v-for="item in metrics" :key="item.label" class="metric-card">
          <span class="metric-value">{{ item.value }}</span>
          <span class="metric-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  background: linear-gradient(135deg, var(--color-primary) 0%, #0d2a42 100%);
  color: var(--color-text-light);
  padding: 5.5rem 0 4.5rem 0;
}

.hero-content {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr;
  gap: 3rem;
  align-items: center;
}

.hero-tag {
  display: inline-block;
  background: rgba(31, 122, 99, 0.25);
  color: #38b293;
  border: 1px solid var(--color-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35rem 0.9rem;
  border-radius: 20px;
  margin-bottom: 1.2rem;
}

.hero-text h1 {
  font-size: 2.6rem;
  line-height: 1.2;
  margin-bottom: 1.2rem;
  font-weight: 800;
}

.hero-text p {
  color: var(--color-bg-light);
  opacity: 0.9;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 580px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  background-color: var(--color-secondary);
  color: #ffffff;
  padding: 0.85rem 1.6rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: opacity 0.2s;
}

.btn-secondary {
  background-color: transparent;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.85rem 1.6rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.hero-badges {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.2rem 1.8rem;
  border-radius: var(--radius);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--color-secondary);
}

.metric-label {
  font-size: 0.95rem;
  color: var(--color-bg-light);
}

@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-text h1 {
    font-size: 2rem;
  }
  .hero-actions {
    justify-content: center;
  }
}
</style>
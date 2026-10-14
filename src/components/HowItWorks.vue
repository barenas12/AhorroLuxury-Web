<script setup lang="ts">
interface BenefitCard {
  title: string;
  icon: string;
  isImage?: boolean;
  points: string[];
}

const benefits: BenefitCard[] = [
  {
    title: "Ahorro y Rentabilidad",
    icon: "/img/cash-flow.png",
    isImage: true,
    points: [
      "Aporte semanal o quincenal según la modalidad acordada.",
      "Al finalizar recibes el 100% del capital + rentabilidad garantizada del 20% (con opción de ser mayor).",
      "Inicio del ahorro: 16 de enero.",
      "Cierre del ahorro: 4 de diciembre.",
      "Liquidación final: 11 de diciembre.",
    ],
  },
  {
    title: "Beneficio de Descapitalización",
    icon: "/img/incentive.png",
    isImage: true,
    points: [
      "Retiro anticipado de hasta el 50% del ahorro acumulado.",
      "3,5% de rentabilidad reconocida si retiras en abril.",
      "7,0% de rentabilidad reconocida si retiras en agosto.",
      "Oportunidad para ponerte al día en créditos o cuotas sin recargo.",
    ],
  },
  {
    title: "Préstamos y Respaldos",
    icon: "/img/loan.png",
    isImage: true,
    points: [
      "Préstamos a socios hasta el 100% de su monto ahorrado.",
      "Tasa de interés entre socios: 10% (disponibles hasta el 1 de nov).",
      "Préstamos a terceros: 15% efectivo, 10% prendas y 7% respaldado en oro.",
      "Pagos los viernes; mora del 10% sobre la cuota no cancelada.",
    ],
  },
];
</script>

<template>
  <section id="como-funciona" class="section-padding">
    <div class="container">
      <h2 class="section-title">¿Cómo Funciona?</h2>
      <p class="section-subtitle">
        Conoce los lineamientos, plazos y condiciones diseñados para proteger y
        rentabilizar tu dinero.
      </p>

      <div class="cards-wrapper">
        <div v-for="item in benefits" :key="item.title" class="benefit-card">
          <!-- Renderizado condicional del icono -->
          <div class="icon">
            <img
              v-if="item.isImage"
              :src="item.icon"
              :alt="item.title"
              class="icon-img"
            />
            <span v-else>{{ item.icon }}</span>
          </div>

          <h3>{{ item.title }}</h3>
          <ul>
            <li v-for="(point, idx) in item.points" :key="idx">
              {{ point }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cards-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

.benefit-card {
  background-color: var(--color-card-bg);
  border-radius: var(--radius);
  padding: 2.2rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--color-border);
  transition: transform 0.2s ease;
}

.benefit-card:hover {
  transform: translateY(-4px);
}

/* Contenedor centrado */
.icon {
  display: flex;
  justify-content: center; /* Centra horizontalmente */
  align-items: center;     /* Centra verticalmente */
  width: 100%;             /* Ocupa todo el ancho de la tarjeta */
  margin-bottom: 1.5rem;
}

/* Imagen con mayor tamaño y proporción conservada */
.icon-img {
  width: 72px;             /* Tamaño aumentado (puedes probar entre 56px y 72px) */
  height: 72  px;
  object-fit: contain;     /* Evita distorsión */
  display: block;
}

.benefit-card h3 {
  color: var(--color-primary);
  margin-bottom: 1.2rem;
  font-size: 1.3rem;
}

ul {
  list-style: none;
}

li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.85rem;
  font-size: 0.95rem;
  color: #4a5568;
  line-height: 1.55;
}

li::before {
  content: "✔";
  position: absolute;
  left: 0;
  color: var(--color-secondary);
  font-weight: 700;
}
</style>

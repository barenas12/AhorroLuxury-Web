<script setup lang="ts">
import { scrollToTarget } from '../composables/useSmoothScroll'

const currentYear: number = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container content">
      <div class="footer-brand">
        <img src="/img/logo-luxury.png" alt="Ahorro Luxury" width="36" height="36" loading="lazy" class="footer-logo" />
        <strong>Ahorro Luxury</strong>
      </div>
      <nav aria-label="Pie de página" class="footer-links">
        <a href="#quienes-somos" @click.prevent="scrollToTarget('#quienes-somos', -78)">Quiénes Somos</a>
        <a href="#como-funciona" @click.prevent="scrollToTarget('#como-funciona', -78)">Cómo Funciona</a>
        <a href="#actividades" @click.prevent="scrollToTarget('#actividades', -78)">Actividades y Rifa</a>
      </nav>
      <p>© {{ currentYear }} Ahorro Luxury. Todos los derechos reservados.</p>
      <small>Transparencia, respaldo y rentabilidad para cada uno de nuestros socios.</small>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: linear-gradient(180deg var(--in-oklab), var(--color-primary) 0%, #05131f 100%);
  color: rgba(244, 247, 250, 0.85);
  padding: 2.8rem 0;
  text-align: center;
  border-top: 2px solid rgba(31, 122, 99, 0.45);
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 1.1rem;
}

.footer-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 50%;
}

.footer-links {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-links a {
  color: rgba(244, 247, 250, 0.82);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: #6ee7c8;
}

.content p {
  font-size: 0.92rem;
}

.content small {
  display: block;
  color: rgba(244, 247, 250, 0.68);
  font-size: 0.82rem;
}
</style>

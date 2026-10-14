<script setup lang="ts">
const currentYear: number = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container content">
      <p>© {{ currentYear }} Ahorro Luxury. Todos los derechos reservados.</p>
      <small>Transparencia, respaldo y rentabilidad para cada uno de nuestros socios.</small>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--color-primary);
  color: var(--color-muted);
  padding: 2.5rem 0;
  text-align: center;
}
.content small {
  display: block;
  margin-top: 0.4rem;
  color: rgba(255, 255, 255, 0.4);
}
</style>
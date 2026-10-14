<script setup lang="ts">
import { ref } from "vue";

interface NavLink {
  name: string;
  href: string;
}

interface Props {
  brandName?: string;
  logoUrl?: string;
  isLoginView?: boolean;
  links?: NavLink[];
}

const props = withDefaults(defineProps<Props>(), {
  brandName: "Ahorro Luxury",
  logoUrl: "",
  isLoginView: false,
  links: () => [
    { name: "Quiénes Somos", href: "#quienes-somos" },
    { name: "Cómo Funciona", href: "#como-funciona" },
    { name: "Actividades y Rifa", href: "#actividades" },
  ],
});

const emit = defineEmits<{
  (e: "go-home"): void;
  (e: "open-login"): void;
}>();

const isMobileOpen = ref<boolean>(false);

const toggleMobileMenu = (): void => {
  isMobileOpen.value = !isMobileOpen.value;
};

const closeMobileMenu = (): void => {
  isMobileOpen.value = false;
};

const handleLogoClick = (): void => {
  closeMobileMenu();
  emit("go-home");
};

const handleLoginClick = (): void => {
  closeMobileMenu();
  emit("open-login");
};
</script>

<template>
  <header class="navbar">
    <div class="container nav-content">
      <!-- Logo que regresa al home -->
      <a
        href="#"
        class="brand"
        @click.prevent="handleLogoClick"
        title="Ir al inicio"
      >
        <img
          v-if="props.logoUrl"
          :src="props.logoUrl"
          alt="Logo"
          class="brand-logo-img"
        />
        <img
          v-else
          src="/img/logo-luxury.png"
          alt="Ahorro Luxury"
          class="navbar-logo-img"
        />
        <span class="brand-text">{{ props.brandName }}</span>
      </a>

      <!-- Botón móvil (solo si no es login) -->
      <button
        v-if="!props.isLoginView"
        class="mobile-toggle"
        @click="toggleMobileMenu"
        aria-label="Abrir menú"
      >
        ☰
      </button>

      <!-- Si está en vista de login, no se renderiza la barra derecha -->
      <nav
        v-if="!props.isLoginView"
        :class="['nav-menu', { 'is-open': isMobileOpen }]"
      >
        <a
          v-for="link in props.links"
          :key="link.name"
          :href="link.href"
          class="nav-link"
          @click="closeMobileMenu"
        >
          {{ link.name }}
        </a>

        <!-- Botón Iniciar Sesión en la Landing -->
        <button type="button" class="btn-highlight" @click="handleLoginClick">
          Iniciar Sesión
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  background-color: var(--color-primary);
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--color-text-light);
  font-weight: 700;
  font-size: 1.25rem;
  cursor: pointer;
}

.logo-circle {
  background: var(--color-secondary);
  color: #ffffff;
  width: 38px;
  height: 38px;
  display: grid;
  place-content: center;
  border-radius: 50%;
  font-size: 0.9rem;
}

.brand-logo-img {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 1.8rem;
}

.nav-link {
  color: var(--color-bg-light);
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--color-secondary);
}

.btn-highlight {
  background-color: var(--color-secondary);
  color: #ffffff;
  padding: 0.65rem 1.4rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(31, 122, 99, 0.35);
  transition: all 0.2s ease;
}

.btn-highlight:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.mobile-toggle {
  display: none;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 1.8rem;
  cursor: pointer;
}

.navbar-logo-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 50%; /* Opcional: solo si quieres que se mantenga redonda */
  display: block;
}

@media (max-width: 768px) {
  .mobile-toggle {
    display: block;
  }
  .nav-menu {
    position: absolute;
    top: 70px;
    left: 0;
    width: 100%;
    background-color: var(--color-primary);
    flex-direction: column;
    padding: 1.5rem 0;
    gap: 1.2rem;
    display: none;
  }
  .nav-menu.is-open {
    display: flex;
  }
}
</style>

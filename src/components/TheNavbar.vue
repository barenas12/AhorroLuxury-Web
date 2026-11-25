<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { scrollToTarget } from "../composables/useSmoothScroll";

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
const isScrolled = ref<boolean>(false);
const activeHref = ref<string>("");

const handleScroll = (): void => {
  isScrolled.value = window.scrollY > 18;
  const sections = props.links
    .map((l) => ({ href: l.href, el: document.querySelector(l.href) }))
    .filter((s): s is { href: string; el: Element } => Boolean(s.el));

  let current = "";
  for (const s of sections) {
    const rect = s.el.getBoundingClientRect();
    if (rect.top <= 140) current = s.href;
  }
  activeHref.value = current;
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});

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

const handleNavLinkClick = (href: string): void => {
  closeMobileMenu();
  if (href.startsWith("#")) {
    scrollToTarget(href, -78);
  }
};

const handleLoginClick = (): void => {
  closeMobileMenu();
  emit("open-login");
};
</script>

<template>
  <header :class="['navbar', { 'is-scrolled': isScrolled }]">
    <div class="container nav-content">
      <a
        href="#main-content"
        class="brand"
        @click.prevent="handleLogoClick"
        aria-label="Ahorro Luxury — Ir al inicio"
      >
        <img
          v-if="props.logoUrl"
          :src="props.logoUrl"
          alt="Logo Ahorro Luxury"
          width="40"
          height="40"
          class="brand-logo-img"
        />
        <img
          v-else
          src="/img/logo-luxury.png"
          alt="Ahorro Luxury"
          width="40"
          height="40"
          class="navbar-logo-img"
        />
        <span class="brand-text">{{ props.brandName }}</span>
      </a>

      <button
        v-if="!props.isLoginView"
        type="button"
        class="mobile-toggle"
        @click="toggleMobileMenu"
        :aria-expanded="isMobileOpen"
        aria-controls="primary-nav-menu"
        :aria-label="isMobileOpen ? 'Cerrar menú' : 'Abrir menú'"
      >
        <span aria-hidden="true">{{ isMobileOpen ? "✕" : "☰" }}</span>
      </button>

      <nav
        v-if="!props.isLoginView"
        id="primary-nav-menu"
        aria-label="Principal"
        :class="['nav-menu', { 'is-open': isMobileOpen }]"
      >
        <a
          v-for="link in props.links"
          :key="link.name"
          :href="link.href"
          :class="['nav-link', { 'is-active': activeHref === link.href }]"
          :aria-current="activeHref === link.href ? 'location' : undefined"
          @click.prevent="handleNavLinkClick(link.href)"
        >
          {{ link.name }}
        </a>

        <button type="button" class="btn-highlight" @click="handleLoginClick">
          Iniciar Sesión
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  background-color: rgba(8, 28, 45, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  position: sticky;
  top: 0;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: background-color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.navbar.is-scrolled {
  background-color: rgba(8, 28, 45, 0.97);
  border-bottom-color: rgba(42, 163, 132, 0.28);
  box-shadow: 0 10px 30px -10px rgba(8, 28, 45, 0.45);
}

.nav-content {
  width: 100%;
  max-width: 100%;
  padding: 0 clamp(1.25rem, 3.8vw, 4rem);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  height: 76px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
  color: var(--color-text-light);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(1.2rem, 1.8vw, 1.45rem);
  letter-spacing: -0.02em;
  cursor: pointer;
  flex-shrink: 0;
}

.brand-logo-img,
.navbar-logo-img {
  width: 46px;
  height: 46px;
  object-fit: contain;
  border-radius: 50%;
  display: block;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.28));
}

.nav-menu {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(1.2rem, 2.5vw, 2.4rem);
  margin-left: auto;
}

.nav-link {
  position: relative;
  color: rgba(245, 247, 250, 0.88);
  text-decoration: none;
  font-size: 0.94rem;
  font-weight: 500;
  padding: 0.35rem 0;
  transition: color 0.2s ease;
}

.nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-secondary-bright);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.25s ease;
}

.nav-link:hover,
.nav-link.is-active {
  color: #ffffff;
}

.nav-link:hover::after,
.nav-link.is-active::after {
  transform: scaleX(1);
}

.btn-highlight {
  background: linear-gradient(135deg var(--in-oklab), var(--color-secondary) 0%, var(--color-secondary-bright) 100%);
  color: #ffffff;
  padding: 0.65rem 1.45rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  font-weight: 700;
  font-size: 0.93rem;
  cursor: pointer;
  box-shadow: 0 6px 18px -4px rgba(31, 122, 99, 0.55);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.btn-highlight:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -4px rgba(42, 163, 132, 0.6);
  filter: brightness(1.05);
}

.mobile-toggle {
  display: none;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  color: #ffffff;
  width: 44px;
  height: 44px;
  font-size: 1.4rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .mobile-toggle {
    display: inline-flex;
  }
  .nav-menu {
    position: absolute;
    top: 76px;
    left: 0;
    width: 100%;
    background-color: rgba(8, 28, 45, 0.98);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    flex-direction: column;
    padding: 1.5rem 1.2rem 1.8rem;
    gap: 1.15rem;
    display: none;
  }
  .nav-menu.is-open {
    display: flex;
  }
}
</style>

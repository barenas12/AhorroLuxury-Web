<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import TheNavbar from "./components/TheNavbar.vue";
import HeroSection from "./components/HeroSection.vue";
import AboutSection from "./components/AboutSection.vue";
import HowItWorks from "./components/HowItWorks.vue";
import ActivitiesSection from "./components/ActivitiesSection.vue";
import LoginModal from "./components/LoginModal.vue";
import TheSidebar from "./components/Sidebar.vue";
import Dashboard, { type UserSession } from "./components/Dashboard.vue";
import TheFooter from "./components/TheFooter.vue";
import ChangePasswordModal from "./components/ChangePasswordModal.vue";
import SeoHead from "./components/SeoHead.vue";
import { getUserProfile, type ModuleAvailability } from "./utils/viewerScope";
import {
  apiFetch,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
  setUnauthorizedHandler,
} from "./utils/apiClient";
import { useSmoothScroll } from "./composables/useSmoothScroll";

type ViewMode = "home" | "login" | "dashboard";

const currentView = ref<ViewMode>("home");
const currentSection = ref<string>("resumen");
const currentUser = ref<UserSession | null>(null);
const showResetPassModal = ref<boolean>(false);
const moduleAvailability = ref<ModuleAvailability | null>(null);

// Activar Lenis smooth scroll solo en la landing pública (no interfiere con el scroll del dashboard)
const isLandingView = computed(() => currentView.value === "home");
useSmoothScroll(isLandingView);

const loadModuleAvailability = async (user: UserSession | null): Promise<void> => {
  if (!user || getUserProfile(user) === 1 || user.resetPassword === 1) {
    moduleAvailability.value = null;
    return;
  }
  try {
    const res = await apiFetch("/api/dashboard/personal");
    const json = await res.json();
    if (json.success && json.data?.availability) {
      moduleAvailability.value = json.data.availability;
    }
  } catch (err) {
    console.error("Error cargando disponibilidad de módulos:", err);
  }
};

// Notificación emergente (Toast)
const toastMessage = ref<string>("");
const toastType = ref<"info" | "success">("info");
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

const showToast = (
  message: string,
  type: "info" | "success" = "info",
): void => {
  toastMessage.value = message;
  toastType.value = type;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage.value = "";
  }, 4000);
};

// ----------------------------------------------------
// CONTROL DE INACTIVIDAD (30 MINUTOS) Y PERSISTENCIA F5
// ----------------------------------------------------
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutos en milisegundos
const STORAGE_TIME_KEY = "al_last_activity";

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

const clearSessionState = (): void => {
  currentUser.value = null;
  moduleAvailability.value = null;
  showResetPassModal.value = false;
  clearAuthToken();
  sessionStorage.removeItem(STORAGE_TIME_KEY);
  if (inactivityTimer) clearTimeout(inactivityTimer);
};

const updateLastActivity = (): void => {
  if (currentUser.value) {
    const now = Date.now();
    sessionStorage.setItem(STORAGE_TIME_KEY, now.toString());
    resetInactivityTimer();
  }
};

const resetInactivityTimer = (): void => {
  if (inactivityTimer) clearTimeout(inactivityTimer);

  inactivityTimer = setTimeout(() => {
    handleInactivityTimeout();
  }, INACTIVITY_LIMIT_MS);
};

// Cierre automático por superar los 30 min
const handleInactivityTimeout = (): void => {
  if (currentUser.value) {
    clearSessionState();
    currentView.value = "home";
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Cerrada la sesión por inactividad", "info");
  }
};

// Cierre automático cuando el backend responde 401 (sesión expirada o revocada)
const handleSessionExpired = (): void => {
  if (currentUser.value || getAuthToken()) {
    clearSessionState();
    currentView.value = "login";
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Tu sesión expiró. Inicia sesión nuevamente.", "info");
  }
};

// Cierre voluntario desde el botón del Sidebar
const handleManualLogout = (): void => {
  clearSessionState();
  currentView.value = "home";
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast("Cierre de sesión exitoso", "success");
};

// Eventos a escuchar para detectar actividad
const activityEvents = [
  "mousemove",
  "keydown",
  "mousedown",
  "touchstart",
  "scroll",
];

const attachActivityListeners = (): void => {
  activityEvents.forEach((evt) => {
    window.addEventListener(evt, updateLastActivity, { passive: true });
  });
};

const detachActivityListeners = (): void => {
  activityEvents.forEach((evt) => {
    window.removeEventListener(evt, updateLastActivity);
  });
};

// Al montar la app (cuando el usuario entra o da F5): verificar token contra el servidor
onMounted(async () => {
  attachActivityListeners();
  setUnauthorizedHandler(handleSessionExpired);

  const token = getAuthToken();
  const lastActivity = sessionStorage.getItem(STORAGE_TIME_KEY);

  if (!token || !lastActivity) {
    clearSessionState();
    return;
  }

  const timePassed = Date.now() - parseInt(lastActivity, 10);
  if (Number.isNaN(timePassed) || timePassed >= INACTIVITY_LIMIT_MS) {
    clearSessionState();
    return;
  }

  try {
    const res = await apiFetch("/api/login/me", { skipAuthRedirect: true });
    const json = await res.json();
    if (!res.ok || !json.success || !json.data) {
      clearSessionState();
      return;
    }

    currentUser.value = json.data;
    currentView.value = "dashboard";
    showResetPassModal.value = currentUser.value?.resetPassword === 1;
    updateLastActivity();
    await loadModuleAvailability(currentUser.value);
  } catch {
    clearSessionState();
  }
});

onUnmounted(() => {
  detachActivityListeners();
  setUnauthorizedHandler(null);
  if (inactivityTimer) clearTimeout(inactivityTimer);
  if (toastTimeout) clearTimeout(toastTimeout);
});

// ----------------------------------------------------
// NAVEGACIÓN Y LOGIN
// ----------------------------------------------------
const clearUrlHash = (): void => {
  if (window.location.hash) {
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }
};

const openLogin = (): void => {
  clearUrlHash();
  currentView.value = "login";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const showHome = (): void => {
  clearUrlHash();
  currentView.value = "home";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const handleLoginSuccess = (payload: { user: UserSession; token: string }): void => {
  setAuthToken(payload.token);
  currentUser.value = payload.user;
  currentSection.value = "resumen";
  currentView.value = "dashboard";
  showResetPassModal.value = payload.user.resetPassword === 1;

  sessionStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());

  resetInactivityTimer();
  loadModuleAvailability(payload.user);
};

const onPasswordChanged = (): void => {
  showResetPassModal.value = false;

  if (currentUser.value) {
    currentUser.value.resetPassword = 0;
    loadModuleAvailability(currentUser.value);
  }

  currentView.value = "dashboard";
  currentSection.value = "resumen";
};
</script>

<template>
  <div class="app-layout">
    <a href="#main-content" class="skip-link visually-hidden">Saltar al contenido principal</a>
    <SeoHead :view="currentView" :section="currentSection" />
    <ChangePasswordModal
      v-if="showResetPassModal && currentUser"
      :username="currentUser.user || currentUser.username || ''"
      :user-data="currentUser"
      @password-changed="onPasswordChanged"
    />

    <!-- Toast de Notificaciones -->
    <transition name="fade">
      <div
        v-if="toastMessage"
        role="status"
        aria-live="polite"
        :class="['toast-notification', toastType]"
      >
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Header Navbar -->
    <TheNavbar
      v-if="currentView !== 'dashboard'"
      brandName="Ahorro Luxury"
      :isLoginView="currentView !== 'home'"
      @go-home="showHome"
      @open-login="openLogin"
    />

    <main id="main-content" class="main-container">
      <!-- 1. DASHBOARD -->
      <div
        v-if="currentView === 'dashboard' && currentUser"
        class="dashboard-layout"
      >
        <TheSidebar
          :user="currentUser"
          :activeSection="currentSection"
          :availability="moduleAvailability"
          @select-section="(sec) => (currentSection = sec)"
          @logout="handleManualLogout"
        />
        <Dashboard 
          :user="currentUser" 
          :currentSection="currentSection" 
        />
      </div>

      <!-- 2. LOGIN -->
      <LoginModal
        v-else-if="currentView === 'login'"
        @close="showHome"
        @login-success="handleLoginSuccess"
      />

      <!-- 3. LANDING PAGE -->
      <div v-else>
        <HeroSection />
        <AboutSection />
        <HowItWorks />
        <ActivitiesSection />
      </div>
    </main>

    <TheFooter v-if="currentView !== 'dashboard'" />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dashboard-layout {
  display: flex;
  flex: 1;
  min-height: 100vh;
  min-width: 0;
}

@media (max-width: 900px) {
  .dashboard-layout {
    flex-direction: column;
  }
}

/* Toast flotante para avisos de sesión */
.toast-notification {
  position: fixed;
  top: 85px;
  right: 25px;
  max-width: calc(100vw - 2rem);
  padding: 0.9rem 1.4rem;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 0.92rem;
  z-index: 9999;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
}

@media (max-width: 640px) {
  .toast-notification {
    top: 72px;
    left: 1rem;
    right: 1rem;
  }
}

.toast-notification.info {
  background-color: #081c2d;
  color: #f5f7fa;
  border-left: 5px solid #e53e3e;
}

.toast-notification.success {
  background-color: #1f7a63;
  color: #ffffff;
  border-left: 5px solid #081c2d;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
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

type ViewMode = "home" | "login" | "dashboard";

const currentView = ref<ViewMode>("home");
const currentSection = ref<string>("resumen");
const currentUser = ref<UserSession | null>(null);
const showResetPassModal = ref<boolean>(false);

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
const STORAGE_USER_KEY = "al_user_session";
const STORAGE_TIME_KEY = "al_last_activity";

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

const updateLastActivity = (): void => {
  if (currentUser.value) {
    const now = Date.now();
    localStorage.setItem(STORAGE_TIME_KEY, now.toString());
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
    currentUser.value = null;
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TIME_KEY);
    if (inactivityTimer) clearTimeout(inactivityTimer);

    currentView.value = "home";
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Cerrada la sesión por inactividad", "info");
  }
};

// Cierre voluntario desde el botón del Sidebar
const handleManualLogout = (): void => {
  currentUser.value = null;
  localStorage.removeItem(STORAGE_USER_KEY);
  localStorage.removeItem(STORAGE_TIME_KEY);
  if (inactivityTimer) clearTimeout(inactivityTimer);

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

// Al montar la app (cuando el usuario entra o da F5)
onMounted(() => {
  attachActivityListeners();

  const savedUser = localStorage.getItem(STORAGE_USER_KEY);
  const lastActivity = localStorage.getItem(STORAGE_TIME_KEY);

  if (savedUser && lastActivity) {
    const timePassed = Date.now() - parseInt(lastActivity, 10);

    if (timePassed < INACTIVITY_LIMIT_MS) {
      currentUser.value = JSON.parse(savedUser);
      currentView.value = "dashboard";
      showResetPassModal.value = currentUser.value?.resetPassword === 1;
      updateLastActivity();
    } else {
      handleInactivityTimeout();
    }
  }
});

onUnmounted(() => {
  detachActivityListeners();
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

const handleLoginSuccess = (user: UserSession): void => {
  currentUser.value = user;
  currentSection.value = "resumen";
  currentView.value = "dashboard";
  showResetPassModal.value = user.resetPassword === 1;

  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());

  resetInactivityTimer();
};

const onPasswordChanged = (): void => {
  showResetPassModal.value = false;

  if (currentUser.value) {
    currentUser.value.resetPassword = 0;
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(currentUser.value));
  }

  currentView.value = "dashboard";
  currentSection.value = "resumen";
};
</script>

<template>
  <div class="app-layout">
    <ChangePasswordModal
      v-if="showResetPassModal && currentUser"
      :username="currentUser.user || currentUser.username || ''"
      :user-data="currentUser"
      @password-changed="onPasswordChanged"
    />

    <!-- Toast de Notificaciones -->
    <transition name="fade">
      <div v-if="toastMessage" :class="['toast-notification', toastType]">
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

    <main class="main-container">
      <!-- 1. DASHBOARD -->
      <div
        v-if="currentView === 'dashboard' && currentUser"
        class="dashboard-layout"
      >
        <TheSidebar
          :user="currentUser"
          :activeSection="currentSection"
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
}

/* Toast flotante para avisos de sesión */
.toast-notification {
  position: fixed;
  top: 85px;
  right: 25px;
  padding: 0.9rem 1.4rem;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 0.92rem;
  z-index: 9999;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
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
<script setup lang="ts">
import { computed } from "vue";
import UsersManagement from "./UsersManagement.vue";
import PaymentsManagement from "./PaymentsManagement.vue";
import RaffleGrid from "./RaffleGrid.vue";
import SavingsManagement from "./SavingsManagement.vue";

export interface UserSession {
  id?: number;
  username?: string;
  full_name?: string;
  profile?: number | string;
  user?: string;
  name?: string;
  lastName?: string;
  resetPassword?: number;
}

const props = defineProps<{
  user: UserSession;
  currentSection?: string;
}>();

const isProfileThree = computed(() => Number(props.user.profile) === 3);
</script>

<template>
  <div class="dashboard-content">
    <!-- Vista Restringida (Socio Perfil 3) -->
    <div v-if="isProfileThree" class="restricted-view">
      <div class="empty-dashboard-card">
        <div class="lock-icon">🔒</div>
        <h2>Dashboard no disponible</h2>
        <p>
          Hola, <strong>{{ user.full_name || user.username }}</strong>. Tu usuario está registrado en el sistema, pero no cuentas con permisos de 
          <strong>Administrador (1)</strong> ni de <strong>Coordinador (2)</strong> para ver este contenido.
        </p>
        <small>Comunícate con la administración de Ahorro Luxury para solicitar autorización.</small>
      </div>
    </div>

    <!-- Panel Operativo (Perfiles 1 y 2) -->
    <div v-else class="inner-container">
      <!-- 1. GESTIÓN DE USUARIOS Y SOCIOS -->
      <UsersManagement v-if="currentSection === 'usuarios'" />

      <!-- 2. AHORRO PROGRAMADO (Nuevo módulo conectado) -->
    <SavingsManagement v-else-if="currentSection === 'ahorro'" />

      <!-- 3. CONTROL DE PAGOS Y MULTAS -->
      <PaymentsManagement
        v-else-if="currentSection === 'pagos'"
        :currentUser="{ ...user, id: Number(user.id || 0) }"
      />

      <!-- 4. CUADRÍCULA RIFA MENSUAL 1 -->
      <RaffleGrid 
        v-else-if="currentSection === 'rifa1'"
        raffleType="1"
        title="Rifa Mensual 1"
      />

      <!-- 5. CUADRÍCULA RIFA MENSUAL 2 -->
      <RaffleGrid 
        v-else-if="currentSection === 'rifa2'"
        raffleType="2"
        title="Rifa Mensual 2"
      />

      <!-- 6. OTROS MÓDULOS O VISTA POR DEFECTO -->
      <div v-else class="authorized-view">
        <header class="section-header">
          <div>
            <h2>Panel de Control - {{ currentSection?.toUpperCase() }}</h2>
            <p class="subtitle">Bienvenido al sistema administrativo, {{ user.full_name || user.name }}.</p>
          </div>
        </header>

        <div class="card module-panel">
          <h3>Módulo: {{ currentSection }}</h3>
          <div class="placeholder-box">
            [Panel operativo para {{ currentSection }}]
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-content {
  flex: 1;
  padding: 2rem 2.5rem;
  background-color: var(--color-bg-light);
  overflow-y: auto;
  width: 100%;
}

.inner-container {
  width: 100%;
}

.restricted-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  width: 100%;
}

.empty-dashboard-card {
  background: #ffffff;
  border: 1px solid var(--color-border);
  padding: 3.5rem 2.5rem;
  border-radius: var(--radius);
  text-align: center;
  max-width: 520px;
  box-shadow: var(--shadow);
}

.lock-icon {
  font-size: 3rem;
  margin-bottom: 1.2rem;
}

.empty-dashboard-card h2 {
  color: var(--color-primary);
  margin-bottom: 0.8rem;
  font-size: 1.7rem;
}

.empty-dashboard-card p {
  color: #4a5568;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.empty-dashboard-card small {
  color: var(--color-muted);
  display: block;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  color: var(--color-primary);
  font-size: 1.6rem;
  margin: 0;
}

.subtitle {
  color: var(--color-muted);
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

.module-panel h3 {
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.placeholder-box {
  margin-top: 1.5rem;
  padding: 3rem;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  text-align: center;
  color: var(--color-muted);
}
</style>
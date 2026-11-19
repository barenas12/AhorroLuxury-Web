<script setup lang="ts">
import { computed } from "vue";
import UsersManagement from "./UsersManagement.vue";
import PaymentsManagement from "./PaymentsManagement.vue";
import RaffleGrid from "./RaffleGrid.vue";
import SavingsManagement from "./SavingsManagement.vue";
import LoansManagement from "./LoansManagement.vue";
import FinancialDashboard from "./FinancialDashboard.vue";
import PersonalDashboard from "./PersonalDashboard.vue";
import EgressesManagement from "./EgressesManagement.vue";

export interface UserSession {
  id?: number;
  partnerId?: number | null;
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

const isAdmin = computed(() => Number(props.user.profile) === 1);
const isCoordinatorOrAdmin = computed(() => Number(props.user.profile) === 1 || Number(props.user.profile) === 2);

const currentUserProps = computed(() => ({
  ...props.user,
  id: Number(props.user.id || 0),
}));
</script>

<template>
  <div class="dashboard-content">
    <div class="inner-container">
      <!-- 1. USUARIOS (Admin: edición, Coordinador: solo lectura sus socios) -->
      <UsersManagement
        v-if="currentSection === 'usuarios' && isCoordinatorOrAdmin"
        :currentUser="currentUserProps"
      />

      <!-- 2. AHORRO PROGRAMADO -->
      <SavingsManagement
        v-else-if="currentSection === 'ahorro'"
        :currentUser="currentUserProps"
      />

      <!-- 3. PRÉSTAMOS -->
      <LoansManagement
        v-else-if="currentSection === 'prestamos'"
        :currentUser="currentUserProps"
      />

      <!-- EGRESOS (Exclusivo Administrador) -->
      <EgressesManagement
        v-else-if="currentSection === 'egresos' && isAdmin"
        :currentUser="currentUserProps"
      />

      <!-- 4. PAGOS GENERALES -->
      <PaymentsManagement
        v-else-if="currentSection === 'pagos'"
        :currentUser="currentUserProps"
      />

      <!-- 5. RIFAS -->
      <RaffleGrid
        v-else-if="currentSection === 'rifa1'"
        raffleType="1"
        title="Rifa Mensual 1"
        :currentUser="currentUserProps"
      />
      <RaffleGrid
        v-else-if="currentSection === 'rifa2'"
        raffleType="2"
        title="Rifa Mensual 2"
        :currentUser="currentUserProps"
      />

      <!-- DEFAULT / DASHBOARD -->
      <FinancialDashboard
        v-else-if="isAdmin"
        :currentUser="currentUserProps"
      />
      <PersonalDashboard
        v-else
        :currentUser="currentUserProps"
      />
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
.inner-container { width: 100%; }
</style>

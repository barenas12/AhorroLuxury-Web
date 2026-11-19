<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { buildScopeQuery, getUserProfile, type ViewerUser } from '../utils/viewerScope'

interface TicketStatusItem {
  number: string
  raffle: 'Rifa 1' | 'Rifa 2'
  raffleType: 1 | 2
  isPaid: boolean
  status: 'Al día' | 'En mora'
}

interface MySavingsData {
  id: number
  fullName: string
  frequency: number
  savingsValue: number
  quotaValue: number
  savingsStartDate: string | null
  totalSavedCurrentPeriod: number
  overdueAmount: number
  savingsStatus: 'Al día' | 'En mora'
  overdueLabel: string
  ticketsRifa1: TicketStatusItem[]
  ticketsRifa2: TicketStatusItem[]
}

interface PersonalDashboardData {
  profile: 1 | 2 | 3
  mySavings: MySavingsData | null
  myLoans: {
    totalCount: number
    activeCount: number
    totalBorrowed: number
    remainingCapital: number
    remainingInterest: number
    paidInterest: number
  }
  myReceiptsCount: number
  teamSummary: {
    assignedPartnersCount: number
    totalSaved: number
    totalOverdue: number
    partnersInMoraCount: number
    activeLoansCount: number
    totalRemainingCapital: number
    totalRemainingInterest: number
    externalTicketsCount: number
  } | null
}

const props = defineProps<{
  currentUser: ViewerUser
}>()

const isLoading = ref(false)
const data = ref<PersonalDashboardData | null>(null)

const isCoordinator = computed(() => getUserProfile(props.currentUser) === 2)
const userName = computed(
  () => props.currentUser.full_name || props.currentUser.name || props.currentUser.user || props.currentUser.username || 'Socio'
)

const myTickets = computed(() => {
  if (!data.value?.mySavings) return []
  return [...(data.value.mySavings.ticketsRifa1 || []), ...(data.value.mySavings.ticketsRifa2 || [])]
})

const loadPersonalSummary = async () => {
  isLoading.value = true
  try {
    const qs = buildScopeQuery(props.currentUser)
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/personal?${qs}`)
    const json = await res.json()
    if (json.success) {
      data.value = json.data
    }
  } catch (err) {
    console.error('Error cargando resumen personal:', err)
  } finally {
    isLoading.value = false
  }
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val) || 0)

const getFrequencyLabel = (freq: number) => {
  if (freq === 8) return 'Semanal (cada 8 días)'
  if (freq === 15) return 'Quincenal (cada 15 días)'
  return 'Mensual (cada 30 días)'
}

onMounted(() => {
  loadPersonalSummary()
})
</script>

<template>
  <div class="personal-dashboard">
    <header class="dash-header">
      <div>
        <h2>Mi Resumen — {{ isCoordinator ? 'Coordinador' : 'Socio' }}</h2>
        <p>Bienvenido, <strong>{{ userName }}</strong>. Aquí puedes consultar el estado informativo de tu ahorro{{ isCoordinator ? ' y el de tus socios a cargo' : '' }}.</p>
      </div>
      <button type="button" class="btn-refresh" @click="loadPersonalSummary" :disabled="isLoading">
        {{ isLoading ? '↻ Actualizando...' : '↻ Actualizar' }}
      </button>
    </header>

    <div v-if="isLoading && !data" class="loading-box">Cargando tu información...</div>

    <template v-else-if="data">
      <!-- 1. MI AHORRO -->
      <section v-if="data.mySavings" class="section-block">
        <h3 class="section-title">💰 Mi Ahorro Programado</h3>
        <div class="kpi-grid">
          <div class="kpi-card primary">
            <span class="kpi-label">Total Ahorrado (Neto)</span>
            <strong class="kpi-value">{{ formatCurrency(data.mySavings.totalSavedCurrentPeriod) }}</strong>
            <small class="kpi-sub">
              Cuota: {{ formatCurrency(data.mySavings.quotaValue) }} · {{ getFrequencyLabel(data.mySavings.frequency) }}
            </small>
          </div>

          <div :class="['kpi-card', data.mySavings.savingsStatus === 'Al día' ? 'green' : 'danger']">
            <span class="kpi-label">Estado de mi Ahorro</span>
            <strong class="kpi-value">{{ data.mySavings.savingsStatus }}</strong>
            <small class="kpi-sub" v-if="data.mySavings.overdueAmount > 0">
              Valor en mora: {{ formatCurrency(data.mySavings.overdueAmount) }} ({{ data.mySavings.overdueLabel }})
            </small>
            <small class="kpi-sub" v-else>
              Sin deuda pendiente · Inicio: {{ data.mySavings.savingsStartDate || 'No registrada' }}
            </small>
          </div>

          <div class="kpi-card neutral">
            <span class="kpi-label">Mis Comprobantes de Pago</span>
            <strong class="kpi-value">{{ data.myReceiptsCount }}</strong>
            <small class="kpi-sub">Disponibles para consulta y descarga PDF</small>
          </div>
        </div>
      </section>

      <!-- 2. MIS PRÉSTAMOS (solo si tiene préstamos) -->
      <section v-if="data.myLoans.totalCount > 0" class="section-block">
        <h3 class="section-title">🏦 Mis Préstamos</h3>
        <div class="kpi-grid">
          <div class="kpi-card primary">
            <span class="kpi-label">Capital Pendiente</span>
            <strong class="kpi-value">{{ formatCurrency(data.myLoans.remainingCapital) }}</strong>
            <small class="kpi-sub">{{ data.myLoans.activeCount }} préstamo(s) activo(s) de {{ data.myLoans.totalCount }} total</small>
          </div>
          <div class="kpi-card orange">
            <span class="kpi-label">Interés Pendiente</span>
            <strong class="kpi-value">{{ formatCurrency(data.myLoans.remainingInterest) }}</strong>
            <small class="kpi-sub">Intereses abonados: {{ formatCurrency(data.myLoans.paidInterest) }}</small>
          </div>
          <div class="kpi-card neutral">
            <span class="kpi-label">Capital Total Prestado</span>
            <strong class="kpi-value">{{ formatCurrency(data.myLoans.totalBorrowed) }}</strong>
            <small class="kpi-sub">Histórico personal</small>
          </div>
        </div>
      </section>

      <!-- 3. MIS BOLETAS (solo si tiene boletas) -->
      <section v-if="myTickets.length > 0" class="section-block">
        <h3 class="section-title">🎟️ Mis Boletas</h3>
        <div class="tickets-card">
          <div class="tickets-list">
            <span
              v-for="t in myTickets"
              :key="t.raffleType + '-' + t.number"
              :class="['ticket-pill', t.isPaid ? 'paid' : 'unpaid']"
            >
              {{ t.raffle }} · Boleta #{{ t.number }} — <strong>{{ t.status }}</strong>
            </span>
          </div>
        </div>
      </section>

      <!-- 4. RESUMEN DE SOCIOS A CARGO (solo Coordinador) -->
      <section v-if="isCoordinator && data.teamSummary && data.teamSummary.assignedPartnersCount > 0" class="section-block">
        <h3 class="section-title">👥 Resumen de mis Socios a Cargo (Solo Informativo)</h3>
        <div class="kpi-grid">
          <div class="kpi-card green">
            <span class="kpi-label">Socios a mi Cargo</span>
            <strong class="kpi-value">{{ data.teamSummary.assignedPartnersCount }}</strong>
            <small class="kpi-sub">Ahorro acumulado: {{ formatCurrency(data.teamSummary.totalSaved) }}</small>
          </div>
          <div class="kpi-card orange">
            <span class="kpi-label">Mora del Grupo</span>
            <strong class="kpi-value">{{ formatCurrency(data.teamSummary.totalOverdue) }}</strong>
            <small class="kpi-sub">{{ data.teamSummary.partnersInMoraCount }} socio(s) en mora</small>
          </div>
          <div class="kpi-card primary" v-if="data.teamSummary.activeLoansCount > 0 || data.teamSummary.totalRemainingCapital > 0">
            <span class="kpi-label">Préstamos del Grupo</span>
            <strong class="kpi-value">{{ formatCurrency(data.teamSummary.totalRemainingCapital) }}</strong>
            <small class="kpi-sub">{{ data.teamSummary.activeLoansCount }} activo(s) · Int. pend.: {{ formatCurrency(data.teamSummary.totalRemainingInterest) }}</small>
          </div>
          <div class="kpi-card neutral" v-if="data.teamSummary.externalTicketsCount > 0">
            <span class="kpi-label">Boletas Externas a Cargo</span>
            <strong class="kpi-value">{{ data.teamSummary.externalTicketsCount }}</strong>
            <small class="kpi-sub">Compradores por afuera asignados a ti</small>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.personal-dashboard { display: flex; flex-direction: column; gap: 1.8rem; width: 100%; }
.dash-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; border-bottom: 2px solid var(--color-border); padding-bottom: 1rem; }
.dash-header h2 { color: var(--color-primary); font-size: 1.7rem; margin: 0; }
.dash-header p { color: var(--color-muted); margin-top: 0.25rem; }
.btn-refresh { background: #fff; border: 1px solid var(--color-border); padding: 0.6rem 1.1rem; border-radius: 8px; cursor: pointer; font-weight: 600; color: var(--color-primary); }

.loading-box { text-align: center; padding: 3rem; color: var(--color-muted); background: #fff; border-radius: 8px; border: 1px solid var(--color-border); }
.section-block { display: flex; flex-direction: column; gap: 0.9rem; }
.section-title { margin: 0; color: var(--color-primary); font-size: 1.15rem; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.2rem; }
.kpi-card { background: #fff; padding: 1.35rem 1.5rem; border-radius: 10px; border: 1px solid var(--color-border); box-shadow: 0 2px 6px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 0.3rem; }
.kpi-card.primary { border-left: 5px solid var(--color-primary); }
.kpi-card.green { border-left: 5px solid var(--color-secondary); }
.kpi-card.orange { border-left: 5px solid #dd6b20; }
.kpi-card.danger { border-left: 5px solid #e53e3e; }
.kpi-card.neutral { border-left: 5px solid #4a5568; }
.kpi-label { font-size: 0.85rem; color: var(--color-muted); font-weight: 600; }
.kpi-value { font-size: 1.65rem; color: var(--color-primary); }
.kpi-sub { font-size: 0.8rem; color: #718096; }

.tickets-card { background: #fff; padding: 1.2rem 1.4rem; border-radius: 10px; border: 1px solid var(--color-border); }
.tickets-list { display: flex; flex-wrap: wrap; gap: 0.65rem; }
.ticket-pill { padding: 0.4rem 0.85rem; border-radius: 8px; font-size: 0.86rem; font-weight: 600; }
.ticket-pill.paid { background: #c6f6d5; color: #22543d; border: 1px solid #9ae6b4; }
.ticket-pill.unpaid { background: #fed7d7; color: #9b2c2c; border: 1px solid #feb2b2; }
</style>

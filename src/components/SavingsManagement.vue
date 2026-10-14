<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

export interface TicketStatusItem {
  number: string
  raffle: string
  isPaid: boolean
  status: 'Al día' | 'En mora'
}

export interface PartnerSavings {
  id: number
  documentId: string
  fullName: string
  cellphone: number
  coordinatorName: string
  frequency: number
  savingsValue: number
  totalSavedCurrentPeriod: number
  overdueAmount: number
  savingsStatus: 'Al día' | 'En mora'
  nextDueDate: string
  daysRemaining: number
  ticketsStatus: TicketStatusItem[]
  generalTicketStatus: 'Al día' | 'En mora'
}

const partners = ref<PartnerSavings[]>([])
const isLoading = ref<boolean>(false)
const searchQuery = ref<string>('')
const statusFilter = ref<'todos' | 'al_dia' | 'en_mora'>('todos')

const loadSavingsData = async () => {
  isLoading.value = true
  try {
    const res = await fetch('http://localhost:3000/api/savings/dashboard')
    const data = await res.json()
    if (data.success) {
      partners.value = data.data
    }
  } catch (err) {
    console.error('Error al cargar ahorro programado:', err)
  } finally {
    isLoading.value = false
  }
}

const filteredPartners = computed(() => {
  let list = partners.value
  const q = searchQuery.value.toLowerCase().trim()

  if (statusFilter.value === 'al_dia') {
    list = list.filter(p => p.savingsStatus === 'Al día' && p.generalTicketStatus === 'Al día')
  } else if (statusFilter.value === 'en_mora') {
    list = list.filter(p => p.savingsStatus === 'En mora' || p.generalTicketStatus === 'En mora')
  }

  if (q) {
    list = list.filter(p =>
      p.fullName.toLowerCase().includes(q) ||
      p.documentId.toLowerCase().includes(q) ||
      p.coordinatorName.toLowerCase().includes(q)
    )
  }

  return list
})

// Métricas
const totalSocios = computed(() => partners.value.length)
const totalAlDia = computed(() => partners.value.filter(p => p.savingsStatus === 'Al día' && p.generalTicketStatus === 'Al día').length)
const totalEnMora = computed(() => partners.value.filter(p => p.savingsStatus === 'En mora' || p.generalTicketStatus === 'En mora').length)
const totalCarteraEnMora = computed(() => partners.value.reduce((acc, p) => acc + Number(p.overdueAmount || 0), 0))

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount)
}

onMounted(() => {
  loadSavingsData()
})
</script>

<template>
  <div class="savings-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h2>Ahorro Programado & Vencimientos</h2>
        <p>Monitoreo de ahorro neto, deuda en mora y estado individual de boletas.</p>
      </div>
      <button type="button" class="btn-refresh" @click="loadSavingsData">
        🔄 Actualizar
      </button>
    </div>

    <!-- Cards de Resumen -->
    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">Total Ahorradores</span>
        <strong class="stat-value">{{ totalSocios }}</strong>
        <small class="stat-desc">Socios activos</small>
      </div>
      <div class="stat-card green">
        <span class="stat-label">Total Al Día</span>
        <strong class="stat-value">{{ totalAlDia }}</strong>
        <small class="stat-desc">Sin deuda de cuotas</small>
      </div>
      <div class="stat-card orange">
        <span class="stat-label">Total Cartera en Mora</span>
        <strong class="stat-value">{{ formatCurrency(totalCarteraEnMora) }}</strong>
        <small class="stat-desc">{{ totalEnMora }} socios con saldo pendiente</small>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-bar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Buscar por socio, cédula o coordinador..." 
        />
        <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">✕</button>
      </div>

      <div class="status-tabs">
        <button 
          :class="['tab-btn', { active: statusFilter === 'todos' }]" 
          @click="statusFilter = 'todos'"
        >
          Todos
        </button>
        <button 
          :class="['tab-btn', { active: statusFilter === 'al_dia' }]" 
          @click="statusFilter = 'al_dia'"
        >
          Al Día
        </button>
        <button 
          :class="['tab-btn', { active: statusFilter === 'en_mora' }]" 
          @click="statusFilter = 'en_mora'"
        >
          En Mora
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Socio</th>
            <th>Frecuencia</th>
            <th>Abonado (Neto)</th>
            <th>Valor en Mora</th>
            <th>Estado Ahorro</th>
            <th>Fecha Límite</th>
            <th>Días Restantes</th>
            <th>Estado Boletas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="8" class="center-text">Calculando vencimientos y saldos...</td>
          </tr>
          <tr v-else-if="filteredPartners.length === 0">
            <td colspan="8" class="center-text empty-state">No hay registros con los filtros seleccionados.</td>
          </tr>
          <tr v-for="p in filteredPartners" :key="p.id">
            <td>
              <strong>{{ p.fullName }}</strong>
              <small class="sub-text">C.C. {{ p.documentId }} | Coord: {{ p.coordinatorName }}</small>
            </td>
            <td>
              <span class="freq-tag">Cada {{ p.frequency }} días</span>
            </td>
            <td class="money-text">{{ formatCurrency(p.totalSavedCurrentPeriod) }}</td>
            <td>
              <span v-if="p.overdueAmount > 0" class="overdue-amount-pill">
                {{ formatCurrency(p.overdueAmount) }}
              </span>
              <span v-else class="zero-debt">$0</span>
            </td>
            <td>
              <span :class="['status-badge', p.savingsStatus === 'Al día' ? 'on-time' : 'overdue']">
                {{ p.savingsStatus }}
              </span>
            </td>
            <td>
              <strong>{{ p.nextDueDate }}</strong>
            </td>
            <td>
              <span :class="['days-pill', p.daysRemaining < 0 ? 'expired' : (p.daysRemaining <= 3 ? 'urgent' : 'ok')]">
                {{ p.daysRemaining < 0 ? `Vencido (${Math.abs(p.daysRemaining)}d)` : `${p.daysRemaining} días` }}
              </span>
            </td>
            <td>
              <div v-if="p.ticketsStatus.length === 0" class="no-tickets">Sin boletas</div>
              <div v-else class="tickets-status-list">
                <span 
                  v-for="t in p.ticketsStatus" 
                  :key="t.number + t.raffle"
                  :class="['ticket-tag', t.isPaid ? 'paid' : 'unpaid']"
                  :title="`${t.raffle} - Boleta #${t.number}: ${t.status}`"
                >
                  #{{ t.number }} ({{ t.status }})
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.savings-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-header h2 {
  color: var(--color-primary);
  font-size: 1.7rem;
  margin: 0;
}

.view-header p {
  color: var(--color-muted);
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

.btn-refresh {
  background-color: #ffffff;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  padding: 0.6rem 1.1rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
}

.stat-card {
  background: #fff;
  padding: 1.3rem 1.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: var(--shadow);
}

.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }
.stat-card.orange { border-left: 5px solid #dd6b20; }

.stat-label {
  font-size: 0.85rem;
  color: var(--color-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 1.55rem;
  color: var(--color-primary);
}

.stat-desc {
  font-size: 0.75rem;
  color: #a0aec0;
}

.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 480px;
}

.search-box input {
  width: 100%;
  padding: 0.75rem 2.4rem 0.75rem 2.6rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: #fff;
}

.search-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
}

.btn-clear {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
}

.status-tabs {
  display: flex;
  background: #e2e8f0;
  border-radius: 8px;
  padding: 0.25rem;
}

.tab-btn {
  border: none;
  background: none;
  padding: 0.55rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  color: #4a5568;
}

.tab-btn.active {
  background: #fff;
  color: var(--color-primary);
  box-shadow: 0 2px 5px rgba(0,0,0,0.08);
}

.table-container {
  width: 100%;
  background: #fff;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.92rem;
}

th, td {
  padding: 0.95rem 1.1rem;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

th {
  background-color: var(--color-bg-light);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.sub-text {
  display: block;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.freq-tag {
  background-color: #edf2f7;
  color: #4a5568;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.money-text {
  font-weight: 600;
  color: #2d3748;
}

.overdue-amount-pill {
  color: #9b2c2c;
  background-color: #fed7d7;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.85rem;
}

.zero-debt {
  color: #22543d;
  font-weight: 700;
}

.status-badge {
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-badge.on-time {
  background: #c6f6d5;
  color: #22543d;
}

.status-badge.overdue {
  background: #fed7d7;
  color: #9b2c2c;
}

.days-pill {
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8rem;
}

.days-pill.expired {
  background: #fed7d7;
  color: #c53030;
}

.days-pill.urgent {
  background: #feebc8;
  color: #c05621;
}

.days-pill.ok {
  background: #e2e8f0;
  color: #4a5568;
}

.tickets-status-list {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.ticket-tag {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.ticket-tag.paid {
  background-color: #c6f6d5;
  color: #22543d;
  border: 1px solid #9ae6b4;
}

.ticket-tag.unpaid {
  background-color: #fed7d7;
  color: #9b2c2c;
  border: 1px solid #feb2b2;
}

.no-tickets {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.center-text {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--color-muted);
}
</style>
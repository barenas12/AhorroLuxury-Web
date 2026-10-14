<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

export interface RaffleItem {
  number: string
  isAssigned: boolean
  partner: {
    id: number
    documentId: string
    fullName: string
    cellphone: number
  } | null
}

const props = defineProps<{
  raffleType: '1' | '2'
  title: string
}>()

const board = ref<RaffleItem[]>([])
const isLoading = ref<boolean>(false)
const filterQuery = ref<string>('')
const selectedNumber = ref<RaffleItem | null>(null)

const loadRaffleData = async () => {
  isLoading.value = true
  selectedNumber.value = null
  try {
    const res = await fetch(`http://localhost:3000/api/users/raffle/${props.raffleType}`)
    const data = await res.json()
    if (data.success) {
      board.value = data.data
    }
  } catch (err) {
    console.error(`Error al cargar datos de ${props.title}:`, err)
  } finally {
    isLoading.value = false
  }
}

// Métricas de la rifa
const totalAssigned = computed(() => board.value.filter(b => b.isAssigned).length)
const totalAvailable = computed(() => 100 - totalAssigned.value)
const occupancyPercentage = computed(() => ((totalAssigned.value / 100) * 100).toFixed(0))

// Filtrado de la cuadrícula
const filteredBoard = computed(() => {
  const q = filterQuery.value.toLowerCase().trim()
  if (!q) return board.value

  return board.value.filter(item => {
    const matchNumber = item.number.includes(q)
    const matchPartner = item.partner && (
      item.partner.fullName.toLowerCase().includes(q) ||
      item.partner.documentId.toLowerCase().includes(q)
    )
    return matchNumber || matchPartner
  })
})

const selectItem = (item: RaffleItem) => {
  selectedNumber.value = item
}

watch(() => props.raffleType, () => {
  loadRaffleData()
})

onMounted(() => {
  loadRaffleData()
})
</script>

<template>
  <div class="raffle-view">
    <!-- Header -->
    <div class="view-header">
      <div>
        <h2>{{ title }}</h2>
        <p>Control visual de números asignados del 00 al 99.</p>
      </div>
      <button type="button" class="btn-refresh" @click="loadRaffleData">
        🔄 Actualizar
      </button>
    </div>

    <!-- Estadísticas -->
    <div class="stats-row">
      <div class="stat-card primary">
        <span class="stat-label">Números Asignados</span>
        <strong class="stat-value">{{ totalAssigned }} / 100</strong>
        <small class="stat-desc">{{ occupancyPercentage }}% de ocupación</small>
      </div>
      <div class="stat-card green">
        <span class="stat-label">Números Disponibles</span>
        <strong class="stat-value">{{ totalAvailable }}</strong>
        <small class="stat-desc">Listos para asignar</small>
      </div>
      <div class="stat-card legend-card">
        <span class="stat-label">Convención</span>
        <div class="legend-items">
          <div class="legend-item"><span class="chip available"></span> Disponible</div>
          <div class="legend-item"><span class="chip assigned"></span> Asignado</div>
        </div>
      </div>
    </div>

    <!-- Barra de Búsqueda -->
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input 
        type="text" 
        v-model="filterQuery" 
        placeholder="Buscar por número (ej. 07) o nombre del socio..." 
      />
      <button v-if="filterQuery" class="btn-clear" @click="filterQuery = ''">✕</button>
    </div>

    <!-- Cuadrícula 00 al 99 -->
    <div v-if="isLoading" class="loading-state">
      Cargando cuadrícula de la {{ title }}...
    </div>

    <div v-else class="grid-container">
      <div 
        v-for="item in filteredBoard" 
        :key="item.number"
        :class="[
          'grid-cell', 
          item.isAssigned ? 'assigned' : 'available',
          { selected: selectedNumber?.number === item.number }
        ]"
        @click="selectItem(item)"
      >
        <span class="cell-number">{{ item.number }}</span>
        <span class="cell-status">
          {{ item.isAssigned ? item.partner?.fullName.split(' ')[0] : 'Libre' }}
        </span>
      </div>
    </div>

    <!-- Detalle Flotante del Número Seleccionado -->
    <div v-if="selectedNumber" class="detail-card">
      <div class="detail-header">
        <h3>Detalle de la Boleta #{{ selectedNumber.number }}</h3>
        <button type="button" class="btn-close-detail" @click="selectedNumber = null">✕</button>
      </div>
      <div v-if="selectedNumber.isAssigned && selectedNumber.partner" class="detail-content">
        <p><strong>Socio:</strong> {{ selectedNumber.partner.fullName }}</p>
        <p><strong>Documento:</strong> {{ selectedNumber.partner.documentId }}</p>
        <p><strong>Celular:</strong> {{ selectedNumber.partner.cellphone }}</p>
        <span class="badge-status-assigned">Ocupado</span>
      </div>
      <div v-else class="detail-content">
        <p class="free-text">Este número se encuentra actualmente disponible para ser asignado a un socio.</p>
        <span class="badge-status-free">Disponible</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.raffle-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
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
  transition: all 0.2s ease;
}

.btn-refresh:hover {
  background-color: var(--color-bg-light);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
}

.stat-card {
  background: #fff;
  padding: 1.2rem 1.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  box-shadow: var(--shadow);
}

.stat-card.primary { border-left: 5px solid var(--color-primary); }
.stat-card.green { border-left: 5px solid var(--color-secondary); }

.stat-label {
  font-size: 0.85rem;
  color: var(--color-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 1.5rem;
  color: var(--color-primary);
}

.stat-desc {
  font-size: 0.75rem;
  color: #a0aec0;
}

.legend-items {
  display: flex;
  gap: 1.2rem;
  margin-top: 0.5rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
}

.chip {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.chip.available {
  background-color: #edf2f7;
  border: 1px solid #cbd5e0;
}

.chip.assigned {
  background-color: #feebc8;
  border: 1px solid #fbd38d;
}

.search-bar {
  position: relative;
  max-width: 480px;
}

.search-bar input {
  width: 100%;
  padding: 0.75rem 2.4rem 0.75rem 2.6rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: #fff;
  outline: none;
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

/* Cuadrícula interactiva */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 0.7rem;
  background-color: #ffffff;
  padding: 1.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
}

.grid-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
  padding: 0.3rem;
  text-align: center;
}

.grid-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.grid-cell.available {
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  color: #718096;
}

.grid-cell.assigned {
  background-color: #feebc8;
  border: 1px solid #fbd38d;
  color: #744210;
}

.grid-cell.selected {
  outline: 3px solid var(--color-secondary);
}

.cell-number {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.1;
}

.cell-status {
  font-size: 0.68rem;
  font-weight: 600;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 100%;
  margin-top: 0.2rem;
}

/* Detalle */
.detail-card {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1.2rem 1.5rem;
  box-shadow: var(--shadow);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.6rem;
  margin-bottom: 0.8rem;
}

.detail-header h3 {
  color: var(--color-primary);
  margin: 0;
  font-size: 1.1rem;
}

.btn-close-detail {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
}

.detail-content p {
  margin: 0.3rem 0;
  font-size: 0.92rem;
  color: #2d3748;
}

.badge-status-assigned {
  display: inline-block;
  background-color: #feebc8;
  color: #744210;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  margin-top: 0.4rem;
}

.badge-status-free {
  display: inline-block;
  background-color: #c6f6d5;
  color: #22543d;
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  margin-top: 0.4rem;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-muted);
}
</style>
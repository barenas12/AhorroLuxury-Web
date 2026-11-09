<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

export interface RecaudoItem {
  paymentMethod: string
  concept: string
  totalAmount: string
  totalFines: string
}

export interface SalidaItem {
  paymentMethod: string
  totalEgress: string
}

export interface DashboardData {
  recaudo: RecaudoItem[]
  salidas: SalidaItem[]
  capitalPrestadoTotal: number
}

const props = defineProps<{
  currentUser: { id: number, name?: string, full_name?: string, username?: string }
}>()

const isLoading = ref(false)
const dashboardData = ref<DashboardData>({ recaudo: [], salidas: [], capitalPrestadoTotal: 0 })

const loadSummary = async () => {
  isLoading.value = true
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/summary`)
    const json = await res.json()
    if (json.success) {
      dashboardData.value = json.data
    }
  } catch (error) {
    console.error('Error cargando el dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

// -----------------------------------------------------
// MATEMÁTICA FINANCIERA (Ingresos - Egresos)
// -----------------------------------------------------

// 1. Total en Efectivo (Caja Física) = Ingresos Efectivo - Egresos Efectivo
const totalEfectivo = computed(() => {
  const ingresos = dashboardData.value.recaudo
    .filter(r => r.paymentMethod === 'efectivo')
    .reduce((acc, curr) => acc + Number(curr.totalAmount) + Number(curr.totalFines), 0)
  
  const egresos = dashboardData.value.salidas
    ?.filter(s => s.paymentMethod === 'efectivo')
    .reduce((acc, curr) => acc + Number(curr.totalEgress), 0) || 0

  return ingresos - egresos
})

// 2. Total en Transferencia (Bancos) = Ingresos Transferencia - Egresos Transferencia
const totalTransferencia = computed(() => {
  const ingresos = dashboardData.value.recaudo
    .filter(r => r.paymentMethod === 'transferencia')
    .reduce((acc, curr) => acc + Number(curr.totalAmount) + Number(curr.totalFines), 0)
  
  const egresos = dashboardData.value.salidas
    ?.filter(s => s.paymentMethod === 'transferencia')
    .reduce((acc, curr) => acc + Number(curr.totalEgress), 0) || 0

  return ingresos - egresos
})

// 3. Dinero Total Actual en las cuentas (Efectivo + Banco)
const totalDineroLiquido = computed(() => totalEfectivo.value + totalTransferencia.value)

// 4. Capital en la Calle (Prestado - Recuperado)
const capitalRecuperado = computed(() => {
  return dashboardData.value.recaudo
    .filter(r => r.concept === 'Abono Capital Préstamo')
    .reduce((acc, curr) => acc + Number(curr.totalAmount), 0)
})
const capitalEnCalle = computed(() => Number(dashboardData.value.capitalPrestadoTotal) - capitalRecuperado.value)

// 5. Patrimonio Total del Fondo (Dinero en caja + Dinero que deben)
const patrimonioTotal = computed(() => totalDineroLiquido.value + capitalEnCalle.value)

// 6. Ganancias Netas (Intereses + Todas las Multas)
const totalIntereses = computed(() => {
  return dashboardData.value.recaudo
    .filter(r => r.concept === 'Abono Interés Préstamo')
    .reduce((acc, curr) => acc + Number(curr.totalAmount), 0)
})
const totalMultas = computed(() => {
  return dashboardData.value.recaudo.reduce((acc, curr) => acc + Number(curr.totalFines), 0)
})
const gananciaNeta = computed(() => totalIntereses.value + totalMultas.value)

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

const userName = computed(() => props.currentUser.full_name || props.currentUser.name || props.currentUser.username || 'Administrador')

onMounted(() => {
  loadSummary()
})
</script>

<template>
  <div class="financial-dashboard">
    <header class="dash-header">
      <div>
        <h2>Dashboard Financiero</h2>
        <p>Resumen global de caja, ganancias y patrimonio para <strong>{{ userName }}</strong>.</p>
      </div>
      <button class="btn-refresh" @click="loadSummary" :disabled="isLoading">
        {{ isLoading ? '↻ Actualizando...' : '↻ Refrescar Datos' }}
      </button>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card patrimony-card">
        <span class="kpi-title">Patrimonio Total del Fondo</span>
        <strong class="kpi-value">{{ formatCurrency(patrimonioTotal) }}</strong>
        <div class="kpi-breakdown">
          <span>Liquidez: {{ formatCurrency(totalDineroLiquido) }}</span>
          <span>Préstamos: {{ formatCurrency(capitalEnCalle) }}</span>
        </div>
      </div>
      <div class="kpi-card profit-card">
        <span class="kpi-title">Ganancia Neta Acumulada</span>
        <strong class="kpi-value">{{ formatCurrency(gananciaNeta) }}</strong>
        <div class="kpi-breakdown">
          <span>Intereses: {{ formatCurrency(totalIntereses) }}</span>
          <span>Multas: {{ formatCurrency(totalMultas) }}</span>
        </div>
      </div>
    </div>

    <div class="boxes-container">
      <div class="box-card cash-box">
        <div class="box-icon">💵</div>
        <div class="box-info">
          <h3>Efectivo</h3>
          <span class="box-amount" :class="{'text-red': totalEfectivo < 0}">{{ formatCurrency(totalEfectivo) }}</span>
          <p>Dinero real disponible en mano.</p>
        </div>
      </div>
      <div class="box-card bank-box">
        <div class="box-icon">🏦</div>
        <div class="box-info">
          <h3>Bancos (Transferencias)</h3>
          <span class="box-amount" :class="{'text-red': totalTransferencia < 0}">{{ formatCurrency(totalTransferencia) }}</span>
          <p>Dinero disponible en cuentas / Nequi.</p>
        </div>
      </div>
    </div>

    <div class="details-section">
      <h3>Desglose de Ingresos por Concepto</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Medio de Pago</th>
              <th class="text-right">Capital Recaudado</th>
              <th class="text-right">Multas Cobradas</th>
              <th class="text-right">Total Ingresado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="dashboardData.recaudo.length === 0">
              <td colspan="5" class="center-text">No hay movimientos registrados.</td>
            </tr>
            <tr v-for="(item, idx) in dashboardData.recaudo" :key="idx">
              <td><strong>{{ item.concept }}</strong></td>
              <td>
                <span :class="['method-badge', item.paymentMethod]">
                  {{ item.paymentMethod.toUpperCase() }}
                </span>
              </td>
              <td class="text-right">{{ formatCurrency(Number(item.totalAmount)) }}</td>
              <td class="text-right">{{ formatCurrency(Number(item.totalFines)) }}</td>
              <td class="text-right font-bold">{{ formatCurrency(Number(item.totalAmount) + Number(item.totalFines)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mantén exactamente los mismos estilos que tenías en el FinancialDashboard anterior */
.financial-dashboard { display: flex; flex-direction: column; gap: 2rem; width: 100%; animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.dash-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--color-border); padding-bottom: 1rem; }
.dash-header h2 { color: var(--color-primary); font-size: 1.8rem; margin: 0; }
.dash-header p { color: var(--color-muted); margin-top: 0.3rem; }
.btn-refresh { background: var(--color-bg-light); border: 1px solid var(--color-border); padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; color: var(--color-primary); transition: 0.2s; }
.btn-refresh:hover { background: #e2e8f0; }
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.kpi-card { padding: 1.8rem; border-radius: 12px; color: #fff; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
.patrimony-card { background: linear-gradient(135deg, var(--color-primary) 0%, #1a365d 100%); }
.profit-card { background: linear-gradient(135deg, var(--color-secondary) 0%, #22543d 100%); }
.kpi-title { font-size: 1rem; font-weight: 600; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
.kpi-value { font-size: 2.8rem; font-weight: 800; margin: 0.5rem 0 1rem 0; text-shadow: 1px 1px 3px rgba(0,0,0,0.2); }
.kpi-breakdown { display: flex; gap: 1.5rem; font-size: 0.95rem; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 0.8rem; }
.boxes-container { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.box-card { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.cash-box { border-left: 6px solid #d69e2e; }
.bank-box { border-left: 6px solid #3182ce; }
.box-icon { font-size: 3rem; background: var(--color-bg-light); width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.box-info h3 { margin: 0; color: var(--color-muted); font-size: 1rem; text-transform: uppercase; }
.box-amount { display: block; font-size: 2rem; font-weight: 800; color: var(--color-primary); margin: 0.2rem 0; }
.text-red { color: #e53e3e !important; }
.box-info p { margin: 0; font-size: 0.85rem; color: #a0aec0; }
.details-section h3 { color: var(--color-primary); margin-bottom: 1rem; }
.table-wrapper { background: #fff; border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 1rem; border-bottom: 1px solid var(--color-border); }
th { background: var(--color-bg-light); color: var(--color-primary); font-size: 0.85rem; text-transform: uppercase; text-align: left; }
.text-right { text-align: right; }
.center-text { text-align: center; color: var(--color-muted); padding: 2rem; }
.font-bold { font-weight: 700; color: var(--color-primary); }
.method-badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
.method-badge.efectivo { background: #fefcbf; color: #744210; border: 1px solid #f6e05e; }
.method-badge.transferencia { background: #ebf8ff; color: #2b6cb0; border: 1px solid #90cdf4; }
@media (max-width: 900px) { .kpi-grid, .boxes-container { grid-template-columns: 1fr; } }
</style>
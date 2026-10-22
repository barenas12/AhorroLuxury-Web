<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

export interface EgressRecord {
  id: number
  concept: string
  amount: string
  paymentMethod: 'efectivo' | 'transferencia'
  recipient: string
  paymentDate: string
  observations: string
  registeredByName: string
}

export interface Partner {
  id: number
  fullName: string
  partnerStatus: number
}

const props = defineProps<{
  currentUser: { id: number, name?: string, username?: string }
}>()

const egresses = ref<EgressRecord[]>([])
const activePartners = ref<Partner[]>([]) // Aquí guardaremos los socios activos
const isLoading = ref(false)
const showModal = ref(false)
const isSaving = ref(false)
const modalError = ref('')

const today = new Date().toISOString().substring(0, 10)

const form = ref({
  concept: 'Préstamo Entregado',
  amount: 0,
  paymentMethod: 'efectivo',
  recipient: '',
  paymentDate: today,
  observations: ''
})

// Vigilamos si cambia el concepto para limpiar el beneficiario 
// y evitar que quede un socio seleccionado si cambian a "Otros"
watch(() => form.value.concept, () => {
  form.value.recipient = ''
})

const loadData = async () => {
  isLoading.value = true
  try {
    // Cargamos tanto los egresos como los usuarios al mismo tiempo
    const [resEgresses, resUsers] = await Promise.all([
      fetch('http://localhost:3000/api/egresses'),
      fetch('http://localhost:3000/api/users')
    ])
    
    const jsonEgresses = await resEgresses.json()
    const jsonUsers = await resUsers.json()
    
    if (jsonEgresses.success) egresses.value = jsonEgresses.data
    
    // Filtramos solo los socios que están Activos (partnerStatus === 1)
    if (jsonUsers.success) {
      activePartners.value = jsonUsers.data.filter((u: any) => u.partnerStatus === 1)
    }
  } catch (error) {
    console.error('Error cargando datos:', error)
  } finally {
    isLoading.value = false
  }
}

const openModal = () => {
  modalError.value = ''
  form.value = {
    concept: 'Préstamo Entregado',
    amount: 0,
    paymentMethod: 'efectivo',
    recipient: '',
    paymentDate: today,
    observations: ''
  }
  showModal.value = true
}

const submitEgress = async () => {
  modalError.value = ''
  if (form.value.amount <= 0) {
    modalError.value = 'El valor del egreso debe ser mayor a 0.'
    return
  }
  if (!form.value.recipient || !form.value.recipient.trim()) {
    modalError.value = 'Debes especificar a quién se le entrega el dinero.'
    return
  }
  
  isSaving.value = true
  try {
    const payload = { ...form.value, registeredBy: props.currentUser.id }
    const res = await fetch('http://localhost:3000/api/egresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message)
    
    showModal.value = false
    await loadData()
  } catch (err: any) {
    modalError.value = err.message
  } finally {
    isSaving.value = false
  }
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

const formatDate = (dateString: string) => dateString ? String(dateString).substring(0, 10) : ''

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="egresses-view">
    <div class="view-header">
      <div>
        <h2>Control de Egresos y Gastos</h2>
        <p>Registra las salidas de dinero manuales de la caja o banco.</p>
      </div>
      <button type="button" class="btn-create" @click="openModal">
        <span>-</span> Registrar Egreso
      </button>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <!-- Se eliminó el <th>ID</th> -->
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Beneficiario</th>
            <th>Valor</th>
            <th>Medio</th>
            <th>Observaciones</th>
            <th>Registrado Por</th>
          </tr>
        </thead>
        <tbody>
          <!-- Se ajustó el colspan a 7 -->
          <tr v-if="isLoading"><td colspan="7" class="center-text">Cargando...</td></tr>
          <tr v-else-if="egresses.length === 0"><td colspan="7" class="center-text">No hay egresos registrados.</td></tr>
          <tr v-for="e in egresses" :key="e.id">
            <!-- Se eliminó el <td>#{{ e.id }}</td> -->
            <td>{{ formatDate(e.paymentDate) }}</td>
            <td><strong>{{ e.concept }}</strong></td>
            <td>{{ e.recipient }}</td>
            <td class="money-text text-red">- {{ formatCurrency(Number(e.amount)) }}</td>
            <td>
              <span :class="['method-badge', e.paymentMethod]">
                {{ e.paymentMethod.toUpperCase() }}
              </span>
            </td>
            <td>{{ e.observations || '-' }}</td>
            <td>{{ e.registeredByName }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL DE CREACIÓN -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <div class="modal-top">
          <h3>Registrar Salida de Dinero</h3>
          <button class="btn-close" @click="showModal = false">✕</button>
        </div>
        <div v-if="modalError" class="modal-error">{{ modalError }}</div>
        
        <form @submit.prevent="submitEgress" class="modal-form">
          <div class="form-row">
            <!-- CONCEPTOS ACTUALIZADOS -->
            <div class="field">
              <label>Concepto del Gasto *</label>
              <select v-model="form.concept" required>
                <option value="Préstamo Entregado">Préstamo Entregado</option>
                <option value="Pago Premio">Pago Premio</option>
                <option value="Descapitalización">Descapitalización</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            
            <!-- BENEFICIARIO DINÁMICO (Select o Input) -->
            <div class="field">
              <label>Beneficiario (A quién se le paga) *</label>
              
              <!-- Si NO es "Otros", muestra la lista de socios activos -->
              <select v-if="form.concept !== 'Otros'" v-model="form.recipient" required>
                <option value="" disabled>-- Seleccione un socio --</option>
                <option v-for="p in activePartners" :key="p.id" :value="p.fullName">
                  {{ p.fullName }}
                </option>
              </select>
              
              <!-- Si es "Otros", muestra el campo de texto libre -->
              <input 
                v-else 
                type="text" 
                v-model="form.recipient" 
                required 
                placeholder="Nombre de la persona o local..." 
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="field">
              <label>Valor a retirar ($) *</label>
              <input type="number" v-model="form.amount" required min="1" />
            </div>
            
            <!-- MEDIOS DE PAGO ACTUALIZADOS -->
            <div class="field">
              <label>Sacar el dinero de: *</label>
              <select v-model="form.paymentMethod" required>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="field">
              <label>Fecha de Salida *</label>
              <input type="date" v-model="form.paymentDate" required />
            </div>
            <div class="field">
              <label>Observaciones (Obligatorio para "Otros")</label>
              <input 
                type="text" 
                v-model="form.observations" 
                placeholder="Ej. Cuadernos, Premio mes X..." 
                :required="form.concept === 'Otros'" 
              />
            </div>
          </div>

          <div class="modal-buttons">
            <button type="button" class="btn-cancel" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="isSaving">Restar de Caja</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.egresses-view { display: flex; flex-direction: column; gap: 1.8rem; width: 100%; }
.view-header { display: flex; justify-content: space-between; align-items: center; }
.view-header h2 { color: var(--color-primary); font-size: 1.7rem; margin: 0; }
.view-header p { color: var(--color-muted); margin-top: 0.2rem; }
.btn-create { background-color: #e53e3e; color: #fff; border: none; padding: 0.75rem 1.4rem; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; gap: 0.4rem; transition: 0.2s; }
.btn-create:hover { background-color: #c53030; }

.table-container { background: #fff; border-radius: 8px; border: 1px solid var(--color-border); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 0.95rem 1.1rem; border-bottom: 1px solid var(--color-border); }
th { background-color: var(--color-bg-light); color: var(--color-primary); font-size: 0.85rem; text-transform: uppercase; }
.money-text { font-weight: 700; }
.text-red { color: #e53e3e; }
.center-text { text-align: center; color: var(--color-muted); padding: 2rem; }

.method-badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
.method-badge.efectivo { background: #fefcbf; color: #744210; border: 1px solid #f6e05e; }
.method-badge.transferencia { background: #ebf8ff; color: #2b6cb0; border: 1px solid #90cdf4; }

.modal-overlay { position: fixed; inset: 0; background: rgba(8,28,45,0.65); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1.5rem; }
.modal-box { background: #fff; border-radius: 8px; width: 700px; max-width: 100%; padding: 2rem; max-height: 90vh; overflow-y: auto; }
.modal-top { display: flex; justify-content: space-between; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem; margin-bottom: 1rem; }
.btn-close { background: none; border: none; font-size: 1.2rem; cursor: pointer; }
.modal-error { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }
.modal-form { display: flex; flex-direction: column; gap: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label { font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }
.field input, .field select { padding: 0.7rem; border: 1px solid var(--color-border); border-radius: 6px; }
.mt-2 { margin-top: 0.8rem; }
.modal-buttons { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; border-top: 1px solid var(--color-border); padding-top: 1.5rem; }
.btn-cancel { background: none; border: 1px solid var(--color-border); padding: 0.7rem 1.4rem; border-radius: 6px; cursor: pointer; }
.btn-save { background: #e53e3e; color: #fff; border: none; padding: 0.7rem 1.4rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.5; }
</style>
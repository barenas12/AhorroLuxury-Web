<script setup lang="ts">
import { ref, nextTick } from 'vue'

import html2pdf from 'html2pdf.js'

export interface TicketItem {
  concept: string
  amount: number
  method: string
}

export interface TicketData {
  id: string
  date: string
  partnerName: string
  documentId: string
  totalAmount: number
  registeredBy: string
  items: TicketItem[]
}

const props = defineProps<{
  ticketData: TicketData | null
}>()

const ticketElement = ref<HTMLElement | null>(null)

const sanitizeFilename = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
  .trim()
  .replace(/\s+/g, '_')

const createPDF = async (): Promise<File> => {
  if (!props.ticketData) throw new Error('No hay datos para generar el recibo.')

  await nextTick()

  const element = ticketElement.value
  if (!element) throw new Error('No se pudo preparar el recibo para generar el PDF.')

  const personName = sanitizeFilename(props.ticketData.partnerName) || 'Socio'
  const receiptId = sanitizeFilename(props.ticketData.id) || String(Date.now())
  const filename = `Abono_${personName}_${receiptId}.pdf`
  const height = Math.ceil((element.scrollHeight * 25.4) / 96) + 6

  const opt: Parameters<InstanceType<typeof html2pdf.Worker>['set']>[0] = {
    margin: [3, 3, 3, 3],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: [80, height], orientation: 'portrait' }
  }

  const pdf: Blob = await html2pdf().set(opt).from(element).outputPdf('blob')
  return new File([pdf], filename, { type: 'application/pdf' })
}

const downloadPDF = async (): Promise<void> => {
  const file = await createPDF()
  const downloadUrl = URL.createObjectURL(file)
  const downloadLink = document.createElement('a')
  downloadLink.href = downloadUrl
  downloadLink.download = file.name
  downloadLink.click()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
}

defineExpose({ downloadPDF })

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    maximumFractionDigits: 0 
  }).format(val)
}
</script>

<template>
  <!-- Contenedor oculto en la vista web -->
  <div class="ticket-hidden-container">
    <div ref="ticketElement" class="ticket-body" v-if="ticketData">
      
      <!-- Cabecera del Recibo -->
      <div class="ticket-header">
        <img src="/img/logo-luxury.png" alt="Ahorro Luxury Logo" class="ticket-logo" />
        <h2>AHORRO LUXURY</h2>
        <p>Comprobante de Ingreso</p>
        <div class="divider"></div>
      </div>

      <!-- Datos del Socio -->
      <div class="ticket-info">
        <p><strong>Nro Recibo:</strong> #{{ ticketData.id }}</p>
        <p><strong>Fecha:</strong> {{ ticketData.date }}</p>
        <p><strong>Socio:</strong> {{ ticketData.partnerName }}</p>
        <p><strong>Documento:</strong> {{ ticketData.documentId }}</p>
      </div>

      <div class="divider"></div>

      <!-- Ciclo de Conceptos Pagados -->
      <div class="ticket-details">
        <div class="detail-item" v-for="(item, index) in ticketData.items" :key="index">
          <div class="detail-row">
            <span class="concept-name">{{ item.concept }}</span>
            <strong>{{ formatCurrency(Number(item.amount)) }}</strong>
          </div>
          <div class="detail-row sub-row">
            <span>Medio: {{ item.method.toUpperCase() }}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="detail-row total-row">
          <span>TOTAL PAGADO:</span>
          <strong>{{ formatCurrency(Number(ticketData.totalAmount)) }}</strong>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Pie de página -->
      <div class="ticket-footer">
        <p>Atendido por: {{ ticketData.registeredBy }}</p>
        <p class="bold">¡Gracias por su puntualidad!</p>
        <small>Este documento es un soporte válido de Ahorro Luxury.</small>
      </div>

    </div>
  </div>
</template>

<style scoped>
.ticket-hidden-container {
  position: absolute;
  left: -9999px;
  top: -9999px;
}

.ticket-body {
  box-sizing: border-box;
  width: 280px;
  padding: 14px;
  background-color: #ffffff;
  color: #000000;
  font-family: 'Courier New', Courier, monospace;
  overflow-wrap: anywhere;
}

.ticket-header {
  text-align: center;
  margin-bottom: 10px;
}

.ticket-logo {
  width: 50px;
  height: auto;
  margin-bottom: 8px;
}

.ticket-header h2 {
  font-size: 1.1rem;
  margin: 0 0 4px 0;
  font-weight: 800;
}

.ticket-header p {
  font-size: 0.8rem;
  margin: 0;
}

.divider {
  border-top: 1px dashed #000;
  margin: 10px 0;
}

.ticket-info p {
  font-size: 0.8rem;
  margin: 3px 0;
}

.ticket-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.8rem;
}

.concept-name {
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.detail-row strong {
  flex-shrink: 0;
  white-space: nowrap;
}

.sub-row span {
  font-size: 0.7rem;
  color: #444;
}

.total-row {
  font-size: 1rem;
  font-weight: bold;
  margin-top: 5px;
}

.ticket-footer {
  text-align: center;
  font-size: 0.75rem;
  margin-top: 10px;
}

.ticket-footer p {
  margin: 3px 0;
}

.ticket-footer .bold {
  font-weight: bold;
  margin-top: 8px;
}

.ticket-footer small {
  font-size: 0.6rem;
  color: #555;
  display: block;
  margin-top: 8px;
}
</style>
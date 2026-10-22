<script setup lang="ts">
import { nextTick, ref } from 'vue'
import html2pdf from 'html2pdf.js'

export interface LoanReceiptData {
  id: string
  partnerName: string
  documentId: string
  deliveryMethod: string
  capital: number
  guarantee: string
  interestRate: number
  deliveryDate: string
  installments: number
  dueDate: string
  daysLate: number
  interestPayment: number
  remainingInterest: number
  capitalPayment: number
  remainingCapital: number
  totalPayments: number
  totalRemaining: number
  status: string
  adjustment: string
  adjustmentValue: number
  description: string
  registeredBy: string
  receiptType: 'loan' | 'payment'
}

const props = defineProps<{
  receiptData: LoanReceiptData | null
}>()

const receiptElement = ref<HTMLElement | null>(null)

const sanitizeFilename = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
  .trim()
  .replace(/\s+/g, '_')

const formatCurrency = (amount: number): string => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
}).format(Number(amount) || 0)

const formatDate = (date: string): string => {
  if (!date) return ''
  const [year, month, day] = date.substring(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : date
}

const createPDF = async (): Promise<File> => {
  if (!props.receiptData) throw new Error('No hay datos para generar el comprobante.')

  await nextTick()
  const element = receiptElement.value
  if (!element) throw new Error('No se pudo preparar el comprobante para generar el PDF.')

  const personName = sanitizeFilename(props.receiptData.partnerName) || 'Socio'
  const receiptId = sanitizeFilename(props.receiptData.id) || String(Date.now())
  const type = props.receiptData.receiptType === 'loan' ? 'Prestamo' : 'Abono'
  const filename = `${type}_${personName}_${receiptId}.pdf`
  const height = Math.ceil((element.scrollHeight * 25.4) / 96) + 6
  const options: Parameters<InstanceType<typeof html2pdf.Worker>['set']>[0] = {
    margin: [3, 3, 3, 3],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: [80, height], orientation: 'portrait' }
  }
  const blob: Blob = await html2pdf().set(options).from(element).outputPdf('blob')
  return new File([blob], filename, { type: 'application/pdf' })
}

const downloadPDF = async (): Promise<void> => {
  const file = await createPDF()
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

defineExpose({ downloadPDF })
</script>

<template>
  <div class="receipt-hidden-container">
    <div v-if="receiptData" ref="receiptElement" class="receipt">
      <header class="receipt-header">
        <img src="/img/logo-luxury.png" alt="Ahorro Luxury" class="receipt-logo" />
        <h1>AHORRO LUXURY</h1>
        <p>{{ receiptData.receiptType === 'loan' ? 'Comprobante de Préstamo' : 'Comprobante de Abono' }}</p>
      </header>

      <section class="receipt-section">
        <div class="receipt-row"><span>N° Factura</span><strong>#{{ receiptData.id }}</strong></div>
        <div class="receipt-row"><span>Solicitante</span><strong>{{ receiptData.partnerName }}</strong></div>
        <div class="receipt-row"><span>Documento</span><strong>{{ receiptData.documentId }}</strong></div>
        <div class="receipt-row"><span>Se entrega en</span><strong>{{ receiptData.deliveryMethod }}</strong></div>
        <div class="receipt-row"><span>Capital</span><strong>{{ formatCurrency(receiptData.capital) }}</strong></div>
        <div class="receipt-row"><span>Préstamo en</span><strong>{{ receiptData.guarantee }}</strong></div>
        <div class="receipt-row"><span>% Interés</span><strong>{{ receiptData.interestRate }}%</strong></div>
      </section>

      <section class="receipt-section">
        <div class="receipt-row"><span>Fecha Entrega</span><strong>{{ formatDate(receiptData.deliveryDate) }}</strong></div>
        <div class="receipt-row"><span>N° Cuotas</span><strong>{{ receiptData.installments }}</strong></div>
        <div class="receipt-row"><span>Fecha límite de pago</span><strong>{{ formatDate(receiptData.dueDate) }}</strong></div>
        <div class="receipt-row"><span>Días en mora</span><strong>{{ receiptData.daysLate }}</strong></div>
      </section>

      <section class="receipt-section balance-section">
        <div class="receipt-row"><span>Abono intereses</span><strong>{{ formatCurrency(receiptData.interestPayment) }}</strong></div>
        <div class="receipt-row"><span>Restante intereses</span><strong>{{ formatCurrency(receiptData.remainingInterest) }}</strong></div>
        <div class="receipt-row"><span>Abono capital</span><strong>{{ formatCurrency(receiptData.capitalPayment) }}</strong></div>
        <div class="receipt-row"><span>Restante capital</span><strong>{{ formatCurrency(receiptData.remainingCapital) }}</strong></div>
        <div class="receipt-row total-row"><span>Total abonos</span><strong>{{ formatCurrency(receiptData.totalPayments) }}</strong></div>
        <div class="receipt-row"><span>Total restante</span><strong>{{ formatCurrency(receiptData.totalRemaining) }}</strong></div>
        <div class="receipt-row"><span>Estado del préstamo</span><strong>{{ receiptData.status }}</strong></div>
        <div class="receipt-row"><span>Ajuste</span><strong>{{ receiptData.adjustment }}</strong></div>
        <div class="receipt-row"><span>Valor ajuste</span><strong>{{ formatCurrency(receiptData.adjustmentValue) }}</strong></div>
      </section>

      <section class="description">
        <strong>Descripción</strong>
        <p>{{ receiptData.description || '-' }}</p>
      </section>

      <footer>
        <p>Registrado por: {{ receiptData.registeredBy }}</p>
        <small>Conserve este comprobante para sus registros.</small>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.receipt-hidden-container {
  position: absolute;
  left: -10000px;
  top: 0;
}

.receipt {
  box-sizing: border-box;
  width: 290px;
  padding: 14px;
  background: #fff;
  color: #111;
  font-family: Arial, sans-serif;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.receipt-header {
  text-align: center;
  padding-bottom: 10px;
  border-bottom: 1px dashed #333;
}

.receipt-logo {
  display: block;
  width: 120px;
  height: 52px;
  object-fit: contain;
  margin: 0 auto 6px;
}

.receipt-header h1 {
  margin: 0;
  font-size: 19px;
}

.receipt-header p {
  margin: 4px 0 0;
  font-size: 13px;
}

.receipt-section {
  padding: 8px 0;
  border-bottom: 1px dashed #333;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 0;
}

.receipt-row span {
  flex: 1;
  min-width: 0;
}

.receipt-row strong {
  flex-shrink: 0;
  max-width: 58%;
  text-align: right;
}

.balance-section {
  display: grid;
  grid-template-columns: 1fr;
}

.total-row {
  border-top: 1px solid #999;
  margin-top: 4px;
  padding-top: 7px;
  font-size: 14px;
  font-weight: 700;
}

.description {
  min-height: 52px;
  padding: 9px 0;
  border-bottom: 1px dashed #333;
}

.description p {
  margin: 5px 0 0;
}

footer {
  padding-top: 10px;
  text-align: center;
}

footer p {
  margin: 0 0 5px;
}

footer small {
  color: #555;
}
</style>

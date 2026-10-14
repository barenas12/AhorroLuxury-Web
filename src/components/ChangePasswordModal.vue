<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  username: string
  userData: {
    name?: string
    lastName?: string
    user?: string
  }
}>()

const emit = defineEmits<{
  (e: 'password-changed'): void
}>()

const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// Validaciones reactivas de contraseña
const hasMinLength = computed(() => newPassword.value.length >= 8)
const hasUpper = computed(() => /[A-Z]/.test(newPassword.value))
const hasLower = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /\d/.test(newPassword.value))
const hasSpecial = computed(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword.value))

const containsPersonalData = computed(() => {
  const pass = newPassword.value.toLowerCase()
  if (!pass) return false
  const userDoc = (props.userData.user || '').toLowerCase()
  const name = (props.userData.name || '').toLowerCase()
  const lastName = (props.userData.lastName || '').toLowerCase()

  return (
    (userDoc && pass.includes(userDoc)) ||
    (name && pass.includes(name)) ||
    (lastName && pass.includes(lastName))
  )
})

const isFormValid = computed(() => {
  return (
    hasMinLength.value &&
    hasUpper.value &&
    hasLower.value &&
    hasNumber.value &&
    hasSpecial.value &&
    !containsPersonalData.value &&
    newPassword.value === confirmPassword.value
  )
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const res = await fetch('http://localhost:3000/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: props.username,
        newPassword: newPassword.value
      })
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al actualizar contraseña')
    }

    emit('password-changed')
  } catch (err: any) {
    errorMessage.value = err.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal-card">
      <div class="header">
        <span class="badge">Primer Ingreso</span>
        <h2>Actualización Obligatoria de Contraseña</h2>
        <p>Por seguridad de tus ahorros en <strong>Ahorro Luxury</strong>, debes definir una contraseña personalizada.</p>
      </div>

      <div v-if="errorMessage" class="error-box">{{ errorMessage }}</div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Nueva Contraseña</label>
          <input type="password" v-model="newPassword" placeholder="••••••••" required />
        </div>

        <div class="form-group">
          <label>Confirmar Contraseña</label>
          <input type="password" v-model="confirmPassword" placeholder="••••••••" required />
        </div>

        <!-- Checklist de requerimientos -->
        <ul class="checklist">
          <li :class="{ ok: hasMinLength }">Mínimo 8 caracteres</li>
          <li :class="{ ok: hasUpper }">Al menos una letra mayúscula</li>
          <li :class="{ ok: hasLower }">Al menos una letra minúscula</li>
          <li :class="{ ok: hasNumber }">Al menos un número</li>
          <li :class="{ ok: hasSpecial }">Al menos un carácter especial (!@#$%...)</li>
          <li :class="{ ok: !containsPersonalData && newPassword.length > 0, danger: containsPersonalData }">
            No debe contener tu nombre, apellido o documento
          </li>
          <li :class="{ ok: newPassword === confirmPassword && confirmPassword.length > 0 }">
            Las contraseñas coinciden
          </li>
        </ul>

        <button type="submit" class="btn-submit" :disabled="!isFormValid || isLoading">
          {{ isLoading ? 'Guardando...' : 'Establecer Contraseña e Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(8, 28, 45, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1.5rem;
}
.modal-card {
  background: #fff;
  padding: 2.5rem;
  border-radius: var(--radius);
  max-width: 480px;
  width: 100%;
  box-shadow: 0 15px 30px rgba(0,0,0,0.3);
}
.header {
  text-align: center;
  margin-bottom: 1.5rem;
}
.badge {
  background: rgba(31, 122, 99, 0.15);
  color: var(--color-secondary);
  font-weight: bold;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
}
.header h2 {
  font-size: 1.5rem;
  color: var(--color-primary);
  margin-top: 0.5rem;
}
.header p {
  font-size: 0.9rem;
  color: var(--color-muted);
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
  color: var(--color-primary);
}
.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}
.checklist {
  list-style: none;
  font-size: 0.8rem;
  margin: 1.2rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.checklist li {
  color: #a0aec0;
}
.checklist li.ok {
  color: var(--color-secondary);
  font-weight: 600;
}
.checklist li.danger {
  color: #e53e3e;
  font-weight: 600;
}
.btn-submit {
  width: 100%;
  padding: 0.85rem;
  background: var(--color-secondary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.error-box {
  background: #fed7d7;
  color: #9b2c2c;
  padding: 0.7rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.85rem;
}
</style>
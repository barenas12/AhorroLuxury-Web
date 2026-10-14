<script setup lang="ts">
import { reactive, ref } from 'vue'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'login-success', user: any): void
}>()

const form = reactive({
  user: '',
  password: ''
})

const isLoading = ref<boolean>(false)
const errorMessage = ref<string>('')

const handleSubmit = async (): Promise<void> => {
  if (!form.user.trim()) {
    errorMessage.value = 'Ingresa tu nombre de usuario.'
    return
  }

  if (!form.password) {
    errorMessage.value = 'Ingresa tu contraseña.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch('http://localhost:3000/api/login/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: form.user, password: form.password })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      errorMessage.value = data.message || 'Error al iniciar sesión'
      return
    }

    // data.data contiene el usuario de la BD (con su profile: 1, 2, etc.)
    emit('login-success', data.data)
  } catch (error) {
    errorMessage.value = 'No fue posible conectar con el servidor.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="login-wrapper">
    <div class="login-card">
      <button class="btn-back" @click="emit('close')" type="button" aria-label="Cerrar">✕</button>

      <div class="login-header">
        <span class="badge">Portal de Socios</span>
        <h2>Iniciar Sesión</h2>
        <p>Ingresa para consultar el estado de tu ahorro</p>
      </div>

      <div v-if="errorMessage" class="alert-error">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="user">Usuario</label>
          <input
            id="user"
            v-model="form.user"
            type="text"
            placeholder="Tu nombre de usuario"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="btn-submit" :disabled="isLoading">
          {{ isLoading ? 'Verificando...' : 'Ingresar al Portal' }}
        </button>

        <button type="button" class="btn-return" @click="emit('close')">
          Regresar al inicio
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.login-wrapper {
  min-height: calc(100vh - 140px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
}
.login-card {
  position: relative;
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  border-radius: var(--radius);
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
}
.btn-back {
  position: absolute;
  top: 1.2rem;
  right: 1.2rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--color-muted);
  cursor: pointer;
}
.login-header {
  text-align: center;
  margin-bottom: 2rem;
}
.badge {
  display: inline-block;
  background-color: rgba(31, 122, 99, 0.12);
  color: var(--color-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  margin-bottom: 0.8rem;
}
.login-header h2 {
  font-size: 1.8rem;
  color: var(--color-primary);
}
.login-header p {
  color: var(--color-muted);
  font-size: 0.95rem;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-primary);
}
.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
}
.form-group input:focus {
  border-color: var(--color-secondary);
}
.btn-submit {
  background-color: var(--color-secondary);
  color: #fff;
  border: none;
  padding: 0.85rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-return {
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
}
.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  text-align: center;
}
</style>
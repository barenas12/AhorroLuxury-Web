<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { apiFetch } from '../utils/apiClient'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'login-success', payload: { user: any; token: string }): void
}>()

const form = reactive({
  user: '',
  password: ''
})

const isLoading = ref<boolean>(false)
const errorMessage = ref<string>('')
const showPassword = ref<boolean>(false)
const cardRef = ref<HTMLElement | null>(null)
let gsapCtx: gsap.Context | null = null

onMounted(() => {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsapCtx = gsap.context(() => {
      gsap.from(cardRef.value, {
        y: 22,
        scale: 0.98,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.out'
      })
    })
  })
})

onUnmounted(() => {
  gsapCtx?.revert()
})

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
    const response = await apiFetch('/api/login/check-user', {
      method: 'POST',
      skipAuthRedirect: true,
      body: JSON.stringify({ user: form.user, password: form.password })
    })

    const data = await response.json()

    if (!response.ok || !data.success || !data.token) {
      errorMessage.value = data.message || 'Error al iniciar sesión'
      return
    }

    // data.data contiene el usuario de la BD y data.token el JWT firmado
    emit('login-success', { user: data.data, token: data.token })
  } catch (error) {
    errorMessage.value = 'No fue posible conectar con el servidor.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="login-wrapper">
    <div ref="cardRef" class="login-card">
      <button class="btn-back" @click="emit('close')" type="button" aria-label="Cerrar formulario de inicio de sesión">✕</button>

      <div class="login-header">
        <span class="badge">Portal de Socios</span>
        <h1>Iniciar Sesión</h1>
        <p>Ingresa con tu documento para consultar el estado de tu ahorro</p>
      </div>

      <div v-if="errorMessage" role="alert" aria-live="assertive" class="alert-error">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="user">Usuario</label>
          <input
            id="user"
            name="username"
            v-model="form.user"
            type="text"
            autocomplete="username"
            spellcheck="false"
            autocapitalize="none"
            autocorrect="off"
            enterkeyhint="next"
            placeholder="Tu documento o usuario"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="password-field">
            <input
              id="password"
              name="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              enterkeyhint="done"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              class="btn-toggle-pass"
              :aria-pressed="showPassword"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
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
  min-height: calc(100vh - 150px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  background:
    radial-gradient(circle at 20% 20%, rgba(31, 122, 99, 0.1), transparent 45%),
    radial-gradient(circle at 80% 80%, rgba(8, 28, 45, 0.08), transparent 45%),
    var(--color-bg-light);
}

.login-card {
  position: relative;
  background-color: var(--color-card-bg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-hover);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 430px;
  padding: 2.5rem;
}

.btn-back {
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1rem;
  color: var(--color-muted);
  cursor: pointer;
  display: grid;
  place-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.btn-back:hover {
  background: #e2e8f0;
  color: var(--color-primary);
}

.login-header {
  text-align: center;
  margin-bottom: 1.9rem;
}

.badge {
  display: inline-block;
  background-color: rgba(31, 122, 99, 0.12);
  color: var(--color-secondary);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.32rem 0.9rem;
  border-radius: 999px;
  margin-bottom: 0.8rem;
}

.login-header h1 {
  font-size: 1.85rem;
  color: var(--color-primary);
  margin-bottom: 0.35rem;
}

.login-header p {
  color: var(--color-muted);
  font-size: 0.94rem;
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
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 0.96rem;
  background: #ffffff;
  color: var(--color-text-dark);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input:focus {
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 3px rgba(31, 122, 99, 0.16);
}

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field input {
  padding-right: 4.5rem;
}

.btn-toggle-pass {
  position: absolute;
  right: 0.55rem;
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.35rem 0.65rem;
  border-radius: 7px;
  cursor: pointer;
}

.btn-toggle-pass:hover {
  background: #e2e8f0;
}

.btn-submit {
  background: linear-gradient(135deg var(--in-oklab), var(--color-secondary) 0%, var(--color-secondary-bright) 100%);
  color: #fff;
  border: none;
  padding: 0.9rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px -6px rgba(31, 122, 99, 0.55);
  transition: transform 0.2s ease, filter 0.2s ease;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-return {
  background: none;
  border: none;
  color: var(--color-muted);
  font-weight: 600;
  cursor: pointer;
  padding: 0.4rem;
}

.btn-return:hover {
  color: var(--color-primary);
}

.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 0.8rem;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
}
</style>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/api/auth'

const router = useRouter()
const error = ref(null)

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const errorParam = params.get('error')

  if (errorParam) {
    error.value = `Authorization failed: ${errorParam}`
    return
  }

  if (!code) {
    error.value = 'No authorization code received'
    return
  }

  try {
    await authService.handleCallback(code, state)
    router.push('/')
  } catch (err) {
    error.value = err.message
    console.error(err)
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div v-if="error" class="text-red-600 text-center">
      <p class="font-bold">Login failed</p>
      <p>{{ error }}</p>
    </div>
    <div v-else class="text-gray-600">
      Completing sign in...
    </div>
  </div>
</template>
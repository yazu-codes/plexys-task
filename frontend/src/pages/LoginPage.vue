<script setup>
import Button from 'primevue/button'
import { authService } from '@/api/auth'

const handleLogin = () => {
  authService.login()
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen px-4" style="background-color: var(--bg);">
    <div
      class="w-full max-w-sm rounded-xl p-8 text-center"
      style="background-color: var(--surface); border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(20,23,31,0.06);"
    >
      <div
        class="w-12 h-12 rounded-lg mx-auto mb-6 flex items-center justify-center font-display font-bold text-white"
        style="background-color: var(--accent);"
        aria-hidden="true"
      >
        P
      </div>

      <h1 class="text-2xl font-display font-semibold mb-2" style="color: var(--text);">
        Plexys
      </h1>
      <p class="text-sm mb-8" style="color: var(--text-muted);">
        Sign in with your Corteza account to manage support tickets.
      </p>

      <Button
        label="Sign in with Corteza"
        icon="pi pi-sign-in"
        @click="handleLogin"
        class="w-full"
      />
    </div>
  </div>
</template>
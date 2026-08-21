<template>
  <div class="min-h-screen" style="background-color: var(--bg);">
    <nav class="border-b" style="background-color: var(--surface); border-color: var(--border);">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex justify-between items-center gap-2">
          <div class="flex items-center gap-2 flex-shrink-0">
            <div
              class="w-8 h-8 rounded-md flex items-center justify-center font-display font-bold text-white text-sm"
              style="background-color: var(--accent);"
              aria-hidden="true"
            >
              P
            </div>
            <h1 class="text-xl font-display font-semibold hidden sm:block" style="color: var(--text);">
              Plexys
            </h1>
          </div>

          <ul
            v-if="isAuthenticated"
            class="flex items-center gap-1 ml-2"
            role="menubar"
            aria-label="Sections"
          >
            <li v-for="route in navRoutes" :key="route.name" role="none">
              <RouterLink
                :to="route.path"
                role="menuitem"
                class="nav-link"
                :class="{ 'nav-link-active': $route.path === route.path }"
                :aria-label="route.meta.navLabel"
              >
                <i :class="route.meta.navIcon" aria-hidden="true"></i>
                <span class="hidden sm:inline">{{ route.meta.navLabel }}</span>
              </RouterLink>
            </li>
          </ul>

          <div v-if="isAuthenticated" class="flex items-center gap-4 flex-shrink-0">
            <Button
              icon="pi pi-sign-out"
              label="Log out"
              text
              size="small"
              class="logout-btn"
              @click="logout"
            />
          </div>
        </div>
      </div>
    </nav>

    <main class="py-8">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { RouterView, RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { authService, isAuthenticated } from '@/api/auth'
import { navRoutes } from '@/router'

const router = useRouter()

const logout = () => {
  authService.logout()
  router.push('/login')
}
</script>
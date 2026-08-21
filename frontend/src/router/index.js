import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../pages/LoginPage.vue'
import CallbackPage from '../pages/CallbackPage.vue'
import TicketsPage from '../pages/TicketsPage.vue'
import CustomersPage from '../pages/CustomersPage.vue'
import { authService } from '@/api/auth'

const routes = [
  { path: '/login', name: 'Login', component: LoginPage },
  { path: '/callback', name: 'Callback', component: CallbackPage },
  {
    path: '/',
    name: 'Tickets',
    component: TicketsPage,
    meta: { requiresAuth: true, navLabel: 'Tickets', navIcon: 'pi pi-ticket' }
  },
  // Add new CRUD modules here, following the same shape, e.g.:
  {
    path: '/customers',
    name: 'Customers',
    component: CustomersPage,
    meta: { requiresAuth: true, navLabel: 'Customers', navIcon: 'pi pi-users' }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !authService.isAuthenticated()) {
    next('/login')
  } else {
    next()
  }
})

// Expose routes that should appear in the nav menu
export const navRoutes = routes.filter(r => r.meta?.navLabel)

export default router
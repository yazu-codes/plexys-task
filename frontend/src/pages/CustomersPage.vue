<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/cortezaClient'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

// TODO: replace with your real namespace + Customer module ID
const NAMESPACE = import.meta.env.VITE_CORTEZA_NAMESPACE_ID
const CUSTOMER_MODULE = import.meta.env.VITE_CORTEZA_CUSTOMER_MODULE_ID

const customers = ref([])
const loading = ref(false)
const error = ref(null)
const showDialog = ref(false)
const isEditing = ref(false)
const editingRecordId = ref(null)

const emptyCustomer = () => ({
  Name: '',
  Email: '',
  Phone: '',
  Company: '',
})

const form = ref(emptyCustomer())

const normalizeValues = (values) => {
  if (Array.isArray(values)) {
    const flat = {}
    values.forEach(v => { flat[v.name] = v.value })
    return flat
  }
  return values || {}
}

const loadCustomers = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await api.get(
      `/compose/namespace/${NAMESPACE}/module/${CUSTOMER_MODULE}/record/`
    )

    const rawSet = response.data?.response?.set || []
    customers.value = rawSet.map(record => ({
      ...record,
      values: normalizeValues(record.values),
    }))
  } catch (err) {
    error.value = `Failed to load customers: ${err.response?.data?.error || err.message}`
    console.error('Load error:', err)
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  editingRecordId.value = null
  form.value = emptyCustomer()
  showDialog.value = true
}

const openEditDialog = (record) => {
  isEditing.value = true
  editingRecordId.value = record.recordID
  form.value = {
    Name: record.values.name || '',
    Email: record.values.email || '',
    Phone: record.values.phone || '',
    Company: record.values.company || '',
  }
  showDialog.value = true
}

const buildPayloadValues = () => [
  { name: 'name', value: form.value.Name },
  { name: 'email', value: form.value.Email },
  { name: 'phone', value: form.value.Phone },
  { name: 'company', value: form.value.Company },
]

const saveCustomer = async () => {
  try {
    if (!form.value.Name.trim()) {
      error.value = 'Name is required'
      return
    }

    const values = buildPayloadValues()

    if (isEditing.value) {
      await api.post(
        `/compose/namespace/${NAMESPACE}/module/${CUSTOMER_MODULE}/record/${editingRecordId.value}`,
        { values }
      )
    } else {
      await api.post(
        `/compose/namespace/${NAMESPACE}/module/${CUSTOMER_MODULE}/record/`,
        { values }
      )
    }

    showDialog.value = false
    error.value = null
    await loadCustomers()
  } catch (err) {
    error.value = `Failed to save customer: ${err.response?.data?.error || err.message}`
    console.error('Save error:', err)
  }
}

const deleteCustomer = async (recordId) => {
  try {
    await api.delete(`/compose/namespace/${NAMESPACE}/module/${CUSTOMER_MODULE}/record/${recordId}`)
    error.value = null
    await loadCustomers()
  } catch (err) {
    error.value = `Failed to delete customer: ${err.response?.data?.error || err.message}`
    console.error('Delete error:', err)
  }
}

onMounted(() => {
  loadCustomers()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-8 gap-4">
      <div class="min-w-0">
        <h1 class="text-3xl font-display font-semibold" style="color: var(--text);">
          Customers
        </h1>
        <p class="mt-1 text-sm" style="color: var(--text-muted);">
          {{ customers.length }} customer{{ customers.length === 1 ? '' : 's' }}
        </p>
      </div>
      <Button
        label="New Customer"
        icon="pi pi-plus"
        @click="openCreateDialog"
        aria-label="Create new customer"
        class="flex-shrink-0"
      />
    </div>

    <Message
      v-if="error"
      severity="error"
      :text="error"
      class="mb-6 w-full"
      closable
      @close="error = null"
    />

    <div v-if="loading" class="flex justify-center py-16">
      <ProgressSpinner aria-label="Loading customers" style="width: 40px; height: 40px;" strokeWidth="4" />
    </div>

    <template v-else>
      <div
        v-if="customers.length === 0"
        class="text-center py-16 rounded-lg"
        style="background-color: var(--surface); border: 1px dashed var(--border);"
      >
        <i class="pi pi-users text-4xl mb-3" style="color: var(--text-muted);" aria-hidden="true"></i>
        <p class="font-medium" style="color: var(--text);">No customers yet</p>
        <p class="text-sm mt-1" style="color: var(--text-muted);">Add your first customer to get started.</p>
      </div>

      <template v-else>
        <!-- Desktop table -->
        <div class="hidden md:block">
          <DataTable
            :value="customers"
            :rows="10"
            paginator
            class="rounded-lg overflow-hidden"
            style="border: 1px solid var(--border);"
          >
            <Column header="Name" style="width: 25%">
              <template #body="slotProps">
                <span class="font-medium" style="color: var(--text);">{{ slotProps.data.values.name }}</span>
              </template>
            </Column>
            <Column header="Company" style="width: 20%">
              <template #body="slotProps">
                <span style="color: var(--text-muted);">{{ slotProps.data.values.company || '—' }}</span>
              </template>
            </Column>
            <Column header="Email" style="width: 25%">
              <template #body="slotProps">
                <span style="color: var(--text-muted);">{{ slotProps.data.values.email || '—' }}</span>
              </template>
            </Column>
            <Column header="Phone" style="width: 15%">
              <template #body="slotProps">
                <span style="color: var(--text-muted);">{{ slotProps.data.values.phone || '—' }}</span>
              </template>
            </Column>
            <Column header="" style="width: 15%">
              <template #body="slotProps">
                <div class="flex gap-1 justify-end">
                  <Button
                    icon="pi pi-pencil"
                    rounded
                    text
                    size="small"
                    aria-label="Edit customer"
                    @click="openEditDialog(slotProps.data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    rounded
                    text
                    size="small"
                    severity="danger"
                    aria-label="Delete customer"
                    @click="deleteCustomer(slotProps.data.recordID)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Mobile cards -->
        <div class="md:hidden">
          <div
            v-for="customer in customers"
            :key="customer.recordID"
            class="ticket-card"
          >
            <div class="ticket-card-subject">{{ customer.values.name }}</div>
            <div v-if="customer.values.company" class="ticket-card-desc">
              {{ customer.values.company }}
            </div>
            <div class="ticket-card-meta">
              <span v-if="customer.values.email" class="text-xs" style="color: var(--text-muted);">
                {{ customer.values.email }}
              </span>
              <span v-if="customer.values.phone" class="text-xs" style="color: var(--text-muted);">
                {{ customer.values.phone }}
              </span>
            </div>
            <div class="ticket-card-footer">
              <span class="text-xs" style="color: var(--text-muted);">
                #{{ customer.recordID.slice(-6) }}
              </span>
              <div class="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  rounded
                  text
                  size="small"
                  aria-label="Edit customer"
                  @click="openEditDialog(customer)"
                />
                <Button
                  icon="pi pi-trash"
                  rounded
                  text
                  size="small"
                  severity="danger"
                  aria-label="Delete customer"
                  @click="deleteCustomer(customer.recordID)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <Dialog
      v-model:visible="showDialog"
      :header="isEditing ? 'Edit Customer' : 'New Customer'"
      :modal="true"
      class="w-full max-w-md"
    >
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Name <span style="color: var(--priority-urgent);">*</span>
          </label>
          <InputText id="name" v-model="form.Name" class="w-full" placeholder="Customer name" autofocus />
        </div>

        <div>
          <label for="company" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Company
          </label>
          <InputText id="company" v-model="form.Company" class="w-full" placeholder="Company name" />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Email
          </label>
          <InputText id="email" v-model="form.Email" class="w-full" placeholder="name@example.com" type="email" />
        </div>

        <div>
          <label for="phone" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Phone
          </label>
          <InputText id="phone" v-model="form.Phone" class="w-full" placeholder="+1 555 000 0000" />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" @click="showDialog = false" text />
        <Button label="Save customer" @click="saveCustomer" icon="pi pi-check" />
      </template>
    </Dialog>
  </div>
</template>
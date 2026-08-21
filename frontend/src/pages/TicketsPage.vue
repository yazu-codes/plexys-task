<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/cortezaClient'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Calendar from 'primevue/calendar'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'

// TODO: confirm these against GET /api/compose/namespace and
// GET /api/compose/namespace/{id}/module before final submission
const NAMESPACE = import.meta.env.VITE_CORTEZA_NAMESPACE_ID
const MODULE = import.meta.env.VITE_CORTEZA_TICKET_MODULE_ID
const CUSTOMER_MODULE = import.meta.env.VITE_CORTEZA_CUSTOMER_MODULE_ID

const customerOptions = ref([])

const statusLabels = { new: 'New', 'in-progress': 'In Progress', resolved: 'Resolved', closed: 'Closed' }
const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }

const statusLabel = (status) => statusLabels[status] || status
const priorityLabel = (priority) => priorityLabels[priority] || priority

const priorityDotColor = (priority) => ({
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
  urgent: 'var(--priority-urgent)',
}[priority] || '#9CA3AF')

const tickets = ref([])
const loading = ref(false)
const error = ref(null)
const showDialog = ref(false)
const isEditing = ref(false)
const editingRecordId = ref(null)

const emptyTicket = () => ({
  Subject: '',
  Description: '',
  Status: 'new',
  Priority: 'medium',
  'due-date': null,
  customer: null,
})

const form = ref(emptyTicket())

const statusOptions = [
  { label: 'New', value: 'new' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

const priorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

const normalizeValues = (values) => {
  if (Array.isArray(values)) {
    const flat = {}
    values.forEach(v => { flat[v.name] = v.value })
    return flat
  }
  return values || {}
}

const customerName = (customerId) => {
  const found = customerOptions.value.find(c => c.value === customerId)
  return found ? found.label : null
}

const loadTickets = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await api.get(
      `/compose/namespace/${NAMESPACE}/module/${MODULE}/record/`
    )

    const rawSet = response.data?.response?.set || []
    tickets.value = rawSet.map(record => ({
      ...record,
      values: normalizeValues(record.values),
    }))
  } catch (err) {
    error.value = `Failed to load tickets: ${err.response?.data?.error || err.message}`
    console.error('Load error:', err)
  } finally {
    loading.value = false
  }
}

const loadCustomerOptions = async () => {
  try {
    const response = await api.get(
      `/compose/namespace/${NAMESPACE}/module/${CUSTOMER_MODULE}/record/`
    )
    const rawSet = response.data?.response?.set || []
    customerOptions.value = rawSet.map(r => {
      const v = normalizeValues(r.values)
      return { label: v.name, value: r.recordID }
    })
  } catch (err) {
    console.error('Failed to load customers for dropdown:', err)
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  editingRecordId.value = null
  form.value = emptyTicket()
  showDialog.value = true
}

const openEditDialog = (record) => {
  isEditing.value = true
  editingRecordId.value = record.recordID
  form.value = {
    Subject: record.values.subject || '',
    Description: record.values.description || '',
    Status: record.values.status || 'new',
    Priority: record.values.priority || 'medium',
    'due-date': record.values['due-date'] ? new Date(record.values['due-date']) : null,
    customer: record.values.customer || null,
  }
  showDialog.value = true
}

const buildPayloadValues = () => {
  return [
    { name: 'subject', value: form.value.Subject },
    { name: 'description', value: form.value.Description },
    { name: 'status', value: form.value.Status },
    { name: 'priority', value: form.value.Priority },
    ...(form.value['due-date'] ? [{ name: 'due-date', value: form.value['due-date'].toISOString() }] : []),
    ...(form.value.customer ? [{ name: 'customer', value: form.value.customer }] : []),
  ]
}

const saveTicket = async () => {
  try {
    if (!form.value.Subject.trim()) {
      error.value = 'Subject is required'
      return
    }

    const values = buildPayloadValues()

    if (isEditing.value) {
      await api.post(
        `/compose/namespace/${NAMESPACE}/module/${MODULE}/record/${editingRecordId.value}`,
        { values }
      )
    } else {
      await api.post(
        `/compose/namespace/${NAMESPACE}/module/${MODULE}/record/`,
        { values }
      )
    }

    showDialog.value = false
    error.value = null
    await loadTickets()
  } catch (err) {
    error.value = `Failed to save ticket: ${err.response?.data?.error || err.message}`
    console.error('Save error:', err)
  }
}

const deleteTicket = async (recordId) => {
  try {
    await api.delete(`/compose/namespace/${NAMESPACE}/module/${MODULE}/record/${recordId}`)
    error.value = null
    await loadTickets()
  } catch (err) {
    error.value = `Failed to delete ticket: ${err.response?.data?.error || err.message}`
    console.error('Delete error:', err)
  }
}

const statusClass = (status) => {
  const base = 'inline-block px-2.5 py-1 rounded-md text-xs font-medium'
  const map = {
    new: 'bg-slate-100 text-slate-700',
    'in-progress': 'bg-blue-50 text-blue-700',
    resolved: 'bg-emerald-50 text-emerald-700',
    closed: 'bg-gray-100 text-gray-500',
  }
  return `${base} ${map[status] || 'bg-gray-100 text-gray-700'}`
}

const formatDate = (val) => val ? new Date(val).toLocaleDateString() : '—'

onMounted(() => {
  loadTickets()
  loadCustomerOptions()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-8 gap-4">
      <div class="min-w-0">
        <h1 class="text-3xl font-display font-semibold" style="color: var(--text);">
          Support Tickets
        </h1>
        <p class="mt-1 text-sm" style="color: var(--text-muted);">
          {{ tickets.length }} ticket{{ tickets.length === 1 ? '' : 's' }}
        </p>
      </div>
      <Button
        label="New Ticket"
        icon="pi pi-plus"
        @click="openCreateDialog"
        aria-label="Create new ticket"
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
      <ProgressSpinner aria-label="Loading tickets" style="width: 40px; height: 40px;" strokeWidth="4" />
    </div>

    <template v-else>
      <!-- Empty state -->
      <div
        v-if="tickets.length === 0"
        class="text-center py-16 rounded-lg"
        style="background-color: var(--surface); border: 1px dashed var(--border);"
      >
        <i class="pi pi-inbox text-4xl mb-3" style="color: var(--text-muted);" aria-hidden="true"></i>
        <p class="font-medium" style="color: var(--text);">No tickets yet</p>
        <p class="text-sm mt-1" style="color: var(--text-muted);">Create your first ticket to get started.</p>
      </div>

      <template v-else>
        <!-- Desktop: real table, no PrimeVue responsive stacking -->
        <div class="hidden md:block">
          <DataTable
            :value="tickets"
            :rows="10"
            paginator
            :rowClass="(data) => `priority-row-${data.values.priority}`"
            class="rounded-lg overflow-hidden"
            style="border: 1px solid var(--border);"
          >
            <Column header="Ticket" style="width: 40%">
              <template #body="slotProps">
                <div class="font-medium" style="color: var(--text);">
                  {{ slotProps.data.values.subject }}
                </div>
                <div v-if="customerName(slotProps.data.values.customer)" class="text-xs mt-0.5" style="color: var(--accent);">
                  <i>Customer</i>: {{ customerName(slotProps.data.values.customer) }}
                </div>
                <div
                  v-if="slotProps.data.values.description"
                  class="text-xs mt-0.5"
                  style="color: var(--text-muted);"
                >
                  {{ slotProps.data.values.description }}
                </div>
              </template>
            </Column>
            <Column header="Status" style="width: 15%">
              <template #body="slotProps">
                <span :class="statusClass(slotProps.data.values.status)">
                  {{ statusLabel(slotProps.data.values.status) }}
                </span>
              </template>
            </Column>
            <Column header="Priority" style="width: 15%">
              <template #body="slotProps">
                <span class="inline-flex items-center gap-1.5 text-xs font-medium" style="color: var(--text);">
                  <span
                    class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: priorityDotColor(slotProps.data.values.priority) }"
                    aria-hidden="true"
                  ></span>
                  {{ priorityLabel(slotProps.data.values.priority) }}
                </span>
              </template>
            </Column>
            <Column header="Due" style="width: 15%">
              <template #body="slotProps">
                <span class="text-sm" style="color: var(--text-muted);">
                  {{ formatDate(slotProps.data.values['due-date']) }}
                </span>
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
                    aria-label="Edit ticket"
                    @click="openEditDialog(slotProps.data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    rounded
                    text
                    size="small"
                    severity="danger"
                    aria-label="Delete ticket"
                    @click="deleteTicket(slotProps.data.recordID)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Mobile: hand-built cards, fully our own markup -->
        <div class="md:hidden">
          <div
            v-for="ticket in tickets"
            :key="ticket.recordID"
            class="ticket-card"
            :class="`priority-${ticket.values.priority}`"
          >
            <div class="ticket-card-subject">{{ ticket.values.subject }}</div>
            <div v-if="customerName(ticket.values.customer)" class="text-xs font-medium" style="color: var(--accent); margin-bottom: 0.25rem;">
              <i>Customer:</i> {{ customerName(ticket.values.customer) }}
            </div>
            <div v-if="ticket.values.description" class="ticket-card-desc">
              {{ ticket.values.description }}
            </div>

            <div class="ticket-card-meta">
              <span :class="statusClass(ticket.values.status)">
                {{ statusLabel(ticket.values.status) }}
              </span>
              <span class="inline-flex items-center gap-1.5 text-xs font-medium" style="color: var(--text);">
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: priorityDotColor(ticket.values.priority) }"
                  aria-hidden="true"
                ></span>
                {{ priorityLabel(ticket.values.priority) }}
              </span>
              <span class="text-xs" style="color: var(--text-muted);">
                Due {{ formatDate(ticket.values['due-date']) }}
              </span>
            </div>

            <div class="ticket-card-footer">
              <span class="text-xs" style="color: var(--text-muted);">
                #{{ ticket.recordID.slice(-6) }}
              </span>
              <div class="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  rounded
                  text
                  size="small"
                  aria-label="Edit ticket"
                  @click="openEditDialog(ticket)"
                />
                <Button
                  icon="pi pi-trash"
                  rounded
                  text
                  size="small"
                  severity="danger"
                  aria-label="Delete ticket"
                  @click="deleteTicket(ticket.recordID)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <Dialog
      v-model:visible="showDialog"
      :header="isEditing ? 'Edit Ticket' : 'New Ticket'"
      :modal="true"
      class="w-full max-w-md"
    >
      <div class="space-y-4">
        <div>
          <label for="subject" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Subject <span style="color: var(--priority-urgent);">*</span>
          </label>
          <InputText
            id="subject"
            v-model="form.Subject"
            class="w-full"
            placeholder="Brief summary of the issue"
            autofocus
          />
        </div>

        <div>
          <label for="customer" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Customer
          </label>
          <Dropdown
            id="customer"
            v-model="form.customer"
            :options="customerOptions"
            option-label="label"
            option-value="value"
            placeholder="Select a customer"
            class="w-full"
            showClear
          />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Description
          </label>
          <Textarea
            id="description"
            v-model="form.Description"
            class="w-full"
            placeholder="Additional detail"
            rows="4"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="status" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
              Status
            </label>
            <Dropdown
              id="status"
              v-model="form.Status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>

          <div>
            <label for="priority" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
              Priority
            </label>
            <Dropdown
              id="priority"
              v-model="form.Priority"
              :options="priorityOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
        </div>

        <div>
          <label for="dueDate" class="block text-sm font-medium mb-1.5" style="color: var(--text);">
            Due date
          </label>
          <Calendar
            id="dueDate"
            v-model="form['due-date']"
            class="w-full"
            showIcon
            dateFormat="yy-mm-dd"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" @click="showDialog = false" text />
        <Button label="Save ticket" @click="saveTicket" icon="pi pi-check" />
      </template>
    </Dialog>
  </div>
</template>
// scripts/dev-seed.mjs
//
// Requires only Node.js
//
// Usage: node scripts/dev-seed.mjs <access-token>

const BASE = 'http://localhost:18080/api/compose'
const TOKEN = process.argv[2]

if (!TOKEN) {
  console.error('Usage: node scripts/dev-seed.mjs <access-token>')
  process.exit(1)
}

const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers })
  return res.json()
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return res.json()
}

async function ensureNamespace() {
  console.log("=== Checking for 'Plexys Homework' namespace ===")

  const list = await apiGet('/namespace/')
  const existing = list.response?.set?.find(ns => ns.name === 'Plexys Homework')

  if (existing) {
    console.log(`Namespace exists: ${existing.namespaceID}`)
    return existing.namespaceID
  }

  console.log('Namespace not found. Creating...')
  const created = await apiPost('/namespace/', {
    name: 'Plexys Homework',
    slug: 'plexys-homework',
    enabled: true,
  })

  if (!created.response?.namespaceID) {
    console.error('Failed to create namespace:', JSON.stringify(created, null, 2))
    process.exit(1)
  }

  console.log(`Created namespace: ${created.response.namespaceID}`)
  return created.response.namespaceID
}

async function ensureModule(namespaceID, name, handle, fields) {
  const list = await apiGet(`/namespace/${namespaceID}/module/`)
  const existing = list.response?.set?.find(m => m.name === name)

  if (existing) {
    console.log(`${name} module exists: ${existing.moduleID}`)
    console.log('Checking individual fields...')
    for (const field of fields) {
      await ensureField(namespaceID, existing.moduleID, field)
    }
    return existing.moduleID
  }

  console.log(`${name} module missing. Creating with all fields...`)
  const created = await apiPost(`/namespace/${namespaceID}/module/`, {
    name,
    handle,
    fields,
  })

  if (!created.response?.moduleID) {
    console.error(`Failed to create ${name} module:`, JSON.stringify(created, null, 2))
    process.exit(1)
  }

  console.log(`Created ${name} module: ${created.response.moduleID}`)
  return created.response.moduleID
}

async function ensureField(namespaceID, moduleID, field) {
  const moduleData = await apiGet(`/namespace/${namespaceID}/module/${moduleID}`)
  const currentFields = moduleData.response?.fields || []

  const alreadyExists = currentFields.some(f => f.name === field.name)
  if (alreadyExists) {
    console.log(`  Field '${field.name}' already exists — skipping.`)
    return
  }

  console.log(`  Field '${field.name}' missing — adding...`)

  const updatedPayload = {
    name: moduleData.response.name,
    handle: moduleData.response.handle,
    config: moduleData.response.config,
    meta: moduleData.response.meta,
    labels: moduleData.response.labels,
    fields: [...currentFields, field],
  }

  const result = await apiPost(`/namespace/${namespaceID}/module/${moduleID}`, updatedPayload)

  if (result.response?.moduleID) {
    console.log(`  Added '${field.name}' successfully.`)
  } else {
    console.error(`  Failed to add '${field.name}'. Response:`, JSON.stringify(result, null, 2))
  }
}

// ---- Field definitions ----

const ticketFields = [
  { name: 'subject', kind: 'String', label: 'Subject', isRequired: true },
  { name: 'description', kind: 'String', label: 'Description' },
  {
    name: 'status', kind: 'Select', label: 'Status', isRequired: true,
    options: { options: [
      { value: 'new', text: 'New' },
      { value: 'in-progress', text: 'In Progress' },
      { value: 'resolved', text: 'Resolved' },
      { value: 'closed', text: 'Closed' },
    ] },
  },
  {
    name: 'priority', kind: 'Select', label: 'Priority', isRequired: true,
    options: { options: [
      { value: 'low', text: 'Low' },
      { value: 'medium', text: 'Medium' },
      { value: 'high', text: 'High' },
      { value: 'urgent', text: 'Urgent' },
    ] },
  },
  { name: 'due-date', kind: 'DateTime', label: 'Due Date' },
  {
    name: 'customer', kind: 'Record', label: 'Customer',
    options: { moduleID: 'REPLACE_WITH_CUSTOMER_MODULE_ID' },
  },
]

const customerFields = [
  { name: 'name', kind: 'String', label: 'Name', isRequired: true },
  { name: 'company', kind: 'String', label: 'Company' },
  { name: 'email', kind: 'String', label: 'Email' },
  { name: 'phone', kind: 'String', label: 'Phone' },
]

// ---- Run ----

const namespaceID = await ensureNamespace()
console.log('')
console.log(`=== Checking modules in namespace ${namespaceID} ===`)

const customerModuleID = await ensureModule(namespaceID, 'Customer', 'customer', customerFields)

ticketFields[ticketFields.length - 1].options.moduleID = customerModuleID

const ticketModuleID = await ensureModule(namespaceID, 'Support Ticket', 'support-ticket', ticketFields)

console.log('')
console.log('=== Done ===')
console.log(`Namespace ID:       ${namespaceID}`)
console.log(`Ticket Module ID:   ${ticketModuleID}`)
console.log(`Customer Module ID: ${customerModuleID}`)
console.log('')
console.log('Update these IDs in TicketsPage.vue / CustomersPage.vue if they changed.')
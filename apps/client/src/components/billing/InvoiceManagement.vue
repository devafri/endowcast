<template>
  <div class="invoice-management">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Invoices</h2>
      <button 
        @click="showCreateInvoice = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
      >
        Create Invoice
      </button>
    </div>

    <!-- Invoice List -->
    <div class="bg-white shadow-sm rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Invoice #
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="invoice in invoices" :key="invoice.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              #{{ invoice.id.slice(-8) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ invoice.description || 'Invoice' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${{ invoice.amount.toFixed(2) }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span :class="getStatusClass(invoice.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                {{ invoice.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ invoice.dueDate ? formatDate(invoice.dueDate) : 'No due date' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <div class="flex space-x-2">
                <button 
                  @click="viewInvoice(invoice)"
                  class="text-blue-600 hover:text-blue-900"
                >
                  View
                </button>
                <button 
                  v-if="invoice.status === 'open'"
                  @click="resendInvoice(invoice.id)"
                  class="text-green-600 hover:text-green-900"
                >
                  Resend
                </button>
                <button 
                  v-if="invoice.status === 'open'"
                  @click="markAsPaid(invoice.id)"
                  class="text-purple-600 hover:text-purple-900"
                >
                  Mark Paid
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Invoice Modal -->
    <div v-if="showCreateInvoice" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Invoice</h3>
          
          <form @submit.prevent="createInvoice">
            <div class="space-y-4">
              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Description</label>
                <input 
                  v-model="newInvoice.description"
                  type="text" 
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Invoice description"
                >
              </div>

              <!-- Due Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700">Due Date (Optional)</label>
                <input 
                  v-model="newInvoice.dueDate"
                  type="date" 
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
              </div>

              <!-- Line Items -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
                <div v-for="(item, index) in newInvoice.lineItems" :key="index" class="flex space-x-2 mb-2">
                  <input 
                    v-model="item.description"
                    type="text" 
                    placeholder="Description"
                    class="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                  <input 
                    v-model.number="item.amount"
                    type="number" 
                    step="0.01"
                    placeholder="Amount"
                    class="w-24 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                  <input 
                    v-model.number="item.quantity"
                    type="number" 
                    placeholder="Qty"
                    class="w-16 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                  <button 
                    type="button"
                    @click="removeLineItem(index)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
                <button 
                  type="button"
                  @click="addLineItem"
                  class="text-blue-600 hover:text-blue-900 text-sm"
                >
                  + Add Line Item
                </button>
              </div>

              <!-- Options -->
              <div class="flex items-center space-x-4">
                <label class="flex items-center">
                  <input 
                    v-model="newInvoice.autoAdvance"
                    type="checkbox" 
                    class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  >
                  <span class="ml-2 text-sm text-gray-600">Auto-finalize and charge</span>
                </label>
                <label class="flex items-center">
                  <input 
                    v-model="newInvoice.sendEmail"
                    type="checkbox" 
                    class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  >
                  <span class="ml-2 text-sm text-gray-600">Send email</span>
                </label>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="flex justify-end space-x-3 mt-6">
              <button 
                type="button"
                @click="showCreateInvoice = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button 
                type="submit"
                :disabled="isCreating"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {{ isCreating ? 'Creating...' : 'Create Invoice' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Invoice Modal -->
    <div v-if="selectedInvoice" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
          
          <div class="space-y-4">
            <div>
              <strong>Invoice ID:</strong> #{{ selectedInvoice.id.slice(-8) }}
            </div>
            <div>
              <strong>Description:</strong> {{ selectedInvoice.description }}
            </div>
            <div>
              <strong>Amount:</strong> ${{ selectedInvoice.amount.toFixed(2) }}
            </div>
            <div>
              <strong>Status:</strong> 
              <span :class="getStatusClass(selectedInvoice.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ml-2">
                {{ selectedInvoice.status }}
              </span>
            </div>
            <div v-if="selectedInvoice.dueDate">
              <strong>Due Date:</strong> {{ formatDate(selectedInvoice.dueDate) }}
            </div>
            
            <!-- Stripe Actions -->
            <div v-if="selectedInvoice.stripeDetails?.hostedInvoiceUrl" class="flex space-x-3">
              <a 
                :href="selectedInvoice.stripeDetails.hostedInvoiceUrl" 
                target="_blank"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                View in Stripe
              </a>
              <a 
                v-if="selectedInvoice.stripeDetails.invoicePdf"
                :href="selectedInvoice.stripeDetails.invoicePdf" 
                target="_blank"
                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Download PDF
              </a>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <button 
              @click="selectedInvoice = null"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// State
const invoices = ref([])
const showCreateInvoice = ref(false)
const selectedInvoice = ref(null)
const isCreating = ref(false)

const newInvoice = ref({
  description: '',
  dueDate: '',
  autoAdvance: true,
  sendEmail: true,
  lineItems: [
    { description: '', amount: 0, quantity: 1 }
  ]
})

// Methods
const loadInvoices = async () => {
  try {
    const response = await fetch('/api/invoices', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      invoices.value = data.invoices
    }
  } catch (error) {
    console.error('Failed to load invoices:', error)
  }
}

const createInvoice = async () => {
  if (isCreating.value) return
  
  try {
    isCreating.value = true
    
    const response = await fetch('/api/invoices/create-invoice', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newInvoice.value)
    })
    
    if (response.ok) {
      const data = await response.json()
      await loadInvoices() // Reload list
      showCreateInvoice.value = false
      resetForm()
      
      // Show success message
      alert('Invoice created successfully!')
    } else {
      const error = await response.json()
      alert(`Failed to create invoice: ${error.error}`)
    }
  } catch (error) {
    console.error('Failed to create invoice:', error)
    alert('Failed to create invoice')
  } finally {
    isCreating.value = false
  }
}

const viewInvoice = async (invoice) => {
  try {
    const response = await fetch(`/api/invoices/${invoice.id}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      selectedInvoice.value = data.invoice
    }
  } catch (error) {
    console.error('Failed to load invoice details:', error)
  }
}

const resendInvoice = async (invoiceId) => {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/resend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      alert('Invoice email sent successfully!')
    } else {
      const error = await response.json()
      alert(`Failed to resend invoice: ${error.error}`)
    }
  } catch (error) {
    console.error('Failed to resend invoice:', error)
    alert('Failed to resend invoice')
  }
}

const markAsPaid = async (invoiceId) => {
  if (!confirm('Mark this invoice as paid?')) return
  
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      await loadInvoices() // Reload list
      alert('Invoice marked as paid!')
    } else {
      const error = await response.json()
      alert(`Failed to mark invoice as paid: ${error.error}`)
    }
  } catch (error) {
    console.error('Failed to mark invoice as paid:', error)
    alert('Failed to mark invoice as paid')
  }
}

const addLineItem = () => {
  newInvoice.value.lineItems.push({ description: '', amount: 0, quantity: 1 })
}

const removeLineItem = (index) => {
  newInvoice.value.lineItems.splice(index, 1)
}

const resetForm = () => {
  newInvoice.value = {
    description: '',
    dueDate: '',
    autoAdvance: true,
    sendEmail: true,
    lineItems: [
      { description: '', amount: 0, quantity: 1 }
    ]
  }
}

const getStatusClass = (status) => {
  const classes = {
    draft: 'bg-gray-100 text-gray-800',
    open: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    void: 'bg-red-100 text-red-800',
    uncollectible: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// Load invoices on mount
onMounted(() => {
  loadInvoices()
})
</script>

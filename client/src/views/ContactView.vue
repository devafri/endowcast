<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const name = ref('');
const email = ref('');
const subject = ref((new URLSearchParams(window.location.search)).get('subject') || '');
const message = ref('');
const isLoading = ref(false);
const success = ref('');
const error = ref('');

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

async function submit() {
  isLoading.value = true;
  success.value = '';
  error.value = '';

  try {
    const res = await fetch(`${API_BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.value, email: email.value, subject: subject.value, message: message.value })
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const serverMsg = payload && payload.message ? payload.message : null;
      throw new Error(serverMsg || 'Server returned an error');
    }

    // success: backend accepted (may store even if SMTP not configured)
    success.value = 'Message received — we will reply by email shortly.';
    name.value = '';
    email.value = '';
    subject.value = '';
    message.value = '';
  } catch (err: any) {
    // Provide clearer guidance for dev environments
    console.warn('Contact submit failed:', err?.message || err);
    error.value = 'Unable to send from this environment. You can email support@endowcast.com directly, or run the backend locally and set VITE_API_URL to http://localhost:3001 to enable the form.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
    <div class="max-w-3xl mx-auto p-6">
      <h1 class="text-3xl font-bold mb-4">Contact Sales & Support</h1>
      <p class="text-gray-600 mb-6">Use this form to reach our team. For urgent issues, email <a href="mailto:support@endowcast.com" class="text-blue-600">support@endowcast.com</a>.</p>

      <div v-if="success" class="mb-4 p-4 bg-green-50 border border-green-200 text-green-700">{{ success }}</div>
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700">{{ error }}</div>

      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Name</label>
          <input v-model="name" class="input-field w-full p-3 rounded-md" placeholder="Your name" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input v-model="email" type="email" class="input-field w-full p-3 rounded-md" placeholder="you@org.edu" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Subject</label>
          <input v-model="subject" class="input-field w-full p-3 rounded-md" placeholder="Subject" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Message</label>
          <textarea v-model="message" rows="6" class="input-field w-full p-3 rounded-md" placeholder="Tell us about your needs"></textarea>
        </div>
        <div class="flex items-center gap-4">
          <button type="submit" :disabled="isLoading" class="btn-primary px-6 py-3">Send message</button>
          <button type="button" class="px-6 py-3 bg-gray-100 rounded" @click="router.push('/')">Back to home</button>
        </div>
      </form>
    </div>
  </main>
</template>

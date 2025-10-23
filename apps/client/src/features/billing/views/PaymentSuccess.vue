<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/features/auth/stores/auth';
import { apiService } from '@/shared/services/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const status = ref<'checking' | 'updated' | 'failed' | 'timeout'>('checking');
const attempts = ref(0);
const maxAttempts = 6; // poll for ~12 seconds

async function checkSubscriptionUpdated(prevPlan?: string) {
	try {
		await authStore.refreshCurrentUser();
		const plan = authStore.subscription?.planType || 'FREE';
		if (prevPlan && plan !== prevPlan) {
			status.value = 'updated';
			return true;
		}
		return false;
	} catch (e) {
		console.error('Error refreshing user after payment:', e);
		return false;
	}
}

onMounted(async () => {
	// Capture current plan so we can detect changes
	const prevPlan = authStore.subscription?.planType;
	// If Stripe redirected back with a session_id, optimistically ask the server
	// to confirm the session (this helps local/dev flows where webhooks may lag).
	const sessionId = (route.query.session_id || route.query.sessionId) as string | undefined;
	if (sessionId) {
		try {
			// fire-and-forget; server will upsert if possible. If it fails that's OK
			// because the webhook is still the source of truth.
			await apiService.post('/billing/confirm-session', { sessionId });
			console.log('Requested server confirm-session for', sessionId);
		} catch (e) {
			console.warn('confirm-session request failed (webhook may still process):', e);
		}
	}

	// First refresh immediately (some setups update synchronously)
	const ok = await checkSubscriptionUpdated(prevPlan);
	if (ok) return;

	// Poll for webhook propagation (if backend updates via Stripe webhook)
	const interval = setInterval(async () => {
		attempts.value += 1;
		const success = await checkSubscriptionUpdated(prevPlan);
		if (success) {
			clearInterval(interval);
			return;
		}
		if (attempts.value >= maxAttempts) {
			clearInterval(interval);
			status.value = 'timeout';
		}
	}, 2000);
});

function goToSettings() {
	router.push({ name: 'Settings' });
}

function reloadPage() {
	// Use global window object to reload; called from template
	window.location.reload();
}
</script>

<template>
	<div class="max-w-3xl mx-auto px-4 py-12">
		<div class="bg-white rounded-lg shadow p-8 text-center">
			<h1 class="text-2xl font-semibold mb-4">Payment successful 🎉</h1>
			<p class="text-gray-600 mb-6">Thanks — we received your payment. We're updating your subscription now.</p>

			<div v-if="status === 'checking'" class="space-y-3">
				<div class="text-sm text-gray-500">Checking for subscription update...</div>
				<div class="mx-auto w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
			</div>

			<div v-else-if="status === 'updated'" class="space-y-3">
				<div class="text-lg font-medium text-green-600">Your plan has been updated.</div>
				<div class="text-sm text-gray-600">You can manage billing and see your new limits in Settings.</div>
			</div>

			<div v-else-if="status === 'timeout'" class="space-y-3">
				<div class="text-lg font-medium text-yellow-700">We're still processing your subscription.</div>
				<div class="text-sm text-gray-600">If your plan doesn't update within a minute, check your billing page or contact support.</div>
			</div>

			<div v-else-if="status === 'failed'" class="space-y-3">
				<div class="text-lg font-medium text-red-600">We couldn't confirm the subscription update.</div>
				<div class="text-sm text-gray-600">Please contact support or try refreshing the page later.</div>
			</div>

			<div class="mt-6 flex justify-center gap-3">
				<button @click="goToSettings" class="px-4 py-2 bg-indigo-600 text-white rounded-md">Go to Settings</button>
				<button @click="reloadPage" class="px-4 py-2 border rounded-md">Refresh</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* small spinner fallback */
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>


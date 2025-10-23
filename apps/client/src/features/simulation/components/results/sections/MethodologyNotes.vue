<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  results: any;
}>();
</script>
<template>
     <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        <h3 class="text-xl font-bold mb-3">Methodology & Notes</h3> <ul class="list-disc pl-5 text-base text-slate-600 space-y-2"> <li>Monte Carlo uses <strong>portfolio‑level normal</strong> returns with μ and σ derived from asset class assumptions + correlation matrix applied to policy weights.</li>
          <li>Spending model for charts: grants = <span class="tabnums">5%</span> of start‑of‑year endowment; operating expenses = <span class="tabnums">1%</span>.</li>
          <li>Nominal/Real toggle updates the bands chart, spending chart, tail values, and grants/opex table.</li>
          <li>CVaR 95% shown as both <strong>average final value</strong> in the worst 5% and equivalent <strong>average loss</strong> vs initial.</li>
        </ul>
      </section>
</template>
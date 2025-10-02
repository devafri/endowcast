import { percentile } from './analytics';

export interface NarrativeInsight {
  type: 'risk' | 'opportunity' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems?: string[];
}

export function generateNarrativeInsights(
  results: { simulations: number[][] },
  inputs: { initialEndowment: number; spendingPolicyRate: number },
  riskMetrics: { cvar95: number; principalLossProb: number; maxDrawdown: number; drawdownAnalysis: { maxDrawdownYear: number } }
): NarrativeInsight[] {
  const insights: NarrativeInsight[] = [];
  const years = results.simulations[0]?.length ?? 10;

  if (riskMetrics.principalLossProb > 0.3) {
    insights.push({
      type: 'risk',
      priority: 'high',
      title: `High Principal Risk: ${(riskMetrics.principalLossProb * 100).toFixed(0)}% Chance of Loss`,
      description: `Your endowment has a ${(riskMetrics.principalLossProb * 100).toFixed(0)}% chance of losing principal over ${years} years.`,
      actionItems: [
        'Consider reducing equity allocation to lower volatility',
        'Evaluate reducing spending policy rate',
        'Review portfolio diversification strategy'
      ]
    });
  } else if (riskMetrics.principalLossProb > 0.1) {
    insights.push({
      type: 'risk',
      priority: 'medium',
      title: `Moderate Principal Risk: ${(riskMetrics.principalLossProb * 100).toFixed(0)}% Chance of Loss`,
      description: `Your endowment has a ${(riskMetrics.principalLossProb * 100).toFixed(0)}% chance of losing principal over ${years} years.`,
    });
  }

  const finalValues = results.simulations.map(sim => sim[years - 1]);
  const medianGrowth = (percentile(finalValues, 50) / inputs.initialEndowment - 1) * 100;
  if (medianGrowth > 25) {
    insights.push({
      type: 'opportunity',
      priority: 'medium',
      title: `Strong Growth Potential: ${medianGrowth.toFixed(0)}% Median Growth`,
      description: `Your portfolio allocation shows strong growth potential with median ${medianGrowth.toFixed(0)}% growth over ${years} years.`,
    });
  }

  const cvarLoss = (inputs.initialEndowment - riskMetrics.cvar95) / inputs.initialEndowment * 100;
  if (cvarLoss > 30) {
    insights.push({
      type: 'risk',
      priority: 'high',
      title: `Extreme Tail Risk: 5% Worst Cases Show ${cvarLoss.toFixed(0)}% Loss`,
      description: `In the worst 5% of scenarios, your endowment could lose ${cvarLoss.toFixed(0)}% of its value.`,
      actionItems: [
        'Consider tail-risk hedging strategies',
        'Stress test spending policies under adverse scenarios',
        'Review crisis management procedures'
      ]
    });
  }

  if (inputs.spendingPolicyRate > 5.5) {
    insights.push({
      type: 'risk',
      priority: 'medium',
      title: `Elevated Spending Rate: ${inputs.spendingPolicyRate.toFixed(1)}% May Be Unsustainable`,
      description: `Your ${inputs.spendingPolicyRate.toFixed(1)}% spending rate is above the typical 4-5% range for endowments.`,
      actionItems: [
        'Consider reducing spending rate to 5% or lower',
        'Implement spending smoothing to reduce volatility',
        'Evaluate essential vs. discretionary spending categories'
      ]
    });
  }

  return insights;
}

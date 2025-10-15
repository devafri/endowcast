#!/bin/bash

# Enhanced script to fix cross-feature imports after refactoring

echo "🔄 Fixing cross-feature imports..."

CLIENT_SRC="/Users/felixisuk/Desktop/Coding_Projects/endowment-commerical/apps/client/src"

# Fix imports in organization views (they use simulation components)
sed -i '' 's|import GrantTargets from '\''../components/inputs/GrantTargets.vue'\''|import GrantTargets from '\''../../simulation/components/inputs/GrantTargets.vue'\''|g' "$CLIENT_SRC/features/organization/views/SettingsView.vue"
sed -i '' 's|import CorrelationMatrix from '\''../components/inputs/CorrelationMatrix.vue'\''|import CorrelationMatrix from '\''../../simulation/components/inputs/CorrelationMatrix.vue'\''|g' "$CLIENT_SRC/features/organization/views/SettingsView.vue"
sed -i '' 's|import { assetClasses } from '\''../lib/monteCarlo'\''|import { assetClasses } from '\''../../simulation/lib/monteCarlo'\''|g' "$CLIENT_SRC/features/organization/views/SettingsView.vue"
sed -i '' 's|import { useSimulationStore } from '\''../stores/simulation'\''|import { useSimulationStore } from '\''../../simulation/stores/simulation'\''|g' "$CLIENT_SRC/features/organization/views/SettingsView.vue"
sed -i '' 's|import { useAuthStore } from '\''../stores/auth'\''|import { useAuthStore } from '\''../../auth/stores/auth'\''|g' "$CLIENT_SRC/features/organization/views/SettingsView.vue"

# Fix imports in OrganizationView.vue
sed -i '' 's|import { useAuthStore } from '\''../stores/auth'\''|import { useAuthStore } from '\''../../auth/stores/auth'\''|g' "$CLIENT_SRC/features/organization/views/OrganizationView.vue"

# Fix any remaining relative imports that need cross-feature access
find "$CLIENT_SRC/features" -name "*.vue" -exec sed -i '' 's|from '\''../stores/auth'\''|from '\''../../auth/stores/auth'\''|g' {} \;
find "$CLIENT_SRC/features" -name "*.vue" -exec sed -i '' 's|from '\''../stores/simulation'\''|from '\''../../simulation/stores/simulation'\''|g' {} \;

# Fix shared component imports in layout components
sed -i '' 's|from '\''@/stores/|from '\''@/shared/stores/|g' "$CLIENT_SRC/shared/components/layout/TheHeader.vue"
sed -i '' 's|from '\''@/features/auth/stores/auth'\''|from '\''../../features/auth/stores/auth'\''|g' "$CLIENT_SRC/shared/components/layout/TheHeader.vue"

echo "✅ Cross-feature import fixes completed!"

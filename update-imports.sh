#!/bin/bash

# Script to update import paths after refactoring

echo "🔄 Updating import paths for feature-based structure..."

# Define the client src directory
CLIENT_SRC="/Users/felixisuk/Desktop/Coding_Projects/endowment-commerical/apps/client/src"

# Update imports in all Vue and TypeScript files
find "$CLIENT_SRC" -name "*.vue" -o -name "*.ts" | while read file; do
    echo "Processing: $file"
    
    # Update component imports
    sed -i '' 's|@/components/ui/|@/shared/components/ui/|g' "$file"
    sed -i '' 's|@/components/layout/|@/shared/components/layout/|g' "$file"
    sed -i '' 's|@/components/inputs/|@/features/simulation/components/inputs/|g' "$file"
    sed -i '' 's|@/components/results/|@/features/simulation/components/results/|g' "$file"
    
    # Update store imports
    sed -i '' 's|@/stores/auth|@/features/auth/stores/auth|g' "$file"
    sed -i '' 's|@/stores/simulation|@/features/simulation/stores/simulation|g' "$file"
    sed -i '' 's|@/stores/|@/shared/stores/|g' "$file"
    
    # Update service imports
    sed -i '' 's|@/services/|@/shared/services/|g' "$file"
    
    # Update utility imports
    sed -i '' 's|@/utils/|@/shared/utils/|g' "$file"
    
    # Update lib imports
    sed -i '' 's|@/lib/|@/features/simulation/lib/|g' "$file"
    
    # Update relative imports for components
    sed -i '' 's|\.\.\/components\/ui\/|../../shared/components/ui/|g' "$file"
    sed -i '' 's|\.\.\/components\/layout\/|../../shared/components/layout/|g' "$file"
    sed -i '' 's|\.\.\/components\/inputs\/|../components/inputs/|g' "$file"
    sed -i '' 's|\.\.\/components\/results\/|../components/results/|g' "$file"
    
    # Update relative imports for lib
    sed -i '' 's|\.\.\/lib\/|../lib/|g' "$file"
    
    # Update view imports in non-router files
    sed -i '' 's|\.\.\/views\/LoginView|../auth/views/LoginView|g' "$file"
    sed -i '' 's|\.\.\/views\/SignupView|../auth/views/SignupView|g' "$file"
    sed -i '' 's|\.\.\/views\/SimulationView|../simulation/views/SimulationView|g' "$file"
    
done

echo "✅ Import path updates completed!"

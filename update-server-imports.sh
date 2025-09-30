#!/bin/bash

# Script to update import paths after server refactoring

echo "🔄 Updating server import paths for domain structure..."

SERVER_SRC="/Users/felixisuk/Desktop/Coding_Projects/endowment-commerical/apps/server/src"

# Fix auth middleware imports in billing routes
sed -i '' 's|require('\''../middleware/auth'\'')|require('\''../../auth/middleware/auth'\'')|g' "$SERVER_SRC/features/billing/routes/payments.js"

# Fix auth middleware imports in user routes  
sed -i '' 's|require('\''../middleware/auth'\'')|require('\''../../auth/middleware/auth'\'')|g' "$SERVER_SRC/features/users/routes/users.js"

# Fix auth middleware imports in organization routes
sed -i '' 's|require('\''../middleware/auth'\'')|require('\''../../auth/middleware/auth'\'')|g' "$SERVER_SRC/features/organizations/routes/organization.js"

# Fix any service imports
find "$SERVER_SRC/features" -name "*.js" -exec sed -i '' 's|require('\''../services/emailService'\'')|require('\''../../../infrastructure/email/emailService'\'')|g' {} \;

# Fix any other service imports
find "$SERVER_SRC/features" -name "*.js" -exec sed -i '' 's|require('\''../services/securityService'\'')|require('\''../services/securityService'\'')|g' {} \;

echo "✅ Server import path updates completed!"

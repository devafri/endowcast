const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
const userId = process.env.USER_ID;
const orgId = process.env.ORG_ID;
if (!secret) { console.error('JWT_SECRET missing'); process.exit(2); }
if (!userId || !orgId) { console.error('USER_ID or ORG_ID missing'); process.exit(2); }
const token = jwt.sign({ userId, organizationId: orgId }, secret);
console.log(token);

const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET missing');
  process.exit(2);
}
const token = jwt.sign({ userId: 'local_test_user', organizationId: 'local_org' }, secret);
console.log(token);

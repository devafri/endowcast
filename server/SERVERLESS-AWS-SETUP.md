# Serverless AWS Deployment for EndowCast (Cost-Optimized)

## Architecture: Lambda + RDS Serverless V2

```
Frontend (S3) → API Gateway → Lambda Functions → RDS Serverless V2 PostgreSQL
```

## True Serverless Costs (Pay-per-use)

### Cost Breakdown

| Service | Free Tier | After Free Tier | Zero Usage Cost |
|---------|-----------|-----------------|-----------------|
| Lambda | 1M requests/month | $0.20 per 1M requests | $0 |
| API Gateway | 1M requests/month | $3.50 per 1M requests | $0 |
| RDS Serverless V2 | None | $0.50/hour active, paused=free | $3-5/month storage |
| S3 Storage | 5GB | $0.023/GB/month | $0.50/month |
| CloudWatch Logs | 5GB | $0.50/GB/month | $1-2/month |
| **TOTAL** | **FREE** | **Usage-based** | **$4-8/month** |

### Usage Examples

**100 users, 1K API calls/month**: $0/month (within free tier)
**1,000 users, 50K API calls/month**: $5-10/month
**10,000 users, 500K API calls/month**: $25-50/month

## Implementation Strategy

### 1. Convert Express.js to Lambda Functions

Create `server/src/lambda/`:

```javascript
// server/src/lambda/auth.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Prisma with connection pooling for Lambda
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

exports.login = async (event, context) => {
  // Lambda function stays warm for reuse
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const { email, password } = JSON.parse(event.body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, planType: user.planType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          planType: user.planType,
          organization: user.organization
        }
      })
    };
    
  } catch (error) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

exports.register = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    const { email, password, firstName, lastName, organization } = JSON.parse(event.body);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.FRONTEND_URL
        },
        body: JSON.stringify({ error: 'User already exists' })
      };
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        organization,
        planType: 'FREE_TRIAL'
      }
    });
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, planType: user.planType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL,
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          planType: user.planType,
          organization: user.organization
        }
      })
    };
    
  } catch (error) {
    console.error('Registration error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL
      },
      body: JSON.stringify({ error: 'Registration failed' })
    };
  }
};
```

### 2. Serverless Framework Configuration

Create `server/serverless.yml`:

```yaml
service: endowcast-backend

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  
  # Lambda function configuration
  timeout: 30
  memorySize: 512
  
  # Environment variables
  environment:
    DATABASE_URL: ${ssm:/endowcast/${self:provider.stage}/database-url}
    JWT_SECRET: ${ssm:/endowcast/${self:provider.stage}/jwt-secret}
    JWT_EXPIRES_IN: 7d
    FRONTEND_URL: ${ssm:/endowcast/${self:provider.stage}/frontend-url}
  
  # IAM permissions
  iamRoleStatements:
    - Effect: Allow
      Action:
        - rds-data:ExecuteStatement
        - rds-data:BatchExecuteStatement
        - rds-data:BeginTransaction
        - rds-data:CommitTransaction
        - rds-data:RollbackTransaction
      Resource: "*"

# Package configuration
package:
  exclude:
    - node_modules/aws-sdk/**
    - .git/**
    - README.md
    - .env*

# Lambda functions
functions:
  # Auth functions
  login:
    handler: src/lambda/auth.login
    events:
      - http:
          path: auth/login
          method: post
          cors:
            origin: ${self:provider.environment.FRONTEND_URL}
            credentials: true
  
  register:
    handler: src/lambda/auth.register
    events:
      - http:
          path: auth/register
          method: post
          cors:
            origin: ${self:provider.environment.FRONTEND_URL}
            credentials: true
  
  # User functions
  getUserProfile:
    handler: src/lambda/users.getProfile
    events:
      - http:
          path: users/profile
          method: get
          cors:
            origin: ${self:provider.environment.FRONTEND_URL}
            credentials: true
  
  # Simulation functions
  createSimulation:
    handler: src/lambda/simulations.create
    timeout: 60  # Longer timeout for Monte Carlo calculations
    memorySize: 1024  # More memory for calculations
    events:
      - http:
          path: simulations
          method: post
          cors:
            origin: ${self:provider.environment.FRONTEND_URL}
            credentials: true
  
  getSimulations:
    handler: src/lambda/simulations.list
    events:
      - http:
          path: simulations
          method: get
          cors:
            origin: ${self:provider.environment.FRONTEND_URL}
            credentials: true

# CloudFormation resources
resources:
  Resources:
    # RDS Serverless V2 Cluster
    DatabaseCluster:
      Type: AWS::RDS::DBCluster
      Properties:
        DatabaseName: endowcast
        Engine: aurora-postgresql
        EngineVersion: 13.7
        EngineMode: provisioned
        ServerlessV2ScalingConfiguration:
          MinCapacity: 0.5  # Auto-pauses when not used
          MaxCapacity: 16   # Scales up under load
        MasterUsername: endowcast_admin
        MasterUserPassword: ${ssm:/endowcast/${self:provider.stage}/db-password}
        BackupRetentionPeriod: 7
        DeletionProtection: true
        StorageEncrypted: true
        VpcSecurityGroupIds:
          - Ref: DatabaseSecurityGroup
        DBSubnetGroupName:
          Ref: DatabaseSubnetGroup
    
    # Database instance
    DatabaseInstance:
      Type: AWS::RDS::DBInstance
      Properties:
        DBInstanceClass: db.serverless
        DBClusterIdentifier:
          Ref: DatabaseCluster
        Engine: aurora-postgresql
    
    # Security group for database
    DatabaseSecurityGroup:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Security group for RDS database
        VpcId: ${cf:${self:service}-vpc-${self:provider.stage}.VpcId}
        SecurityGroupIngress:
          - IpProtocol: tcp
            FromPort: 5432
            ToPort: 5432
            SourceSecurityGroupId:
              Ref: LambdaSecurityGroup

# Plugins
plugins:
  - serverless-offline
  - serverless-dotenv-plugin
  - serverless-prune-plugin

# Custom configuration
custom:
  prune:
    automatic: true
    number: 3
```

### 3. Database Configuration for Serverless

Update `server/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Enable connection pooling for serverless
  relationMode = "prisma"
}

generator client {
  provider = "prisma-client-js"
  // Enable edge runtime for faster cold starts
  previewFeatures = ["jsonProtocol"]
}
```

### 4. Lambda Deployment Scripts

Create `server/package.json` scripts:

```json
{
  "scripts": {
    "deploy:dev": "serverless deploy --stage dev",
    "deploy:prod": "serverless deploy --stage prod",
    "invoke:local": "serverless invoke local --function login",
    "logs": "serverless logs --function login --tail",
    "remove": "serverless remove",
    "db:migrate": "npx prisma migrate deploy",
    "db:generate": "npx prisma generate"
  },
  "devDependencies": {
    "serverless": "^3.34.0",
    "serverless-offline": "^12.0.4",
    "serverless-dotenv-plugin": "^4.0.2",
    "serverless-prune-plugin": "^2.0.2"
  }
}
```

### 5. Cold Start Optimization

```javascript
// server/src/utils/prisma.js
const { PrismaClient } = require('@prisma/client');

// Global variable to reuse database connections
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: ['error'],
  });
} else {
  // In development, use a global variable to preserve the instance
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
```

## Cost Comparison: Serverless vs Traditional

### Traditional ECS Fargate
```
✅ Predictable costs
❌ Always running = $30-50/month minimum
❌ Manual scaling configuration
```

### True Serverless (Lambda + RDS Serverless)
```
✅ $0 at zero usage (except $3-5/month storage)
✅ Automatic scaling (0 to thousands of concurrent users)
✅ Pay only for actual usage
❌ Cold start latency (500ms-2s first request)
❌ 15-minute maximum execution time
```

## Recommended Hybrid Approach

### For Your EndowCast Use Case:

1. **MVP Stage**: Pure serverless (Lambda + RDS Serverless V2)
   - Cost: $5-20/month for first 1000 users
   - Zero infrastructure management

2. **Growth Stage**: Keep serverless, optimize cold starts
   - Add CloudWatch scheduled events to keep functions warm
   - Use RDS Proxy for connection pooling

3. **Scale Stage**: Hybrid approach
   - Keep auth/CRUD operations on Lambda
   - Move intensive Monte Carlo simulations to ECS Fargate
   - Use SQS queues for async processing

## Quick Start Deployment

```bash
# Install Serverless Framework
npm install -g serverless

# Setup AWS credentials
aws configure

# Deploy to development
cd server
npm install
serverless deploy --stage dev

# Deploy to production  
serverless deploy --stage prod
```

## Real Usage Costs Examples

**Typical SaaS with 1,000 active users:**
- 50,000 API calls/month
- Database active 8 hours/day
- **Monthly cost**: $15-25 (vs $150+ for always-on containers)

**During quiet periods (nights/weekends):**
- Database automatically pauses
- Zero Lambda costs
- **Cost**: $0/hour when inactive

The serverless approach is perfect for EndowCast because most endowment modeling happens during business hours, and you'll have natural quiet periods when costs drop to near zero.

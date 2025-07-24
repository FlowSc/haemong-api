# Multi-Environment Deployment Guide

## 🌍 Environment Overview

This project supports three environments with different configurations:

| Environment | Purpose | Logging | Rate Limits | Security |
|-------------|---------|---------|-------------|----------|
| **Development** | Local development | Debug level, Console only | Lenient (20/sec) | Relaxed |
| **QA** | Testing & Staging | Info level, Files + Console | Medium (15/sec) | Production-like |
| **Production** | Live service | Warn level, Files + Console | Strict (10/sec) | Maximum |

---

## 🚀 Quick Deployment

### 1. Create Heroku Apps

```bash
# Production app
heroku create haemong-api-prod

# QA app  
heroku create haemong-api-qa

# Development app (optional)
heroku create haemong-api-dev
```

### 2. Deploy to Each Environment

#### Production Deployment
```bash
# Set production environment
heroku config:set NODE_ENV=production -a haemong-api-prod

# Copy production Procfile
cp Procfile.production Procfile

# Set production environment variables (see below)
# Deploy
git push https://git.heroku.com/haemong-api-prod.git main
```

#### QA Deployment
```bash
# Set QA environment
heroku config:set NODE_ENV=qa -a haemong-api-qa

# Copy QA Procfile
cp Procfile.qa Procfile

# Set QA environment variables (see below)
# Deploy
git push https://git.heroku.com/haemong-api-qa.git main
```

---

## ⚙️ Environment Variables by Environment

### 🏭 Production Environment Variables

```bash
APP_NAME="haemong-api-prod"

# Basic Configuration
heroku config:set NODE_ENV=production -a $APP_NAME
heroku config:set LOG_LEVEL=warn -a $APP_NAME

# Database (Production Supabase)
heroku config:set SUPABASE_URL=https://your-prod-project.supabase.co -a $APP_NAME
heroku config:set SUPABASE_ANON_KEY=your_prod_anon_key -a $APP_NAME
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_prod_service_role_key -a $APP_NAME

# JWT (CHANGE THESE!)
heroku config:set JWT_SECRET=your_super_secure_jwt_secret_production -a $APP_NAME
heroku config:set JWT_REFRESH_SECRET=your_super_secure_refresh_secret_production -a $APP_NAME

# OAuth (Production)
heroku config:set GOOGLE_CLIENT_ID=your_prod_google_client_id -a $APP_NAME
heroku config:set GOOGLE_CLIENT_SECRET=your_prod_google_client_secret -a $APP_NAME

# External APIs
heroku config:set OPENAI_API_KEY=your_openai_api_key -a $APP_NAME
heroku config:set OPENAI_MODEL=gpt-4 -a $APP_NAME
heroku config:set REPLICATE_API_TOKEN=your_replicate_api_token -a $APP_NAME

# Frontend
heroku config:set FRONTEND_URL=https://your-production-domain.com -a $APP_NAME

# Rate Limiting (Strict)
heroku config:set RATE_LIMIT_SHORT_LIMIT=10 -a $APP_NAME
heroku config:set RATE_LIMIT_MEDIUM_LIMIT=100 -a $APP_NAME
heroku config:set RATE_LIMIT_LONG_LIMIT=1000 -a $APP_NAME

# Security
heroku config:set ENABLE_CORS=true -a $APP_NAME
heroku config:set ENABLE_HELMET=true -a $APP_NAME
heroku config:set ENABLE_VALIDATION=true -a $APP_NAME

# Production Specific
heroku config:set SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id -a $APP_NAME
```

### 🧪 QA Environment Variables

```bash
APP_NAME="haemong-api-qa"

# Basic Configuration
heroku config:set NODE_ENV=qa -a $APP_NAME
heroku config:set LOG_LEVEL=info -a $APP_NAME

# Database (QA Supabase)
heroku config:set SUPABASE_URL=https://your-qa-project.supabase.co -a $APP_NAME
heroku config:set SUPABASE_ANON_KEY=your_qa_anon_key -a $APP_NAME
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_qa_service_role_key -a $APP_NAME

# JWT (QA)
heroku config:set JWT_SECRET=your_qa_jwt_secret -a $APP_NAME
heroku config:set JWT_REFRESH_SECRET=your_qa_refresh_secret -a $APP_NAME

# OAuth (QA)
heroku config:set GOOGLE_CLIENT_ID=your_qa_google_client_id -a $APP_NAME
heroku config:set GOOGLE_CLIENT_SECRET=your_qa_google_client_secret -a $APP_NAME

# External APIs (Same as production or test keys)
heroku config:set OPENAI_API_KEY=your_openai_api_key -a $APP_NAME
heroku config:set OPENAI_MODEL=gpt-3.5-turbo -a $APP_NAME
heroku config:set REPLICATE_API_TOKEN=your_replicate_api_token -a $APP_NAME

# Frontend (QA)
heroku config:set FRONTEND_URL=https://your-qa-frontend.herokuapp.com -a $APP_NAME

# Rate Limiting (Medium)
heroku config:set RATE_LIMIT_SHORT_LIMIT=15 -a $APP_NAME
heroku config:set RATE_LIMIT_MEDIUM_LIMIT=150 -a $APP_NAME
heroku config:set RATE_LIMIT_LONG_LIMIT=1500 -a $APP_NAME

# QA Specific
heroku config:set QA_TEST_USER_EMAIL=qa-test@example.com -a $APP_NAME
heroku config:set QA_ADMIN_EMAIL=qa-admin@example.com -a $APP_NAME
```

### 🛠️ Development Environment Variables

```bash
APP_NAME="haemong-api-dev"

# Basic Configuration
heroku config:set NODE_ENV=development -a $APP_NAME
heroku config:set LOG_LEVEL=debug -a $APP_NAME

# Database (Development Supabase)
heroku config:set SUPABASE_URL=https://your-dev-project.supabase.co -a $APP_NAME
heroku config:set SUPABASE_ANON_KEY=your_dev_anon_key -a $APP_NAME
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key -a $APP_NAME

# JWT (Development - less secure is OK)
heroku config:set JWT_SECRET=dev_jwt_secret -a $APP_NAME
heroku config:set JWT_REFRESH_SECRET=dev_refresh_secret -a $APP_NAME

# Rate Limiting (Lenient)
heroku config:set RATE_LIMIT_SHORT_LIMIT=20 -a $APP_NAME
heroku config:set RATE_LIMIT_MEDIUM_LIMIT=200 -a $APP_NAME
heroku config:set RATE_LIMIT_LONG_LIMIT=2000 -a $APP_NAME

# Frontend (Development)
heroku config:set FRONTEND_URL=http://localhost:3000 -a $APP_NAME
```

---

## 🔧 Environment-Specific Features

### Development Features
- **Enhanced Logging**: Debug level with full stack traces
- **Lenient Rate Limits**: 20 requests/second for easy testing
- **CORS**: Allows localhost origins
- **Console Logging**: No file logging to reduce I/O

### QA Features
- **Production-like Settings**: Same security as production
- **Enhanced Logging**: Info level with file logging
- **Test User Accounts**: Pre-configured test accounts
- **Medium Rate Limits**: 15 requests/second

### Production Features
- **Maximum Security**: HSTS, strict CSP headers
- **Minimal Logging**: Warn level only, full file logging
- **Strict Rate Limits**: 10 requests/second
- **Sentry Integration**: Error tracking and monitoring
- **GPT-4**: Uses more advanced AI model

---

## 📊 Monitoring & Logs

### View Environment-Specific Logs

```bash
# Production logs
heroku logs --tail -a haemong-api-prod

# QA logs
heroku logs --tail -a haemong-api-qa

# Filter by environment
heroku logs --tail -a haemong-api-prod | grep "\[PRODUCTION\]"
```

### Log Files (QA & Production)
- `logs/production-error.log`
- `logs/production-combined.log`
- `logs/qa-error.log`
- `logs/qa-combined.log`

---

## 🔍 Environment Verification

### Check Current Environment
```bash
# Via API
curl https://your-app.herokuapp.com/

# Check response headers
curl -I https://your-app.herokuapp.com/
# Look for: X-Environment: production
```

### Environment-Specific Behavior

| Feature | Development | QA | Production |
|---------|-------------|----|-----------| 
| Rate Limit | 20/sec | 15/sec | 10/sec |
| Log Level | debug | info | warn |
| Error Messages | Detailed | Detailed | Generic |
| Stack Traces | Yes | Yes | No |
| File Logging | No | Yes | Yes |
| HSTS Headers | No | No | Yes |

---

## 🚨 Troubleshooting

### Environment Not Loading
```bash
# Check environment variables
heroku config -a your-app-name

# Check if .env files exist
heroku run ls -la -a your-app-name

# Force environment
heroku config:set NODE_ENV=production -a your-app-name
```

### Configuration Validation Errors
```bash
# Check application logs for validation errors
heroku logs --tail -a your-app-name | grep "Configuration validation failed"

# Common issues:
# - Missing SUPABASE_URL
# - Missing JWT secrets
# - Invalid environment value
```

### Database Connection Issues
```bash
# Verify Supabase credentials per environment
heroku run node -e "console.log(process.env.SUPABASE_URL)" -a your-app-name
```

---

## 📋 Deployment Checklist

### Before Deploying
- [ ] Environment variables configured
- [ ] Database migrated (if needed)
- [ ] Correct Procfile copied
- [ ] Frontend URL updated
- [ ] OAuth redirects configured

### After Deploying
- [ ] Check application starts successfully
- [ ] Verify environment in logs
- [ ] Test rate limiting
- [ ] Verify CORS with frontend
- [ ] Test OAuth flows
- [ ] Monitor error rates

---

## 🔄 CI/CD Pipeline (Future Enhancement)

```yaml
# .github/workflows/deploy.yml example
name: Deploy to Environments

on:
  push:
    branches: [main, qa, development]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: |
          cp Procfile.production Procfile
          git push https://git.heroku.com/haemong-api-prod.git main
```

---

Your environments will be available at:
- **Production**: `https://haemong-api-prod.herokuapp.com`
- **QA**: `https://haemong-api-qa.herokuapp.com`  
- **Development**: `https://haemong-api-dev.herokuapp.com`

Each environment will automatically load its respective configuration and behave according to its designated purpose! 🎯
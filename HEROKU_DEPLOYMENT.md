# Heroku Deployment Guide

## 🚀 Quick Deploy

### 1. Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows/Linux
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login and Create App
```bash
heroku login
heroku create your-app-name
```

### 3. Set Environment Variables
```bash
# Database (Supabase)
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_ANON_KEY=your_supabase_anon_key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Secrets
heroku config:set JWT_SECRET=your_jwt_secret_key
heroku config:set JWT_EXPIRES_IN=24h
heroku config:set JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
heroku config:set JWT_REFRESH_EXPIRES_IN=7d

# OAuth (Google)
heroku config:set GOOGLE_CLIENT_ID=your_google_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_google_client_secret

# OAuth (Apple) - Optional
heroku config:set APPLE_CLIENT_ID=your_apple_client_id
heroku config:set APPLE_TEAM_ID=your_apple_team_id
heroku config:set APPLE_KEY_ID=your_apple_key_id
heroku config:set APPLE_PRIVATE_KEY_PATH=path_to_apple_private_key

# OpenAI
heroku config:set OPENAI_API_KEY=your_openai_api_key
heroku config:set OPENAI_MODEL=gpt-3.5-turbo

# Replicate (Video Generation)
heroku config:set REPLICATE_API_TOKEN=your_replicate_api_token

# Frontend URL
heroku config:set FRONTEND_URL=https://your-frontend-domain.com

# Production Environment
heroku config:set NODE_ENV=production
heroku config:set LOG_LEVEL=info
```

### 4. Deploy
```bash
git add .
git commit -m "Add security and logging systems for production"
git push heroku main
```

### 5. Check Logs
```bash
heroku logs --tail
```

## 🔧 Configuration Details

### Security Settings
- **Rate Limiting**: 10/sec, 100/min, 1000/15min
- **CORS**: Configured for your frontend domain
- **Helmet**: Security headers enabled
- **Input Validation**: Enabled with class-validator

### Logging
- **Winston**: Structured logging with multiple transports
- **Log Levels**: error, warn, info, debug
- **Request Logging**: All HTTP requests logged with request ID
- **Error Tracking**: Full stack traces in development

### Performance
- **Trust Proxy**: Enabled for Heroku's load balancer
- **Compression**: Enabled for responses
- **Validation**: Optimized for production

## 🛠 Troubleshooting

### Common Issues

1. **App Crash on Startup**
   ```bash
   heroku logs --tail
   # Check for missing environment variables
   ```

2. **Database Connection Issues**
   ```bash
   # Verify Supabase URLs and keys
   heroku config
   ```

3. **CORS Errors**
   ```bash
   # Make sure FRONTEND_URL is set correctly
   heroku config:set FRONTEND_URL=https://your-actual-frontend-domain.com
   ```

4. **Rate Limiting Too Strict**
   ```bash
   # Temporarily disable for testing
   # Comment out ThrottlerGuard in app.module.ts
   ```

### Health Check
Once deployed, test these endpoints:
- `GET /` - Basic health check
- `GET /auth/generate-nickname` - Public endpoint test
- `POST /auth/register` - With test data

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
heroku logs --tail

# Specific component
heroku logs --tail --source app

# Error logs only
heroku logs --tail | grep ERROR
```

### Performance Metrics
```bash
# App metrics
heroku ps

# Database connections (if using Heroku Postgres)
heroku pg:info
```

## 🔐 Security Checklist

- [ ] All environment variables set
- [ ] FRONTEND_URL properly configured
- [ ] Rate limiting tested
- [ ] CORS working with your frontend
- [ ] Error responses don't leak sensitive info
- [ ] Logs don't contain passwords/tokens
- [ ] HTTPS enforced (Heroku handles this)

## 📈 Scaling

### Vertical Scaling (Dyno Types)
```bash
# Upgrade to performance dynos
heroku ps:scale web=1:performance-m
```

### Horizontal Scaling
```bash
# Add more dynos
heroku ps:scale web=2
```

### Add-ons Recommendations
```bash
# Better logging
heroku addons:create papertrail

# Application monitoring
heroku addons:create newrelic

# Redis for caching (future)
heroku addons:create heroku-redis
```

## 📝 Post-Deploy Tasks

1. **Test all endpoints** with Postman/curl
2. **Monitor logs** for first 24 hours
3. **Set up monitoring alerts**
4. **Configure DNS** (if custom domain)
5. **Set up CI/CD** with GitHub Actions (optional)

---

Your API will be available at: `https://your-app-name.herokuapp.com`

Remember to update your frontend to point to this new URL!
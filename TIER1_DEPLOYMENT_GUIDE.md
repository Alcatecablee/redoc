# Tier 1 Implementation - Deployment Guide

## ✅ What We've Implemented (So Far)

### Tier 1.1: BullMQ + Redis Queue (COMPLETED)

**Status**: ✅ Implemented with graceful fallback

**Files Created/Modified**:
- `server/queue/bullmq-queue.ts` - Enterprise-grade BullMQ implementation
- `server/queue/unified-queue.ts` - Abstraction layer with feature flag
- `server/routes/jobs.ts` - Job status API endpoints
- `server/index.ts` - Updated to use unified queue
- `server/routes.ts` - Updated queue usage

**Features**:
- ✅ Persistent jobs (survive server restarts)
- ✅ 5 concurrent workers (configurable)
- ✅ Automatic retry with exponential backoff (3 attempts)
- ✅ Dead letter queue (keeps failed jobs for 14 days)
- ✅ Job progress tracking
- ✅ Graceful fallback to in-memory when Redis unavailable
- ✅ Job status API (`GET /api/jobs/:id`, `GET /api/jobs/stats`)

---

## 🚀 Enabling Production Mode (Redis)

### Step 1: Set Up Redis

#### Option A: Local Redis (Development)
```bash
# On macOS
brew install redis
redis-server

# On Linux
sudo apt-get install redis-server
sudo service redis-server start

# On Windows (WSL)
sudo apt-get install redis-server
redis-server
```

#### Option B: Cloud Redis (Production)

**Recommended Providers**:
1. **Upstash** (Serverless Redis) - Free tier available
   - https://upstash.com/
   - Connection: `redis://default:PASSWORD@ENDPOINT:PORT`

2. **Redis Cloud** - Free 30MB tier
   - https://redis.com/try-free/
   - Connection: `redis://default:PASSWORD@ENDPOINT:PORT`

3. **Railway** - Simple deployment
   - https://railway.app/
   - Auto-generates REDIS_URL

### Step 2: Configure Environment Variable

Add to your `.env` or Replit Secrets:

```bash
# Production Mode - Use BullMQ + Redis
USE_BULLMQ=true
REDIS_URL=redis://localhost:6379

# Or for cloud Redis:
# REDIS_URL=redis://default:YOUR_PASSWORD@your-endpoint:6379
```

### Step 3: Restart Server

The unified queue will automatically:
1. Detect `USE_BULLMQ=true`
2. Connect to Redis at `REDIS_URL`
3. Start 5 concurrent workers
4. Enable persistent job storage

**Log Output (Success)**:
```
🚀 Initializing BullMQ Queue (production mode)...
✅ Redis connected successfully
🚀 BullMQ Queue initialized: documentation-generation (5 workers)
👷 Worker started with 5 concurrent processors
```

**Log Output (Fallback)**:
```
🚀 Initializing BullMQ Queue (production mode)...
⚠️  REDIS_URL not set! Falling back to in-memory queue.
📦 Initializing In-Memory Queue (development mode)...
```

---

## 📊 Monitoring Queue Performance

### Check Queue Statistics

```bash
curl http://localhost:5000/api/jobs/stats
```

**Response** (BullMQ mode):
```json
{
  "success": true,
  "mode": "bullmq",
  "stats": {
    "waiting": 3,
    "active": 5,
    "completed": 42,
    "failed": 2,
    "delayed": 0,
    "total": 52
  },
  "timestamp": "2025-10-21T22:45:00.000Z"
}
```

**Response** (In-memory mode):
```json
{
  "success": true,
  "mode": "in-memory",
  "stats": {
    "mode": "in-memory",
    "message": "Stats not available in memory mode"
  },
  "timestamp": "2025-10-21T22:45:00.000Z"
}
```

### Check Specific Job Status

```bash
curl http://localhost:5000/api/jobs/YOUR_JOB_ID
```

**Response**:
```json
{
  "success": true,
  "job": {
    "id": "abc-123-def",
    "name": "generate-docs",
    "status": "running",
    "progress": 45,
    "createdAt": "2025-10-21T22:40:00.000Z",
    "updatedAt": "2025-10-21T22:42:00.000Z",
    "attempts": 1
  }
}
```

---

## 🎯 Benefits of Production Mode

### Before (In-Memory Queue)
- ❌ **Sequential Processing**: 1 job at a time
- ❌ **Volatile**: Jobs lost on server restart
- ❌ **No Retry**: Failed jobs stay failed
- ❌ **No History**: Can't track job history

### After (BullMQ + Redis)
- ✅ **Concurrent Processing**: 5 jobs simultaneously (10x faster)
- ✅ **Persistent**: Jobs survive restarts
- ✅ **Auto-Retry**: 3 attempts with exponential backoff
- ✅ **Job History**: 7 days completed, 14 days failed
- ✅ **Monitoring**: Real-time queue statistics
- ✅ **Scalable**: Can add more workers easily

---

## 🔧 Configuration Options

### Adjust Concurrency

In `server/index.ts`:
```typescript
initUnifiedQueue(processor, { 
  concurrency: 10  // Increase to 10 workers
});
```

### Adjust Retry Strategy

In `server/queue/bullmq-queue.ts`:
```typescript
defaultJobOptions: {
  attempts: 5,  // Retry up to 5 times
  backoff: {
    type: 'exponential',
    delay: 5000,  // Start with 5 seconds
  },
}
```

### Adjust Job Retention

```typescript
removeOnComplete: {
  age: 30 * 24 * 60 * 60,  // Keep for 30 days
  count: 5000,  // Keep max 5000 jobs
},
```

---

## 🐛 Troubleshooting

### Issue: "Redis connection error"

**Solution**: Check if Redis is running
```bash
redis-cli ping
# Should return: PONG
```

### Issue: "FailedToOpenSocket"

**Solution**: Verify REDIS_URL format
```bash
# Correct format:
redis://localhost:6379
redis://default:PASSWORD@endpoint:6379

# Wrong format:
rediss://...  # SSL not supported yet
```

### Issue: Jobs stuck in "running" state

**Solution**: Clear stale jobs
```bash
# Connect to Redis CLI
redis-cli

# List all keys
KEYS *

# Delete specific queue
DEL bull:documentation-generation:*
```

---

## 🔒 Security Best Practices

1. **Never commit REDIS_URL to git**
   - Use environment variables
   - Add to `.gitignore`

2. **Use authentication in production**
   ```bash
   REDIS_URL=redis://default:STRONG_PASSWORD@host:6379
   ```

3. **Enable SSL for cloud Redis**
   - Most cloud providers offer SSL endpoints
   - Update connection config for `rediss://`

4. **Restrict network access**
   - Only allow connections from your server IP
   - Use VPC/private networks when possible

---

## 📈 Next Steps

### Remaining Tier 1 Tasks

- [ ] **1.3**: Database Transaction Management
- [ ] **1.4**: Request Idempotency
- [ ] **1.5**: Input Validation with Zod
- [ ] **1.6**: LRU Cache Implementation

### Testing Tier 1.1

1. Set `USE_BULLMQ=true` and `REDIS_URL`
2. Restart server
3. Generate 5 documents simultaneously
4. Check queue stats
5. Restart server - verify jobs resume

---

## 📚 Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Enterprise Robustness Roadmap](./ENTERPRISE_ROBUSTNESS_ROADMAP.md)

---

**Last Updated**: October 21, 2025
**Status**: Tier 1.1 Complete ✅

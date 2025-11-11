# CORS Issue Fix

## Problem

When running the application locally with Docker, login attempts failed with CORS (Cross-Origin Resource Sharing) errors. The backend was blocking requests from the frontend.

## Root Cause

The backend CORS configuration was hardcoded to only allow `http://localhost:3000`, but requests were coming from multiple origins:
- `http://localhost:3000` (direct frontend access)
- `http://localhost` (via nginx proxy)
- Internal Docker network requests

## Solution

### 1. Updated Backend CORS Configuration

**File**: `backend/src/index.ts`

Changed from:
```typescript
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
```

To:
```typescript
// Configure CORS to allow multiple origins
const allowedOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:80',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development/docker, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
```

### 2. Added FRONTEND_URL Environment Variable

**Files**: `docker-compose.yml` and `docker-compose.prod.yml`

Added `FRONTEND_URL` to backend environment variables:
```yaml
environment:
  - FRONTEND_URL=http://localhost:3000
```

This allows for flexible configuration in different environments.

## Verification

After the fix, CORS preflight requests work correctly:

### Test 1: From localhost:3000
```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:8080/api/auth/login
```

**Result**: ✅ 204 No Content with proper CORS headers

### Test 2: From localhost
```bash
curl -H "Origin: http://localhost" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:8080/api/auth/login
```

**Result**: ✅ 204 No Content with proper CORS headers

### CORS Headers Returned
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
```

## Testing the Fix

1. **Rebuild and start services**:
```bash
docker-compose build backend
docker-compose up -d
```

2. **Wait for services to be healthy** (about 45 seconds):
```bash
docker-compose ps
```

3. **Open the application**:
- Frontend: http://localhost:3000
- Or via Nginx: http://localhost

4. **Try to login** - CORS errors should be gone!

## Security Considerations

### Development/Local
- The current configuration allows all `localhost` origins for convenience
- This is suitable for local development and testing

### Production
For production deployment:

1. **Update allowed origins** to specific domains:
```typescript
const allowedOrigins = [
  'https://your-domain.com',
  'https://www.your-domain.com',
  process.env.FRONTEND_URL,
].filter(Boolean);
```

2. **Remove the localhost wildcard** for security:
```typescript
// Remove this in production:
if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
  callback(null, true);
}
```

3. **Set FRONTEND_URL environment variable** on EC2:
```bash
FRONTEND_URL=https://your-domain.com
```

## Additional Notes

### Why Multiple Origins?

- **http://localhost:3000**: Direct access to frontend container
- **http://localhost**: Access via nginx reverse proxy
- **No origin**: API calls from server-side or mobile apps
- **Docker network**: Internal container-to-container communication

### Benefits of This Approach

✅ Flexible configuration via environment variables
✅ Works with both direct and proxied requests
✅ Development-friendly (allows localhost variants)
✅ Production-ready (can be locked down)
✅ Supports preflight OPTIONS requests
✅ Proper credentials support for cookies/auth

## Troubleshooting

### Still Getting CORS Errors?

1. **Check backend logs**:
```bash
docker logs med-booking-backend
```
Look for "Blocked by CORS:" messages

2. **Verify frontend API URL**:
```bash
cat frontend/.env
```
Should be: `REACT_APP_API_URL=http://localhost:8080/api`

3. **Check browser console**:
- Open Developer Tools (F12)
- Look at Network tab for failed requests
- Check the Origin and Access-Control headers

4. **Restart services**:
```bash
docker-compose down
docker-compose up -d
```

### Testing CORS Manually

```bash
# Test OPTIONS preflight request
curl -v -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:8080/api/auth/login

# Should return 204 with CORS headers
```

## Summary

✅ **Fixed**: CORS configuration now allows multiple origins
✅ **Tested**: Both direct and proxied requests work
✅ **Flexible**: Uses environment variables for production
✅ **Secure**: Can be locked down for production deployment

The login and all API requests should now work correctly! 🎉


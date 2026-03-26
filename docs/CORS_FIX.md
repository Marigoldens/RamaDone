# CORS Fix Documentation

## Problem
Cloud Functions callable functions were failing with CORS errors:
```
Access to fetch at 'https://...cloudfunctions.net/...' from origin 'https://ramadone-f28bb.web.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
Firebase Callable Functions (functions.https.onCall) have inconsistent CORS behavior when:
- Functions crash internally (any error throws HttpsError which doesn't set CORS headers)
- Functions return errors before proper CORS preflight response
- Firestore queries fail (missing indexes, permission errors)

## Solution
**Convert callable functions to HTTP functions** (functions.https.onRequest) with explicit CORS headers.

### Before (Callable - Broken)
```javascript
exports.getAllUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  // When this throws, no CORS headers are sent, causing browser CORS error
});
```

### After (HTTP - Fixed)
```javascript
exports.getAllUsers = functions.https.onRequest((req, res) => {
  // Set CORS headers IMMEDIATELY - before any logic
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Get auth token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Verify token and return data
  const idToken = authHeader.split('Bearer ')[1];
  admin.auth().verifyIdToken(idToken)
    .then((decodedToken) => {
      // ... process request
      res.json({ users: [...] });
    })
    .catch((error) => {
      res.status(500).json({ error: error.message });
    });
});
```

## Client-Side Changes

### Before (Callable)
```javascript
import { httpsCallable } from 'firebase/functions';

const getAllUsers = httpsCallable(functions, 'getAllUsers');
const result = await getAllUsers();
return result.data.users;
```

### After (HTTP)
```javascript
const user = auth.currentUser;
const idToken = await user.getIdToken();

const response = await fetch('https://us-central1-ramadone-f28bb.cloudfunctions.net/getAllUsers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({})
});

const data = await response.json();
return data.users;
```

## Functions Converted

| Function | Type | Status |
|----------|------|--------|
| getAllUsers | HTTP ✅ | Fixed |
| trackAiUsage | HTTP ✅ | Fixed |
| grantApiAccess | Callable ⚠️ | May need fix |
| revokeApiAccess | Callable ⚠️ | May need fix |
| checkApiAccess | Callable ⚠️ | May need fix |

## Deployment Notes

When changing from callable to HTTP, you MUST delete and recreate the function:

```bash
# 1. Delete old callable function
firebase functions:delete FUNCTION_NAME --force

# 2. Deploy new HTTP version
firebase deploy --only functions:FUNCTION_NAME
```

Otherwise you'll get: "Changing from a callable function to an HTTPS function is not allowed"

## Key Takeaways

1. **Always set CORS headers first** - Before any authentication or logic
2. **Handle OPTIONS preflight** - Return 204 with CORS headers immediately
3. **Use native fetch() on client** - Instead of Firebase callable wrapper
4. **Return JSON errors** - Don't throw, send proper HTTP status codes
5. **Manual token verification** - Use `admin.auth().verifyIdToken()` instead of `context.auth`

## Files Modified

- `functions/index.js` - Converted getAllUsers and trackAiUsage to HTTP functions
- `src/config/admin.js` - Updated fetchAllUsers and trackAiUsageSecure to use fetch()
- `src/components/Admin/AdminDashboard.jsx` - Fixed formatDate to handle Firestore timestamps

## Testing

Test CORS with curl:
```bash
curl -X OPTIONS -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  https://us-central1-ramadone-f28bb.cloudfunctions.net/getAllUsers

# Should return 204 with CORS headers
```

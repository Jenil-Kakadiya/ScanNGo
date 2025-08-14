# Google OAuth Setup Guide

This guide explains how to set up Google OAuth authentication for the ScanNGo application.

## Prerequisites

1. A Google Cloud Console account
2. Node.js and npm installed
3. The ScanNGo server running on port 5000
4. The ScanNGo client running on port 3000

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application" as the application type
6. Set the following redirect URIs:
   - `http://localhost:5000/users/google/callback` (for development)
   - `https://yourdomain.com/users/google/callback` (for production)
7. Copy the Client ID and Client Secret

## Step 2: Configure Environment Variables

1. Copy `server/env.example` to `server/.env`
2. Update the following variables in your `.env` file:

```env
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret
GOOGLE_REDIRECT_URL=http://localhost:5000/users/google/callback
FRONTEND_URL=http://localhost:3000
```

## Step 3: Test the Integration

1. Start your server: `cd server && npm run dev`
2. Start your client: `cd client && npm run dev`
3. Navigate to the login page
4. Click "Continue with Google"
5. You should be redirected to Google's OAuth consent screen
6. After authorization, you'll be redirected back to the app

## How It Works

1. **User clicks "Continue with Google"** → Redirects to `/users/google`
2. **Google OAuth flow** → User authenticates with Google
3. **Callback** → Google redirects to `/users/google/callback`
4. **Token generation** → Server creates JWT token and user data
5. **Frontend redirect** → User is redirected back to frontend with token
6. **Authentication complete** → User is logged in and redirected to dashboard

## Security Notes

- Never commit your `.env` file to version control
- Use strong JWT secrets in production
- Consider implementing CSRF protection
- Validate all OAuth data on the server side

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**: Check that your redirect URI in Google Console matches exactly
2. **"Client ID not found"**: Verify your environment variables are set correctly
3. **CORS errors**: Ensure your server CORS configuration allows your frontend domain

### Debug Steps

1. Check server console logs for OAuth errors
2. Verify environment variables are loaded correctly
3. Test the OAuth endpoint directly: `http://localhost:5000/users/google`
4. Check browser network tab for redirect issues

## Production Considerations

1. Use HTTPS for all OAuth endpoints
2. Set up proper domain verification in Google Console
3. Implement rate limiting for OAuth endpoints
4. Add proper error handling and user feedback
5. Consider implementing refresh token logic

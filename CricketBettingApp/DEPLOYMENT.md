# Cricket Betting App Deployment Guide

This document provides instructions for deploying the Cricket Betting App to Netlify (frontend) and Render (backend).

## Prerequisites

- A Netlify account
- A Render account
- A MongoDB Atlas account (for the production database)
- Google Sheets API credentials

## Backend Deployment (Render)

1. Sign up or log in to [Render](https://render.com)

2. Create a new Web Service:
   - Click on "New" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch containing the Cricket Betting App

3. Configure the Web Service:
   - Name: `cricket-betting-backend` (or your preferred name)
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node app.js`
   - Choose the appropriate instance type (Free tier is suitable for testing)

4. Add Environment Variables:
   - MONGO_URI: Your MongoDB Atlas connection string
   - JWT_SECRET: A strong secret key for JWT authentication
   - GOOGLE_CREDENTIALS: Paste the entire contents of your credentials.json file as a JSON string
   - SPREADSHEET_ID: Your Google Spreadsheet ID
   - SHEET_NAME: Your sheet name
   - SPORTSRADAR_API_KEY: Your API key
   - NODE_ENV: `production`
   - PORT: `10000` (Render uses this port)

5. Deploy the service:
   - Click "Create Web Service"
   - Wait for the deployment to complete
   - Note the URL of your deployed backend (e.g., https://cricket-betting-backend.onrender.com)

## Frontend Deployment (Netlify)

1. Sign up or log in to [Netlify](https://netlify.com)

2. Deploy via GitHub:
   - Click "New site from Git"
   - Choose GitHub as your Git provider
   - Authorize Netlify to access your repositories
   - Select the repository containing the Cricket Betting App

3. Configure the build settings:
   - Branch to deploy: main (or your preferred branch)
   - Base directory: CricketBettingApp/frontend
   - Build command: npm run build
   - Publish directory: build

4. Configure environment variables:
   - Go to Site settings > Build & deploy > Environment
   - Add the following variables:
     - REACT_APP_API_URL: The URL of your Render backend (e.g., https://cricket-betting-backend.onrender.com)
     - REACT_APP_WS_URL: The WebSocket URL of your Render backend (e.g., wss://cricket-betting-backend.onrender.com)

5. Deploy the site:
   - Click "Deploy site"
   - Wait for the deployment to complete
   - Your site will be available at a Netlify subdomain (e.g., https://cricket-betting-app.netlify.app)

## Post-Deployment

After deploying both services, test the application to ensure everything works correctly:

1. Register a new user
2. Log in
3. View matches and place bets
4. Test admin functionality

## Troubleshooting

- **CORS Issues**: Ensure the backend allows requests from your Netlify domain.
- **WebSocket Connection Errors**: Verify the WebSocket URL is correct and the WebSocket server is properly configured.
- **Database Connection Issues**: Check your MongoDB Atlas connection string and network access settings.
- **Google Sheets API Issues**: Verify your credentials and ensure the service account has access to the spreadsheet.

## Security Considerations

- Never commit sensitive credentials to your repository
- Use environment variables for all secrets
- Set appropriate CORS headers in your backend
- Implement rate limiting to prevent abuse 
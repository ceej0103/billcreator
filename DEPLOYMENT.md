# Deployment Guide - Railway

## Quick Deploy to Railway

### Step 1: Prepare Your Repository
1. Make sure all your code is committed to a GitHub repository
2. Ensure your repository is public (or you have a Railway Pro account)

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Sign up/Login with your GitHub account
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will automatically detect it's a Node.js app

### Step 3: Configure Environment Variables (Optional)
In your Railway project dashboard:
- Go to "Variables" tab
- Add any environment variables if needed:
  - `NODE_ENV=production`
  - `PORT` (Railway sets this automatically)

### Step 4: Deploy
1. Railway will automatically build and deploy your app
2. The build process will:
   - Install backend dependencies
   - Install frontend dependencies
   - Build the React app
   - Start the server

### Step 5: Get Your URL
1. Once deployed, Railway will provide a URL like: `https://your-app-name.railway.app`
2. Your app will be live and accessible!

## What Happens During Deployment

1. **Build Process**:
   ```bash
   npm install                    # Install backend deps
   cd client && npm install      # Install frontend deps
   npm run build                 # Build React app
   ```

2. **Start Process**:
   ```bash
   npm start                     # Start the server
   ```

3. **Production Features**:
   - React app serves static files from `client/build`
   - All API routes work as expected
   - SQLite database is created automatically
   - PDF generation works
   - Authentication works

## Important Notes

### Database
- SQLite database (`bills.db`) will be created automatically
- Data persists between deployments
- For production, consider using a managed database service

### File Uploads
- CSV file uploads work in production
- PDF template file (`BILL TEMPLATE (1).pdf`) must be in the root directory

### Security
- JWT secret is hardcoded (consider using environment variable in production)
- Authentication credentials are hardcoded (consider using environment variables)

## Troubleshooting

### Common Issues:
1. **Build fails**: Check that all dependencies are in `package.json`
2. **App won't start**: Check server logs in Railway dashboard
3. **Database issues**: Ensure SQLite is working (it should be automatic)

### Logs:
- View logs in Railway dashboard under "Deployments"
- Check both build and runtime logs

## Custom Domain (Optional)
1. In Railway dashboard, go to "Settings"
2. Add custom domain
3. Railway provides free SSL certificates

## Monitoring
- Railway provides basic monitoring
- Check "Metrics" tab for performance data
- Set up alerts if needed

## Cost
- Free tier: $5/month credit
- Your app should stay within free limits
- Monitor usage in Railway dashboard

## Alternative Hosting Options

If Railway doesn't work for you:

### Render
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Build command: `npm run install-client && npm run build`
5. Start command: `npm start`

### Heroku
1. Install Heroku CLI
2. Run: `heroku create your-app-name`
3. Run: `git push heroku main`
4. Set environment variables if needed

### Vercel (Frontend Only)
1. Deploy frontend to Vercel
2. Deploy backend separately (Railway/Render)
3. Update API URLs in frontend

## Support
- Railway documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway) 
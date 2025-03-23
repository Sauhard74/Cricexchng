# Setting Up Environment Variables on Render

For your Cricket Betting App deployment on Render, you need to set up the following environment variables. Note that you already have these in your local `.env` file, but they need to be configured separately on Render.

## Required Environment Variables

Copy and paste these values into your Render dashboard under the "Environment" section:

```
PORT=10000
NODE_ENV=production
MONGO_URI=mongodb+srv://vaibhavsrivastavaknp:Callmebatman21@cluster0.qwpy3.mongodb.net/bettingDB
JWT_SECRET=fd616b831577382c2d8fd67e900ce02c340c4bd24a3c285d5c8a13924a392f1f
SPORTRADAR_API_KEY=YtzgWaXRBBJ4vbjBbCP2U7IShSvkUNPMdYRyb1vZ
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"clear-hulling-327515","private_key_id":"b585f97bbf35d02ebc0eeceba17aadbd1fca1a6d","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCjZfUWJPeF4396\nv5FXzGFvC9JIuK9Ha62QzjyengIcblOy9lxEpMqkczingteqIKYVvktJbPmAkDzb\nrHKHlcHPlrNY6bGGmLoHRInPhFz5xPN9y5z6bToZ4YbRvz0HjrMC4AOKJu7k0bAe\ngKTLPz18tq/i7Tz0yOOJTtVDgqCqVDdC77cmRkLT7mG2nQfGpfRkyvFZeWH10Os9\nUYChgH6wOUTLzXJTxGX2MdTKbm8x1o7M0wqSwmXVhWrH+saIfaI1K693PsZ322SD\n/pb+onm+HIO3wj8iDMyhheedKuYnM1uCNsJUzZIpw/m+x6j/gn1RDJ1OzPQrsxkr\nbMbvW1rJAgMBAAECggEAC51bOww8pgFCVgTY/X8zK9QQygeKug5u43ytdW7w4nl7\nLJzzeROnreHc1Jdp4hd5BtGkg18iKx/Vm53Z9EZSZQGm1Pqjmlgv3QVjsGMNwtlb\nn4UCLxDlkOJllXI9EdT0Z49p4P+ceppnJPvq+uGPataHkR9g9ltzRRbb9PULm5/M\nyEkbIvKcWlQXn2woYH+Z81LFj2pjBU/klgRQve5PLSd0FLuyWuJE16x/p9WvW5g+\nPchQ2CT0wSpvVZx7eWH8p4HgyKWiQ5brxQV6McnwSPDTjJu6qqSDfEvvwde0Ixo0\nwyIBW8ie8Ee12ZdPmGb9a+qSZp+8r0nnbgmzu+jbswKBgQDTUcNUXOU3N34h5wqq\nQ2A7kpxqzxY0zsy+qK2hjmI1X7PEchNVOyKT41I+r29g3a5hFvX57IM+Yrt/WvRL\nZlUtKofnkx4mxwvvfExReCg66Wf3F+IPACuAcMw8DMHGa8L6w7aRfhZJLOVSyq+g\nnu5q3VctlDII9liO+Bc57yoafwKBgQDF8lVipXQY/tzlBvMC/wA8fkiGXYxlFX2u\nd713JPmufE/oslLvGIr5naOkQ9zkVDvcYMrsaO4FZetUy9t5r0C3kBeUNMakg6f0\nFdVR5xQAMNQQynMCFqjhiVB1h5fAwYwjA1CoGVkVOil2xTW5iPbjR5vrsV2L4/aD\nR5PFPUSWtwKBgQDKmOkcSLO5bIqRFmEzO8VXWAh+nmw71MiXQkC1Uzz0zvwaqwO+\nAyPzhU2kq62swNweWVUad5aciSwZvanZYBLpao1Bh9qwcsUOpazFrt1jHcN/MnaY\nyyDp0zr7l39wLICSynCOrMPRBCoYZhpbdARAkFS0bhBKZ2QgLdqWwKUtIQKBgHOX\nBWFreJY4Dcn3+uRfAEZTAArmidtlZ1UAOzVd9Cd+FDOwHlncnRsSgMKlllIHFkWk\niBrxUzz3vSpxOKKgQkxu6jXzc6QR9XvFXCJNrBJIcS206t/nV4sMYl2fZnB7FVhE\n0U64LpsEsb3Xf33uiy1BXb2Ofy/3WLZkj9f35RuVAoGAFNFtQE1LfLAmWfd5HrBa\nQMCNkjhEw93h7YYcWM/Bcic+LEv4yt3xzYq0guxI5jHerMszPKhvAenkTPO2oN/r\nDHr8iiYUcemm1+EncP7km1vtpxkrhA8dfPVjInQXv22qWzrJpr5tVoHG2ceI3P2Q\nMrbPb6g99ZDjhwwBtlWKiOA=\n-----END PRIVATE KEY-----\n","client_email":"cric-cron@clear-hulling-327515.iam.gserviceaccount.com","client_id":"107693324816521860484","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/cric-cron%40clear-hulling-327515.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
CORS_ORIGIN=https://cricexchng.netlify.app
SPREADSHEET_ID=1kQ2Lv7EQsUVaGaAkuB57K6nWlRm5EATrZMfE2LUz_pI
SHEET_NAME=Sheet1
```

## Special Note for Render

1. On Render, go to your web service's dashboard
2. Click on the "Environment" tab
3. Add each variable individually (name and value)
4. For `GOOGLE_CREDENTIALS`, you might need to use Secret Files instead:
   - Click "Add Secret File"
   - Set File Path to: `/opt/render/project/src/CricketBettingApp/backend/credentials.json`
   - Paste the entire Google credentials JSON into the Value field

## Testing Your Setup

After setting up your environment variables, your app should restart automatically. To verify everything is working:

1. Check the logs for successful MongoDB connection
2. Check for successful loading of environment variables
3. Make a test request to `/api/test` endpoint

## If You Continue to Have Issues

If MongoDB connection problems persist:
1. Double-check the MongoDB URI (make sure it's correctly escaped in Render)
2. Check if MongoDB Atlas IP whitelist allows connections from Render's IPs
3. For the Google Sheets credentials, try both methods (environment variable and secret file) 
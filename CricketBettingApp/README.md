Here's a structured and well-formatted README for your **Cricket Betting App** with clear sections for setup, features, and deployment.

---

# 🏏 Cricket Betting App  

A full-stack application for cricket match betting with real-time odds updates, user management, and betting functionality.

## 📌 Table of Contents  
- [Overview](#overview)  
- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Project Structure](#project-structure)  
- [Setup Instructions](#setup-instructions)  
- [Environment Variables](#environment-variables)  
- [API Documentation](#api-documentation)  
- [Frontend Components](#frontend-components)  
- [Backend Architecture](#backend-architecture)  
- [Deployment](#deployment)  
- [Contributing](#contributing)  

---

## 🌟 Overview  
The **Cricket Betting App** is a comprehensive platform that allows users to:  
- Place bets on cricket matches.  
- View real-time odds via WebSockets.  
- Manage their credits and track betting history.  
- Utilize admin functionalities for user and credit management.  

---

## 🚀 Features  

### **User Features**  
✅ Authentication (login/register)  
✅ View upcoming & live cricket matches  
✅ Place bets on match outcomes, runs, and wickets  
✅ Track betting history  
✅ Request additional credits  
✅ Real-time odds updates via WebSockets  

### **Admin Features**  
✅ User management (view, delete users)  
✅ Credit management (approve/reject requests)  
✅ Bet management (view, update, delete bets)  
✅ Match result updates and bet settlement  
✅ Dashboard with analytics  

---

## 🛠 Tech Stack  

### **Backend:**  
- **Node.js & Express** – API framework  
- **MongoDB & Mongoose** – Database & ODM  
- **JWT** – Authentication  
- **WebSockets** – Real-time updates  
- **Bcrypt** – Password hashing  
- **Axios** – HTTP requests  
- **Node-cron** – Scheduled tasks  

### **Frontend:**  
- **React.js** – UI library  
- **React Router** – Navigation  
- **Axios** – API requests  
- **WebSocket Client** – Real-time updates  
- **React Context API** – State management  
- **React Toastify** – Notifications  
- **Styled Components** – Styling  

---

## 📂 Project Structure  
```
CricketBettingApp/
├── backend/
│   ├── config/         # Configuration files
│   ├── controllers/    # API route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── scripts/        # Utility scripts
│   ├── app.js          # Express app entry point
│   └── package.json    # Backend dependencies
├── frontend/
│   ├── public/         # Static files
│   ├── src/
│   │   ├── api/        # API service functions
│   │   ├── components/ # React UI components
│   │   ├── context/    # Context providers
│   │   ├── pages/      # Page components
│   │   ├── services/   # Frontend services
│   │   ├── styles/     # CSS files
│   │   ├── App.js      # Main component
│   │   └── index.js    # Entry point
│   └── package.json    # Frontend dependencies
└── README.md           # Project documentation
```

---

## ⚙️ Setup Instructions  

### **Prerequisites**  
Ensure you have the following installed:  
🔹 [Node.js](https://nodejs.org/) (v14 or higher)  
🔹 [MongoDB](https://www.mongodb.com/) (Local or Atlas)  
🔹 [Git](https://git-scm.com/)  

### **1️⃣ Clone the Repository**  
```sh
git clone https://github.com/your-repo-link.git
cd CricketBettingApp
```

### **2️⃣ Backend Setup**  
```sh
cd backend
npm install
```
Create a `.env` file inside the `backend` directory (see [Environment Variables](#environment-variables)).  
Then, start the backend server:  
```sh
npm run start
```

### **3️⃣ Frontend Setup**  
```sh
cd frontend
npm install
```
Create a `.env` file inside the `frontend` directory (see [Environment Variables](#environment-variables)).  
Start the frontend development server:  
```sh
npm run start
```

---

## 🔐 Environment Variables  

### **Backend (`.env`)**  
```env
PORT=5001
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/cricket-betting

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30d

# API Keys
SPORTRADAR_API_KEY=your_sportradar_api_key
```

### **Frontend (`.env`)**  
```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_WS_URL=ws://localhost:5001
```

---

## 📡 API Documentation  

### **Authentication Endpoints**  
🔹 `POST /api/user/register` - Register a new user  
🔹 `POST /api/user/login` - Login and get tokens  
🔹 `POST /api/user/refresh-token` - Refresh access token  

### **User Endpoints**  
🔹 `GET /api/user/profile` - Get user profile  
🔹 `PUT /api/user/profile` - Update user profile  
🔹 `POST /api/user/request-credits` - Request additional credits  

### **Betting Endpoints**  
🔹 `POST /api/bet/place` - Place a new bet  
🔹 `GET /api/bet/:username` - Get user’s bets  
🔹 `DELETE /api/bet/:betId` - Cancel a bet (admin only)  

### **Match Endpoints**  
🔹 `GET /api/matches/live` - Get live matches with odds  
🔹 `POST /api/matches/update-result` - Update match result (admin only)  

---

## 🎨 Frontend Components  

### **Core Components**  
📌 `AuthContext` - Manages authentication state  
📌 `ProtectedRoute` - Ensures authentication for specific routes  
📌 `Header & Footer` - Navigation elements  

### **Pages**  
📌 `LoginPage` - User login  
📌 `HomePage` - Dashboard with upcoming matches  
📌 `BettingPage` - Place bets  
📌 `AdminDashboard` - Admin control panel  

---

## 🔧 Deployment  

### **Backend Deployment**  
1. Set up a **MongoDB Atlas** cluster.  
2. Deploy to **Heroku, DigitalOcean, or AWS**.  
3. Set environment variables in the hosting platform.  

### **Frontend Deployment**  
1. Build the React app:  
   ```sh
   npm run build
   ```
2. Deploy to **Netlify, Vercel, or GitHub Pages**.  

---

## 🤝 Contributing  

### **Branching Strategy**  
🔹 `main` → Production-ready code  
🔹 `develop` → Development branch  
🔹 `feature/*` → New features  
🔹 `bugfix/*` → Bug fixes  
🔹 `release/*` → Release preparation  

### **Pull Request Process**  
1. Create a `feature/bugfix` branch from `develop`.  
2. Implement changes.  
3. Submit a **Pull Request (PR)** to the `develop` branch.  
4. Request a code review.  
5. Merge after approval.  

---

## 📞 Need Help?  
For any issues, open an **Issue** in the repository.  

🚀 Happy Betting! 🎉
// Load environment variables if needed
const path = require('path');
const fs = require('fs');

// Only load dotenv if not already loaded by app.js
if (!process.env.MONGO_URI) {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from db.js: ${envPath}`);
    require('dotenv').config({ path: envPath });
  } else {
    console.log('No .env file found from db.js, using environment variables from system');
    require('dotenv').config();
  }
}

const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGO_URI;
    
    if (!uri) {
        console.error("❌ ERROR: MONGO_URI environment variable is not set");
        console.error("Please set MONGO_URI in your environment variables or .env file");
        process.exit(1);
    }
    
    console.log("Attempting to connect to MongoDB...");
    
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;

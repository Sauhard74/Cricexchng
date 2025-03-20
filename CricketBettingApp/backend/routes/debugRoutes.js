const express = require("express");
const router = express.Router();
const Odds = require("../models/Odds");
const { fetchOddsFromSheet } = require("../services/googleSheetsService");

// Debug route to check odds data directly
router.get("/odds-direct", async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Directly checking odds data");
        
        // Get all odds entries directly from the database
        const oddsEntries = await Odds.find({}).lean();
        
        if (!oddsEntries || oddsEntries.length === 0) {
            console.log("⚠️ No odds data found in database");
            return res.json({ 
                success: false, 
                message: "No odds data found in database",
                oddsCount: 0
            });
        }
        
        console.log(`✅ Found ${oddsEntries.length} odds entries in database`);
        
        // Return a simplified response
        res.json({
            success: true,
            oddsCount: oddsEntries.length,
            sampleData: oddsEntries.slice(0, 3)
        });
    } catch (error) {
        console.error("❌ [DEBUG ERROR]:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug route to manually fetch from Google Sheets
router.get("/fetch-sheet", async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Manually fetching from Google Sheets");
        
        const sheetData = await fetchOddsFromSheet();
        
        if (!sheetData || sheetData.length === 0) {
            return res.json({
                success: false,
                message: "No data found in Google Sheets"
            });
        }
        
        res.json({
            success: true,
            count: sheetData.length,
            sampleData: sheetData.slice(0, 3)
        });
    } catch (error) {
        console.error("❌ [DEBUG ERROR]:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug route to manually update odds in database
router.get("/update-odds", async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Manually updating odds in database");
        
        const sheetData = await fetchOddsFromSheet();
        
        if (!sheetData || sheetData.length === 0) {
            return res.json({
                success: false,
                message: "No data found in Google Sheets"
            });
        }
        
        // Clear existing odds
        await Odds.deleteMany({});
        console.log("✅ Cleared existing odds data");
        
        // Insert new odds
        await Odds.insertMany(sheetData);
        console.log(`✅ Inserted ${sheetData.length} new odds entries`);
        
        res.json({
            success: true,
            message: `Updated ${sheetData.length} odds entries`,
            sampleData: sheetData.slice(0, 3)
        });
    } catch (error) {
        console.error("❌ [DEBUG ERROR]:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 
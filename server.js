const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Enable CORS for all origins (no API key required)
app.use(cors());
app.use(express.json());

// Translation API endpoint - No API key required
app.get('/api/translate', async (req, res) => {
    const { q, sl, tl } = req.query;
    
    // Validate required parameters
    if (!q) {
        return res.status(400).json({ 
            error: 'Missing required parameter: q (text to translate)' 
        });
    }
    
    const sourceLang = sl || 'auto';
    const targetLang = tl || 'en';
    
    try {
        // Using Google Translate via a no-key endpoint
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(q)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Translation service unavailable');
        }
        
        const data = await response.json();
        
        // Extract translation from Google's response format
        const translatedText = data[0]
            .filter(item => item[0])
            .map(item => item[0])
            .join('');
        
        // Return the translation result
        res.json({
            success: true,
            translation: {
                text: q,
                translatedText: translatedText,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang
            }
        });
        
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Unable to translate. Please try again.' 
        });
    }
});

// POST endpoint for longer texts
app.post('/api/translate', async (req, res) => {
    const { text, sourceLanguage, targetLanguage } = req.body;
    
    // Validate required parameters
    if (!text) {
        return res.status(400).json({ 
            error: 'Missing required parameter: text (text to translate)' 
        });
    }
    
    const sl = sourceLanguage || 'auto';
    const tl = targetLanguage || 'en';
    
    try {
        // Using Google Translate via a no-key endpoint
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Translation service unavailable');
        }
        
        const data = await response.json();
        
        // Extract translation from Google's response format
        const translatedText = data[0]
            .filter(item => item[0])
            .map(item => item[0])
            .join('');
        
        // Return the translation result
        res.json({
            success: true,
            translation: {
                text: text,
                translatedText: translatedText,
                sourceLanguage: sl,
                targetLanguage: tl
            }
        });
        
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Unable to translate. Please try again.' 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Translation API is running',
        version: '1.0.0'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Translation API Server running on port ${PORT}`);
    console.log(`📝 Endpoints:`);
    console.log(`   GET  /api/translate?q=hello&sl=en&tl=es`);
    console.log(`   POST /api/translate (body: { text, sourceLanguage, targetLanguage })`);
    console.log(`   GET  /api/health`);
    console.log(`🔓 No API key required!`);
});

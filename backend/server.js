import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import './config/supabaseClient.js'; 

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js'; 
import facultyRoutes from './routes/facultyRoutes.js'; 
import studentRoutes from './routes/studentRoutes.js'; 

dotenv.config();

const app = express();

const requestLogger = (req, res, next) => {
    const start = process.hrtime();
    
    // Log the incoming request method and URL
    console.log(`\n➡️  [${new Date().toISOString()}] Incoming Request: ${req.method} ${req.originalUrl}`);

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to milliseconds
        
        // Log the response status and time
        console.log(`✅  [${new Date().toISOString()}] Responded: ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${responseTime.toFixed(2)}ms`);
    });

    next();
};



// --- Middleware for Minimum Response Time ---

//? CORS: Allow requests from your React frontend domain
// app.use(cors({
//     origin: 'http://localhost:3000', // Replace with your frontend URL
//     methods: ['GET', 'POST', 'PUT', 'DELETE']
// })); 

app.use(cors({
    origin: '*' // Development only: Allow all origins. Change in production.
}));



// 2. Body Parser: Process JSON data from incoming requests
app.use(express.json()); 
app.use(requestLogger); 

// 3. Root Route
app.get('/', (req, res) => {
  res.send('ERP Backend API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api/faculty', facultyRoutes); 
app.use('/api/student', studentRoutes); 

// --- Global Error Handler (Essential for Robustness) ---
// This is critical for preventing server crashes from unexpected errors.
app.use((err, req, res, next) => {
    console.error(err.stack); 
    res.status(500).send({ 
        message: 'A catastrophic server error occurred.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});

// --- Server Start ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => 
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);
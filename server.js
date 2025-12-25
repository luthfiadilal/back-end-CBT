import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabase from './src/config/supabase.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import kriteriaRoutes from './src/routes/kriteriaRoutes.js';
import subKriteriaRoutes from './src/routes/subKriteriaRoutes.js';
import examRoutes from './src/routes/examRoutes.js';
import examAttemptRoutes from './src/routes/examAttemptRoutes.js';
import questionRoutes from './src/routes/questionRoutes.js';
import questionOptionRoutes from './src/routes/questionOptionRoutes.js';
import perhitunganSAWRoutes from './src/routes/perhitunganSAWRoutes.js';
import examStudentRoutes from './src/routes/examStudentRoutes.js';
import examResultRoutes from './src/routes/examResultRoutes.js';

app.use('/cbt', authRoutes);
app.use('/cbt', userRoutes);
app.use('/cbt', kriteriaRoutes);
app.use('/cbt', subKriteriaRoutes);
app.use('/cbt', examRoutes);
app.use('/cbt', examAttemptRoutes);
app.use('/cbt', questionRoutes);
app.use('/cbt', questionOptionRoutes);
app.use('/cbt', perhitunganSAWRoutes);
app.use('/cbt', examStudentRoutes);
app.use('/cbt', examResultRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;

// Start server with Supabase
async function startServer() {
    try {
        console.log('🔄 Initializing Supabase client...');

        // Supabase client is initialized on import
        // Connection happens lazily on first query
        console.log('✅ Supabase client ready');

        // Start server
        app.listen(PORT, () => {
            console.log('');
            console.log(`✅ Server is running on port ${PORT}`);
            console.log(`📡 API Base URL: http://localhost:${PORT}/cbt`);
            console.log(`🔗 Supabase ready for database queries`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Server initialization failed:');
        console.error('Error details:', error);
        console.error('');
        console.error('Please check your Supabase configuration');
        console.error('');
        process.exit(1);
    }
}

startServer();

export default app;

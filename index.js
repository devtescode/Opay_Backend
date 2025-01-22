const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const userRoutes = require('./Routes/user.routes');
// const paystackroute = require('./Controllers/paystackWebhook');

const app = express();
const PORT = process.env.PORT || 4000;
const URI = process.env.URI;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.json({ limit: '200mb' }));

mongoose
    .connect(URI)
    .then(() => {
        console.log('Database connected successfully Opayuser');
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });

app.use('/useropay', userRoutes);

// app.use('/api/paystack', 
//   express.raw({ type: '*/*' }), 
//   (req, res, next) => {
//       req.rawBody = req.body; 
//       console.log('Captured Raw Body:', req.rawBody.toString('utf8')); 
//       next();  
//   },
//   paystackroute  
// );


// Not using
// Paystack route
// app.use('/api/paystack', paystackroute);
// app.use('/api/paystack/webhook', express.raw({ type: '*/*' })); // Capture raw body
// app.use('/api/paystack', paystackroute);

// Default Route
app.get('/', (req, res) => {
    res.status(200).json({message: 'Welcome to Opayuser'});
});

// Catch-all Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
});
// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
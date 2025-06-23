const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const userRoutes = require('./Routes/user.routes');
const { initializeSocket } = require('./socket'); // Import socket initializer
const paystackroute = require('./Controllers/paystackWebhook');

const app = express();
const server = http.createServer(app); // Create the server instance
const PORT = process.env.PORT || 4000;
const URI = process.env.URI;

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

initializeSocket(server);

app.use('/useropay', userRoutes);

app.use('/api/paystack', 
  express.raw({ type: '*/*' }),  
  (req, res, next) => {
      req.rawBody = req.body;  
      console.log('Captured Raw Body:', req.rawBody.toString('utf8')); 
      next(); 
  },
  paystackroute
);

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to Opayuser' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

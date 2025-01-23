// const express = require('express');
// const mongoose = require('mongoose');
// require('dotenv').config();
// const cors = require('cors');
// const userRoutes = require('./Routes/user.routes');

// const app = express();
// const PORT = process.env.PORT || 4000;
// const URI = process.env.URI;

// app.use(cors());
// app.use(express.urlencoded({ extended: true, limit: '200mb' }));
// app.use(express.json({ limit: '200mb' }));

// mongoose
//     .connect(URI)
//     .then(() => {
//         console.log('Database connected successfully Opayuser');

//         // Drop the index only if it exists
//         mongoose.connection.db.collection('transactions').dropIndex('fullname_1', function (err, result) {
//             if (err) {
//                 console.error('Error dropping index:', err);
//             } else {
//                 console.log('Index dropped successfully', result);
//             }
//         });
//     })
//     .catch((err) => {
//         console.error('Database connection error:', err);
//     });

// app.use('/useropay', userRoutes);

// app.get('/', (req, res) => {
//     res.status(200).json({ message: 'Welcome to Opayuser' });
// });

// app.use((err, req, res, next) => {
//     console.error('Error:', err.message);
//     res.status(500).json({ message: 'Internal Server Error' });
// });

// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const userRoutes = require('./Routes/user.routes');

const app = express();
const PORT = process.env.PORT || 4000;
const URI = process.env.URI;

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.json({ limit: '200mb' }));

mongoose
    .connect(URI)
    .then(() => {
        console.log('Database connected successfully Opayuser');

        // Drop the index on 'username' in the 'transactions' collection after successful connection
        // mongoose.connection.db.collection('transactions').dropIndex('username_1', function (err, result) {
        //     if (err) {
        //         console.error('Error dropping index:', err);
        //     } else {
        //         console.log('Index dropped successfully:', result);
        //     }
        // });
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });

app.use('/useropay', userRoutes);

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to Opayuser' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

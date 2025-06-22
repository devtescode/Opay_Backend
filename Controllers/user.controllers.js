const { Userschema, Transaction, RecentTransaction } = require("../Models/user.models")
const SessionSchema = require("../Models/SessionSchema"); // Import session model
const jwt = require("jsonwebtoken")
const env = require("dotenv")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const { default: axios } = require("axios")
const ADMIN_SECRET_KEY = process.env.JWT_SECRET_KEY
const cloudinary = require('cloudinary').v2;
env.config()




module.exports.userWelcome = (req, res) => {
    res.send('welcome here my user opay')
    console.log("weolcone to");
}


module.exports.adminlogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if there's already an admin in the database
        const admins = await Userschema.find({ role: 'admin' });

        // If no admins exist, create one
        if (admins.length === 0) {
            const newAdmin = new Userschema({
                email: email,
                password: password, // You should hash the password here
                role: 'admin',
            });

            await newAdmin.save();
            console.log("Admin created and logged in successfully");

            // Create and send a JWT token
            const token = jwt.sign(
                { email: newAdmin.email, role: 'admin' },
                SECRET_KEY,
                { expiresIn: '1h' }
            );

            return res.status(201).json({
                message: 'Admin created and logged in successfully',
                token: token,
            });
        }

        // If more than one admin exists, reject the login attempt
        if (admins.length > 1) {
            console.log('Only one admin can exist. Multiple admins found.');
            return res.status(400).json({ message: "Only one admin can exist. Multiple admins found." });
        }

        const admin = admins[0];

        // Check if the entered email matches the stored email
        if (admin.email !== email) {
            console.log('Invalid email');
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Check if the entered password matches the stored hashed password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.log('Invalid password');
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Admin login successful, create JWT token
        const token = jwt.sign(
            { email: admin.email, role: 'admin' },
            process.env.ADMIN_SECRET_KEY,
            { expiresIn: '1h' }
        );

        // Send the response with the token
        res.status(200).json({
            message: 'Login successful',
            token: token,  // Include the token in the response
            admin: { email: admin.email },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



module.exports.createUser = async (req, res) => {
    try {
        const { username, fullname, phoneNumber, password, role, email } = req.body;

        // Validate input based on the role
        if (role === 'admin' && !email) {
            return res.status(400).json({ message: 'Email is required for admin users.' });
        }

        if (role === 'user') {
            // Ensure username and phone number are required for users
            if (!username || !phoneNumber || !fullname) {
                return res.status(400).json({ message: 'Username and phone number are required for users.' });
            }
        }

        // Check if a user with the same username or phone number already exists
        const existingUser = await Userschema.findOne({
            $or: [{ username }, { phoneNumber }]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or phone number already in use' });
        }

        // Create the user with role-specific validation (password hashing will be handled by the model)
        const newUser = new Userschema({ username, phoneNumber, password, role, email, fullname });

        // Save the new user
        await newUser.save();

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};



const getClientIP = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
};

module.exports.userlogin = async (req, res) => {
    const { password, deviceInfo, sessionId } = req.body;
    const clientIP = getClientIP(req); // Get user IP
    console.log("Device Info:", deviceInfo, "IP:", clientIP);

    if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
    }

    try {
        const users = await Userschema.find({ role: 'user' });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        let matchedUser = null;

        for (let user of users) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                matchedUser = user;
                break;
            }
        }

        if (!matchedUser) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        if (matchedUser.blocked) {
            return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
        }

        // 🔹 Check if user already has an active session (ignore device & IP)
        let existingSession = await SessionSchema.findOne({
            userId: matchedUser._id
        });

        if (existingSession && (!sessionId || sessionId !== existingSession._id.toString())) {
            return res.status(403).json({
                message: "Your account is already logged in on another device. Please log out first."
            });
        }

        let session;
        if (existingSession) {
            existingSession.loggedInAt = new Date();
            session = await existingSession.save();
        } else {
            session = await SessionSchema.create({
                userId: matchedUser._id,
                deviceInfo,
                ipAddress: clientIP,
                loggedInAt: new Date(),
            });
        }

        const token = jwt.sign(
            { userId: matchedUser._id, username: matchedUser.username, role: matchedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                userId: matchedUser._id,
                username: matchedUser.username,
                phoneNumber: matchedUser.phoneNumber,
                role: matchedUser.role,
                fullname: matchedUser.fullname,
                profilePicture: matchedUser.profilePicture,
                sessionId: session._id,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};




// Device Info: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 IP: ::1



// module.exports.userlogin = async (req, res) => {
//     const { password } = req.body; 

//     if (!password) {
//         return res.status(400).json({ message: 'Password is required.' });
//     }

//     try {
//         // Fetch only one user directly by matching the hashed password
//         // const matchedUser = await Userschema.findOne({ role: 'user' });
//         const matchedUser = await Userschema.findOne({ role: 'user' }).lean();


//         if (!matchedUser) {
//             return res.status(404).json({ message: 'No user found' });
//         }

//         // Check if the password matches
//         const isMatch = await bcrypt.compare(password, matchedUser.password);
//         if (!isMatch) {
//             return res.status(400).json({ message: 'Invalid password' });
//         }

//         // Generate JWT Token
//         const token = jwt.sign(
//             { userId: matchedUser._id, username: matchedUser.username, role: matchedUser.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '1h' }
//         );

//         console.log("User ID:", matchedUser._id);

//         res.status(200).json({
//             message: 'Login successful',
//             token,
//             user: {
//                 userId: matchedUser._id,
//                 username: matchedUser.username,
//                 phoneNumber: matchedUser.phoneNumber,
//                 role: matchedUser.role,
//                 fullname: matchedUser.fullname
//             },
//         });
//         console.log("login successful");


//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };


module.exports.useraccount = async (req, res) => {
    const { AccountNumber, Bankcode } = req.body;

    // Input Validation
    if (!AccountNumber || !Bankcode) {
        return res.status(400).json({ status: false, message: "All fields are required." });
    }

    if (AccountNumber.length !== 10) {
        return res.status(400).json({ status: false, message: "Account number must be 10 digits." });
    }

    try {
        const response = await axios.get(
            `https://api.paystack.co/bank/resolve?account_number=${AccountNumber}&bank_code=${Bankcode}&currency=NGN`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.API_SECRET}`
                }
            }
        );

        // Check API response status
        if (response.status !== 200) {
            console.log("Failed to validate account");
            return res.status(response.status).json({ status: false, message: "Failed to validate account" });
        }

        // Extract account name from the response
        const accountName = response.data.data.account_name;
        // console.log("NAme on account", accountName);

        res.status(200).json({
            status: true,
            message: "Account validated successfully.",
            accountName
        });
    } catch (err) {
        console.error("Error occurred", err.message);

        // Handle specific errors (e.g., network issues, invalid API key)
        if (err.response) {
            return res.status(err.response.status).json({
                status: false,
                message: err.response.data.message || "Failed to validate account"
            });
        }

        // Default to internal server error
        res.status(500).json({ status: false, error: err.message || "Internal Server Error" });
    }
};



module.exports.transactions = async (req, res) => {
    console.log(req.body);

    try {
        const { userId, bankName, accountNumber, accountName, amount } = req.body;

        if (!userId || !bankName || !accountNumber || !accountName || !amount) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        const user = await Userschema.findById(userId);
        console.log(user, "The userid");

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const transaction = new Transaction({
            userId,
            bankName,
            accountNumber,
            accountName,
            amount,
            fullname: user.fullname,
        });

        await transaction.save();

        // Send full transaction details
        // res.status(201).json({ 
        //     message: 'Transaction saved successfully', 
        //     transaction 
        // });
        res.status(201).json({
            message: 'Transaction saved successfully',
            transactionId: transaction._id,
            transaction,
        });


    } catch (error) {
        console.error('Error saving transaction:', error.message);
        res.status(500).json({ message: 'Failed to save transaction', error: error.message });
    }
};



module.exports.getransactions = async (req, res) => {
    try {
        const { userId } = req.params; // Assuming you pass userId in the URL
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(transactions);
        console.log(transactions);

    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ message: 'Failed to fetch transaction history' });
    }
}

module.exports.getallusers = async (req, res) => {
    try {
        const users = await Userschema.find({}, "fullname username phoneNumber blocked walletBalance isUnlimited");
        res.setHeader("Content-Type", "application/json");
        res.status(200).json(users);

    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users", error });
    }
}

module.exports.gettransactions = async (req, res) => {
    const { userId } = req.params;

    try {
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }); // Sort by newest first
        res.status(200).json(transactions);
        //   console.log("get transactions",transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ message: "Failed to fetch transactions." });
    }
}

module.exports.getCounts = async (req, res) => {
    try {
        const userCount = await Userschema.countDocuments();
        const transactionCount = await Transaction.countDocuments();
        const totalCount = userCount + transactionCount; // Sum of users and transactions

        res.status(200).json({
            userCount,
            transactionCount,
            totalCount,
        });
    } catch (error) {
        console.error('Error fetching counts:', error);
        res.status(500).json({ message: 'Failed to fetch counts.' });
    }
}

module.exports.saveRecentTransaction = async (req, res) => {
    const { userId, accountDetails } = req.body;

    try {
        // Validate the required fields
        if (!userId || !accountDetails) {
            return res.status(400).json({ message: "User ID and account details are required." });
        }

        const { accountName, accountNumber, bankName } = accountDetails;

        // Additional validation for accountDetails
        if (!accountName || !accountNumber || !bankName) {
            return res.status(400).json({ message: "All account details are required." });
        }

        // Check if a transaction with the same userId and account details already exists
        const existingTransaction = await RecentTransaction.findOne({
            userId,
            accountNumber,
            bankName
        });

        if (existingTransaction) {
            // Update the existing transaction timestamp instead of creating a duplicate
            existingTransaction.updatedAt = new Date();
            await existingTransaction.save();
            return res.status(200).json({ message: "Transaction updated as recent.", transaction: existingTransaction });
        }

        // If no duplicate exists, save a new transaction
        const newTransaction = new RecentTransaction({
            userId,
            accountName,
            accountNumber,
            bankName,
            createdAt: new Date(),
        });

        console.log("New Transaction details:", newTransaction);

        await newTransaction.save();

        return res.status(201).json({
            message: "Transaction saved successfully!",
            transaction: newTransaction,
        });
    } catch (error) {
        console.error("Error saving transaction details:", error);
        return res.status(500).json({ message: "Failed to save transaction details.", error: error.message });
    }
};



module.exports.getrecentransaction = async (req, res) => {
    const { userId } = req.params;
    const { showAll } = req.query; // Retrieve 'showAll' from the query parameters

    try {
        // Determine the limit based on whether 'showAll' is true
        const limit = showAll === "true" ? 0 : 3; // 0 means no limit, fetch all transactions if 'showAll' is true

        // Fetch transactions
        const transactions = await RecentTransaction.find({ userId })
            .sort({ createdAt: -1 }) // Sort by creation date, most recent first
            .limit(limit === 0 ? undefined : limit); // Only limit to 3 unless showAll is true
        console.log("All recent transactions", transactions)
        if (!transactions || transactions.length === 0) {
            return res.status(404).json({ message: "No transactions found." });
        }

        return res.status(200).json(transactions); // Return the transactions in the response
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({ message: "Failed to fetch transactions." });
    }
    //  
}

module.exports.deleterecenttransaction = async (req, res) => {
    try {
        const { transactionId } = req.params;  // Use the correct parameter name here

        // Find and delete the transaction
        const transaction = await RecentTransaction.findByIdAndDelete(transactionId);

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting transaction" });
    }
};


module.exports.deleteuserTransaction = async (req, res) => {
    const { id } = req.params;

    try {
        // Find and delete the transaction by ID
        const deletedTransaction = await Transaction.findByIdAndDelete(id);

        if (!deletedTransaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        console.log("Transaction deleted successfully");

        res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports.changetransactions = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { status } = req.body; // Get the status from the request body
        console.log(status, transactionId);

        // Validate that the status is one of the allowed values
        if (!['successful', 'pending', 'failed'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        // Find and update the transaction's status
        const transaction = await Transaction.findByIdAndUpdate(
            transactionId,
            { status },
            { new: true } // Return the updated document
        );
        console.log("fecthing trna scffo", transaction);


        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        console.log("my transactio", transaction);

        res.status(200).json(transaction);
    } catch (error) {
        console.error('Error updating transaction status:', error);
        res.status(500).json({ message: 'Failed to update transaction status' });
    }
}


module.exports.getlasttwotrnasaction = async (req, res) => {
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 }) // Sort by newest
        .limit(2); // Fetch only the last two
    res.json(transactions);
}


module.exports.blockUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the user by ID and update the 'blocked' field
        const user = await Userschema.findByIdAndUpdate(id, { blocked: true }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure that the user _id is returned as a string
        const userResponse = { ...user.toObject(), _id: user._id.toString() };

        console.log('User blocked successfully');
        res.status(200).json({ message: 'User blocked successfully', user: userResponse });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({ message: 'Error blocking user', error });
    }
}

module.exports.unblockUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the user by ID and update the 'blocked' field
        const user = await Userschema.findByIdAndUpdate(id, { blocked: false }, { new: true });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure that the user _id is returned as a string
        const userResponse = { ...user.toObject(), _id: user._id.toString() };

        console.log("User unblocked successfully");
        res.status(200).json({ message: 'User unblocked successfully', user: userResponse });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({ message: 'Error unblocking user', error });
    }
}

module.exports.activesessions = async (req, res) => {
    try {
        const sessions = await SessionSchema.find().populate('userId', 'username');
        // console.log("Active user", sessions);

        if (sessions.length === 0) {
            return res.status(404).json({ message: 'No active sessions found' });
        }

        // Group sessions by deviceInfo and keep the latest session per device
        const deviceSessionsMap = new Map();

        for (const session of sessions) {
            if (
                !deviceSessionsMap.has(session.deviceInfo) ||
                new Date(session.loggedInAt) > new Date(deviceSessionsMap.get(session.deviceInfo).loggedInAt)
            ) {
                deviceSessionsMap.set(session.deviceInfo, session);
            }
        }

        // Convert the Map values to an array
        const uniqueSessions = Array.from(deviceSessionsMap.values());

        res.status(200).json(uniqueSessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const { getSocket } = require('../socket'); // Import getSocket function

module.exports.logoutsession = async (req, res) => {
    const { sessionId } = req.params;

    try {
        // Ensure that io is initialized before using it
        const io = getSocket(); // This will throw an error if socket is not initialized

        // Find the session from the database
        const session = await SessionSchema.findById(sessionId);
        console.log("All session:", session);

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Delete the session from the database
        await SessionSchema.findByIdAndDelete(sessionId);

        // Emit event to the client-side about the session logout
        io.emit("sessionLoggedOut", { sessionId });
        console.log("Session logged out successfully", sessionId);

        // Send response back to the client
        res.status(200).json({ message: "Session logged out successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error logging out session" });
    }
};


// module.exports.addmoney = async (req, res) => {
//     const { amount } = req.body;
//     const token = req.headers.authorization?.split(' ')[1];  // Get token from "Bearer <token>"

//     if (!token) {
//         return res.status(401).json({ message: 'No token provided' });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const userId = decoded.userId;      

//         if (!amount || amount <= 0) {
//             return res.status(400).json({ message: 'Invalid amount' });
//         }

//         const user = await Userschema.findById(userId);

//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         user.walletBalance = (user.walletBalance || 0) + Number(amount);
//         await user.save();

//         res.json({ message: 'Money added successfully', newBalance: user.walletBalance });

//     } catch (error) {
//         console.error('Add Money Error:', error);
//         res.status(500).json({ message: 'Something went wrong' });
//     }
// };

module.exports.addmoney = async (req, res) => {
    const { amount } = req.body;
    const token = req.headers.authorization?.split(' ')[1];  // Get token from "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await Userschema.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 🚨 Overwrite the balance instead of adding to it
        user.walletBalance = Number(amount);  // This clears old balance and sets new one directly

        await user.save();

        res.json({ message: 'Wallet balance updated successfully', newBalance: user.walletBalance });

    } catch (error) {
        console.error('Add Money Error:', error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};


module.exports.getuserbalance = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verify token and get user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Find user by ID
        const user = await Userschema.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ walletBalance: user.walletBalance || 0 });

    } catch (error) {
        console.error('Fetch Balance Error:', error.message);

        // Detect token-related errors
        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError'
        ) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        res.status(500).json({ message: 'Failed to fetch user balance' });
    }
};


module.exports.updatebalance = async (req, res) => {
    const { amount } = req.body;  // Amount to subtract
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Userschema.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.walletBalance < amount) {
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        user.walletBalance -= amount;
        await user.save();

        res.json({ message: 'Balance updated successfully', newBalance: user.walletBalance });
    } catch (error) {
        console.error('Update Balance Error:', error);
        res.status(500).json({ message: 'Something went wrong' });
    }
};


module.exports.getTotalBalance = async (req, res) => {
    try {
        const users = await Userschema.find({}, "walletBalance");

        const totalBalance = users.reduce((sum, user) => sum + (user.walletBalance || 0), 0);

        res.status(200).json({ totalBalance });
    } catch (error) {
        console.error("Error calculating total balance:", error);
        res.status(500).json({ message: "Failed to calculate total balance", error });
    }
};


module.exports.updatemoneyout = async (req, res) => {
    // console.log("hit updatemoneyout");

    // try {
    //     const { userId, amount } = req.body;
    //     // Find User and Update `moneyOut`
    //     const user = await Userschema.findById(userId);
    //     if (!user) return res.status(404).json({ message: 'User not found' });

    //     user.moneyOut = (user.moneyOut || 0) + amount; // Add to existing moneyOut
    //     await user.save();

    //     res.json({ success: true, moneyOut: user.moneyOut });
    // } catch (error) {
    //     console.error('Error updating moneyOut:', error);
    //     res.status(500).json({ message: 'Server error' });
    // }
    console.log("hit updatemoneyout");

    try {
        const { userId, amount } = req.body;
        const token = req.headers['authorization']?.split(' ')[1];

        // Verify JWT token
        if (!token) {
            return res.status(401).json({ message: 'Access Denied. No Token Provided.' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ message: 'TokenExpiredError' });
                }
                return res.status(403).json({ message: 'Invalid Token' });
            }

            // Find User and Update `moneyOut`
            const user = await Userschema.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });

            // Check if today is the last day of the month
            const today = new Date();
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

            if (today.getDate() === lastDay) {
                // Delete the `moneyOut` field from the database
                await Userschema.updateOne({ _id: userId }, { $unset: { moneyOut: 1 } });
                console.log(`moneyOut field deleted for user ${userId} at month-end.`);
                return res.json({ success: true, moneyOut: 0 }); // Send 0 to frontend
            } else {
                user.moneyOut = (user.moneyOut || 0) + amount; // Add to existing moneyOut
                await user.save();
                return res.json({ success: true, moneyOut: user.moneyOut });
            }
        });
    } catch (error) {
        console.error('Error updating moneyOut:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports.getMoneyOut = async (req, res) => {
    try {
        const user = await Userschema.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ moneyOut: user.moneyOut || 0 });
    } catch (error) {
        console.error('Error fetching moneyOut:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports.getrecentransactionsearch = async (req, res) => {
    const { userId } = req.params; // Get userId from request params

    try {
        // Fetch all transactions for the user, sorted by most recent
        const transactions = await RecentTransaction.find({ userId })

        console.log("All recent transactions:", transactions);

        if (!transactions || transactions.length === 0) {
            return res.status(404).json({ message: "No transactions found." });
        }

        return res.status(200).json(transactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({ message: "Failed to fetch transactions." });
    }
};


module.exports.upload = async (req, res) => {
    try {
        const { userId } = req.body;
        console.log("Received userId:", userId);

        // Ensure userId is converted to ObjectId
        const user = await Userschema.findById(new mongoose.Types.ObjectId(userId));

        console.log(user, "userdetails");

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!req.file) {
            console.log("No file uploaded");
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(req.file.path);

        // Update user with uploaded picture URL (example)
        user.profilePicture = req.file.path; // Assuming you add a field for profile picture
        await user.save();
        res.json({ message: 'Upload successful', url: req.file.path });
        console.log("Upload successful");
    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};


//   module.exports.changepassword = async(req, res)=>{
//     const { userId, oldPassword, newPassword } = req.body;

//     try {
//       const user = await Userschema.findById(userId);
//       console.log(user, "user change password");

//       if (!user) return res.status(404).json({ message: 'User not found' });

//       const isMatch = await bcrypt.compare(oldPassword, user.password);
//       if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });
//       console.log(user.password, "user password");

//       const hashed = await bcrypt.hash(newPassword, 10);
//       user.password = hashed;
//       await user.save();
//       console.log(hashed, "hashed password");


//       res.status(200).json({ message: 'Password updated successfully' });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: 'Server error' });
//     }
//   }

module.exports.changepassword = async (req, res) => {
    const { token, OldPassword, NewPassword } = req.body;

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        console.log("Decoded JWT:", decoded);
        if (err) {
            console.log("Token verification error:", err);
            return res.status(401).json({ status: false, message: "Invalid or expired token" });
        }

        try {
            const user = await Userschema.findById(decoded.userId);
            if (!user) {
                return res.status(404).json({ status: false, message: "User not found" });
            }

            const isPasswordCorrect = await user.compareUser(OldPassword);
            if (!isPasswordCorrect) {
                return res.status(400).json({ status: false, message: "Incorrect password" });
            }

            if (OldPassword === NewPassword) {
                return res.status(400).json({ status: false, message: "New password cannot be the same as the old password" });
            }

            // Check if the new password has already been used by any user
            const users = await Userschema.find({});
            for (let existingUser of users) {
                const reused = await bcrypt.compare(NewPassword, existingUser.password);
                if (reused) {
                    return res.status(400).json({ status: false, message: "Error occured when creating password  try different password" });
                }
            }

            user.password = NewPassword;
            await user.save();

            return res.status(200).json({ status: true, message: "Password changed successfully" });

        } catch (err) {
            console.error("Error while changing password:", err);
            return res.status(500).json({ status: false, message: "Server error" });
        }
    });
};

module.exports.changeadminpassword = (req, res) => {
    const { adminToken, OldPassword, NewPassword } = req.body;

    // Verify the admin token
    jwt.verify(adminToken, process.env.ADMIN_SECRET_KEY, async (err, decoded) => {
        if (err) {
            console.log("Token verification error:", err);
            return res.status(401).json({ status: false, message: "Invalid or expired token" });
        }

        try {
            // Find the user by the email in the decoded token and check if the role is 'admin'
            const user = await Userschema.findOne({ email: decoded.email });
            console.log(user, "admin onlyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy");

            if (!user || user.role !== 'admin') {
                return res.status(404).json({ status: false, message: "Admin user not found" });
            }

            // Compare the old password
            const isPasswordCorrect = await user.compareUser(OldPassword);
            if (!isPasswordCorrect) {
                return res.status(400).json({ status: false, message: "Incorrect password" });
            }

            // Check if the new password is the same as the old one
            if (OldPassword === NewPassword) {
                return res.status(400).json({ status: false, message: "New password cannot be the same as the old password" });
            }

            // Check if the new password has already been used by any user
            const users = await Userschema.find({});
            for (let existingUser of users) {
                const reused = await bcrypt.compare(NewPassword, existingUser.password);
                if (reused) {
                    return res.status(400).json({ status: false, message: "Password is already in use, please choose a different password" });
                }
            }

            // Set the new password (no need to manually hash, because it's handled by your schema)
            user.password = NewPassword;
            await user.save();
            console.log("Password changed successfully", user.password)

            return res.status(200).json({ status: true, message: "Password changed successfully" });

        } catch (err) {
            console.ercoror("Error while changing password:", err);
            return res.status(500).json({ status: false, message: "Server error" });
        }
    });
};


module.exports.reverseTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findById(id);
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }

        if (transaction.status === "pending") {
            transaction.status = "Reversed";
            await transaction.save();
        }

        res.status(200).json({ message: "Transaction Reversed", transaction });
    } catch (error) {
        console.error("Error reversing transaction:", error);
        res.status(500).json({ message: "Failed to reverse transaction" });
    }
};


module.exports.checkTransactionLimit = async (req, res) => {

    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const user = await Userschema.findById(userId);
        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        // ✅ If unlimited, skip the check
        if (user.isUnlimited) {
            console.log("Unlimited user. Proceed.");
            return res.status(200).json({ status: true, message: "Unlimited user. Proceed." });
        }


        // Get today's start and end
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayTransactions = await Transaction.find({
            userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        if (todayTransactions.length >= 2) {
            return res.status(403).json({ status: false, message: "Daily transaction limit reached" });
        }

        return res.status(200).json({ status: true, message: "You can proceed" });

    } catch (err) {
        console.error(err);
        return res.status(401).json({ status: false, message: "Invalid token" });
    }

}


module.exports.setUnlimited = async (req, res) => {
    const { userId, unlimited } = req.body;

    try {
        // If unlimited is true, set isUnlimited: true and isLimited: false
        // If unlimited is false, set isUnlimited: false and isLimited: true
        await Userschema.findByIdAndUpdate(userId, {
            isUnlimited: unlimited,
            isLimited: !unlimited,
        });

        const statusText = unlimited ? "unlimited" : "limited";

        console.log(`User (${userId}) access set to: ${statusText}`);

        res.status(200).json({
            status: true,
            message: `User set to ${statusText}`,
        });

    } catch (err) {
        console.error("Error setting user access:", err);
        res.status(500).json({
            status: false,
            message: "Could not update user",
        });
    }
};

module.exports.fundaccount = async (req, res) => {
    const { username, amount } = req.body;
    console.log(req.body, "get the details");

    try {
        const user = await Userschema.findOne({ username: username });

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Generate a dummy email for Paystack (required)
        const dummyEmail = `${user.username}@opay.com`; // Use your actual domain if possible
        console.log(dummyEmail, "my dummyEmail");
        
        // Create a transaction request with Paystack
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: dummyEmail, // required field
                amount: amount * 100, // Paystack requires the amount in kobo
                metadata: {
                    username: user.username,
                    fullname: user.fullname,
                    phone: user.phoneNumber
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.API_SECRET}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.status) {
            // Transaction link generated
            res.send({
                status: true,
                message: 'Account funding success',
                authorization_url: response.data.data.authorization_url
            });

            console.log("Link response successfully sent");
        } else {
            res.status(400).send('Funding failed');
            console.log("Funding failed");
        }
    } catch (error) {
        console.error(
            'Error funding account',
            error.response ? error.response.data : error.message
        );
        res.status(500).send('Internal server error');
    }
};

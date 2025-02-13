const { Userschema, Transaction, RecentTransaction } = require("../Models/user.models")
const SessionSchema = require("../Models/SessionSchema"); // Import session model
const jwt = require("jsonwebtoken")
const env = require("dotenv")
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const { default: axios } = require("axios")
// const ADMIN_SECRET_KEY= process.env.JWT_SECRET_KEY 
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



module.exports.userlogin = async (req, res) => {
    const { password, deviceInfo } = req.body; // Expect device info in request
    console.log("Device Info:", deviceInfo);
    
    if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
    }

    try {
        // Find all users (with role 'user')
        const users = await Userschema.find({ role: 'user' });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        let matchedUser = null;

        // Loop through each user and check the password
        for (let user of users) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                matchedUser = user;
                break; // Stop loop if user is found
            }
        }

        if (!matchedUser) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Check if the user is blocked
        if (matchedUser.blocked) {
            return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
        }

        // Generate a JWT token
        const token = jwt.sign(
            { userId: matchedUser._id, username: matchedUser.username, role: matchedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log("User ID:", matchedUser._id);

        // **✅ Only save session if login is successful**
        if (token) {
            const existingSession = await SessionSchema.findOne({
                userId: matchedUser._id,
                deviceInfo: deviceInfo || "Unknown Device",
            });

            if (existingSession) {
                // Update only the `loggedInAt` timestamp instead of creating a new entry
                existingSession.loggedInAt = new Date();
                await existingSession.save();
            } else {
                // Create a new session if no matching device session exists
                await SessionSchema.create({
                    userId: matchedUser._id,
                    deviceInfo: deviceInfo || "Unknown Device",
                    loggedInAt: new Date(),
                });
            }
        }

        // Send success response
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                userId: matchedUser._id,
                username: matchedUser.username,
                phoneNumber: matchedUser.phoneNumber,
                role: matchedUser.role,
                fullname: matchedUser.fullname,
                deviceInfo,
                loggedInAt: new Date(),
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


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
    try {
        const { userId, bankName, accountNumber, accountName, amount } = req.body;

        // Validate required fields
        if (!userId || !bankName || !accountNumber || !accountName || !amount) {
            console.log("All required fields must be provided");

            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        const user = await Userschema.findById(userId);  // Replace userId with the correct variable or input
        if (!user) {
            console.error('User not found');
            return;  // Stop further execution if user not found
        }


        const transaction = new Transaction({
            userId,
            bankName,
            accountNumber,
            accountName,
            amount,
            fullname: user.fullname,
        });

        // await transaction.save();
        transaction.save()
            .then(savedTransaction => {
                console.log('Transaction saved:', savedTransaction);
                res.status(201).json({ message: 'Transaction saved successfully',  transactionId: transaction._id });
                console.log('Transaction saved successfully:', transaction);
            })
            .catch(error => {
                console.error('Error saving transaction:', error);
            });
    } catch (error) {
        console.error('Error saving transaction:', error.message);
        res.status(500).json({ message: 'Failed to save transaction' });
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
        const users = await Userschema.find({}, "fullname username phoneNumber");
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
  
      // Create a new transaction record
      const newTransaction = new RecentTransaction({
        userId,
        accountName,
        accountNumber,
        bankName,
      });
  
      console.log("New Transaction details:", newTransaction);
  
      // Save the transaction to the database
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


module.exports.getrecentransaction = async(req, res)=>{
    const { userId } = req.params;
    const { showAll } = req.query; // Retrieve 'showAll' from the query parameters
  
    try {
      // Determine the limit based on whether 'showAll' is true
      const limit = showAll === "true" ? 0 : 3; // 0 means no limit, fetch all transactions if 'showAll' is true
  
      // Fetch transactions
      const transactions = await RecentTransaction.find({ userId })
        .sort({ createdAt: -1 }) // Sort by creation date, most recent first
        .limit(limit === 0 ? undefined : limit); // Only limit to 3 unless showAll is true
        console.log("All recent transactions",transactions)
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

module.exports.deleterecenttransaction = async(req, res) => {
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


module.exports.deleteuserTransaction = async(req, res)=>{
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

module.exports.changetransactions = async(req, res)=>{
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
        console.log("fecthing trna scffo",transaction);
        

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


module.exports.getlasttwotrnasaction = async(req, res)=>{
    const { userId } = req.params;
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 }) // Sort by newest
      .limit(2); // Fetch only the last two
    res.json(transactions);   
} 


module.exports.blockUser = async(req, res)=>{
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

module.exports.unblockUser = async(req,res)=>{
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
        console.log("Active user", sessions);

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

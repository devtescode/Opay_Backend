const { Userschema, Transaction } = require("../Models/user.models")
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
    const { password } = req.body; // Only password is expected in the body

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

        // Generate a JWT token (optional for session management)
        const token = jwt.sign(
            { userId: matchedUser._id, username: matchedUser.username, role: matchedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log("my userId", matchedUser._id);


        // Send success response
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                userId: matchedUser._id,
                username: matchedUser.username,
                phoneNumber: matchedUser.phoneNumber,
                role: matchedUser.role,
                fullname: matchedUser.fullname
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


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
        console.log("NAme on account", accountName);

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
                res.status(201).json({ message: 'Transaction saved successfully' });
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

module.exports.getransactions = async (req, res)=>{
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

module.exports.getallusers = async (req, res)=>{
    try {
        const users = await Userschema.find({}, "fullname username phoneNumber");
        res.status(200).json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Failed to fetch users", error });
      }
}

module.exports.gettransactions = async (req, res)=>{
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
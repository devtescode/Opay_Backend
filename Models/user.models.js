const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

let schema = mongoose.Schema({
  email: {
    type: String,
    required: function () {
      return this.role === 'admin'; // Required only if the role is 'admin'
    },
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: function () {
      return this.role === 'user'; // Make username required only for users
    },
    // unique: true,
    // sparse: true, // Allows multiple null values
    trim: true,
  },
  fullname: {
    type: String,
    required: function () {
      return this.role === 'user'; // Make username required only for users
    },
    // unique: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: function () {
      return this.role === 'user'; // Make phoneNumber required only for users
    },
    // unique: true,
  },
}, { timestamps: true });


// schema.index({ username: 1 }, { unique: true, partialFilterExpression: { username: { $exists: true, $ne: null } } });
// schema.index({ fullname: 1 }, { unique: true, partialFilterExpression: { fullname: { $exists: true, $ne: null } } });
// schema.index({ phoneNumber: 1 }, { unique: true, partialFilterExpression: { phoneNumber: { $exists: true, $ne: null } } });


const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'useropay',
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['successful', 'pending', 'failed'], // Optional: Track transaction status
      default: 'successful',
    },

  },
  { timestamps: true }
);


const transactionDetailsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Transaction",
    },
    accountName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);





// Pre-save hook to hash the password
const saltRounds = 10;
schema.pre("save", async function (next) {
  if (this.isModified("password")) {
      try {
          const hashedPassword = await bcrypt.hash(this.password, saltRounds);
          this.password = hashedPassword;
          next();
          console.log("my password model", this.password);
          console.log("my password model", hashedPassword);
          
      } catch (err) {
          console.error("Error hashing password:", err);
          next(err);
      }
  } else {
      next();
  }
});


// Method to compare the entered password with the hashed password
schema.methods.compareUser = async function (userPass) {
  try {
    const user = await bcrypt.compare(userPass, this.password);  // Use lowercase 'password'
    return user;
  } catch (err) {
    console.log(err);
  }
};

const Userschema = mongoose.model("useropay", schema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const RecentTransaction =  mongoose.model("recentdetail", transactionDetailsSchema);

// module.exports = mongoose.model('Transaction', transactionSchema);
module.exports = { Userschema, Transaction, RecentTransaction };

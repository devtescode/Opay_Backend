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
    unique: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: function () {
      return this.role === 'user'; // Make phoneNumber required only for users
    },
    unique: true,
  },
}, { timestamps: true });

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
module.exports = { Userschema };

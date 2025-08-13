const express = require("express")
const { userWelcome, adminlogin, createUser, userlogin, useraccount, transactions, getransactions, getallusers, gettransactions, getCounts, saveRecentTransaction, getrecentransaction, deleterecenttransaction, deleteuserTransaction, changetransactions, getlasttwotrnasaction, blockUser, unblockUser, activesessions, logoutsession, addmoney, getuserbalance, updatebalance, getTotalBalance, getMoneyOut, updatemoneyout, getrecentransactionsearch, upload, changepassword, changeadminpassword, reverseTransaction, checkTransactionLimit, setUnlimited, fundaccount, payments, funding, delectfunding, getRecentTransactionsbyOpay } = require("../Controllers/user.controllers")
const router = express.Router()
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;




// Cloudinary config
cloudinary.config({
  cloud_name: 'dr7hnm895',
  api_key: '368551591217955',
  api_secret: 'DfUAAD3ie9BnUuKO2puTvzTVpSc',
});


// CLOUD_NAME = dr7hnm895
// API_KEY = 368551591217955
// API_SECRETCLOUD = DfUAAD3ie9BnUuKO2puTvzTVpSc

// Multer + Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const uploadpic = multer({ storage: storage });




router.get("/user", userWelcome);
router.post("/adminlogin", adminlogin)
router.post("/createuser", createUser)
router.post("/userlogin", userlogin)
router.post("/useraccount", useraccount)
router.post("/transactions", transactions)
router.get("/getransactions/:userId", getransactions)
router.get("/getallusers", getallusers)
router.get("/gettransactions/:userId", gettransactions)
router.get("/getCounts", getCounts)
router.post("/saveRecentTransaction", saveRecentTransaction)
router.get("/getrecentransaction/:userId", getrecentransaction)
router.delete("/deleterecenttransaction/:transactionId", deleterecenttransaction)
router.delete("/deleteuserTransaction/:id", deleteuserTransaction)
router.put("/changetransactions/:transactionId", changetransactions)
router.get("/getlasttwotrnasaction/:userId", getlasttwotrnasaction)
router.put("/blockUser/:id", blockUser)
router.put("/unblockUser/:id", unblockUser)
router.get("/activesessions", activesessions)
router.delete("/logoutsession/:sessionId", logoutsession)
router.post("/addmoney", addmoney)
router.get("/getuserbalance", getuserbalance)
router.post("/updatebalance", updatebalance)
router.get("/getTotalBalance", getTotalBalance)
router.post("/updatemoneyout", updatemoneyout)
router.get("/getMoneyOut/:userId", getMoneyOut)
router.get("/getrecentransactionsearch/:userId", getrecentransactionsearch)
router.post('/uploadpicture', uploadpic.single('image'), upload)
router.post("/changepassword", changepassword)
router.post("/changeadminpassword", changeadminpassword)
router.put("/reverseTransaction/:id", reverseTransaction)
router.post("/checkTransactionLimit", checkTransactionLimit)
router.post("/setUnlimited", setUnlimited)
router.post("/fundaccount", fundaccount)
router.get("/payments", payments)
router.get("/funding", funding)
router.delete("/delectfunding/:id", delectfunding)
router.get("/getRecentTransactionsbyOpay/:userId", getRecentTransactionsbyOpay)
module.exports = router
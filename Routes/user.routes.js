const express = require("express")
const { userWelcome, adminlogin, createUser, userlogin, useraccount, transactions, getransactions, getallusers, gettransactions, getCounts, saveRecentTransaction, getrecentransaction, deleterecenttransaction, deleteuserTransaction, changetransactions, getlasttwotrnasaction, blockUser, unblockUser, activesessions, logoutsession, addmoney, getuserbalance, updatebalance, getTotalBalance, getMoneyOut, updatemoneyout, getrecentransactionsearch, upload, changepassword, changeadminpassword, reverseTransaction, checkTransactionLimit, setUnlimited, fundaccount, payments, funding, delectfunding, getRecentTransactionsbyOpay, sessionstatus } = require("../Controllers/user.controllers")
const router = express.Router()
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { authenticate, requireUser, requireAdmin, requireSelfOrAdmin } = require("../Middleware/auth");



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



/* ------------------------------------------------------------------ *
 * Public routes
 * ------------------------------------------------------------------ */
router.get("/user", userWelcome);
router.post("/adminlogin", adminlogin)
router.post("/createuser", createUser)
router.post("/userlogin", userlogin)

/* ------------------------------------------------------------------ *
 * User routes (role: 'user')
 * ------------------------------------------------------------------ */
router.post("/useraccount", authenticate, requireUser, useraccount)
router.post("/transactions", authenticate, requireUser, transactions)
router.post("/saveRecentTransaction", authenticate, requireUser, saveRecentTransaction)
router.post("/addmoney", authenticate, requireUser, addmoney)
router.post("/updatebalance", authenticate, requireUser, updatebalance)
router.post("/updatemoneyout", authenticate, requireUser, updatemoneyout)
router.post("/changepassword", authenticate, requireUser, changepassword)
router.post("/checkTransactionLimit", authenticate, requireUser, checkTransactionLimit)
router.post("/fundaccount", authenticate, requireUser, fundaccount)
router.post('/uploadpicture', authenticate, requireUser, uploadpic.single('image'), upload)

router.get("/getuserbalance", authenticate, requireUser, getuserbalance)
router.get("/getMoneyOut/:userId", authenticate, requireSelfOrAdmin, getMoneyOut)
router.get("/getransactions/:userId", authenticate, requireSelfOrAdmin, getransactions)
router.get("/gettransactions/:userId", authenticate, requireSelfOrAdmin, gettransactions)
router.get("/getrecentransaction/:userId", authenticate, requireSelfOrAdmin, getrecentransaction)
router.get("/getrecentransactionsearch/:userId", authenticate, requireSelfOrAdmin, getrecentransactionsearch)
router.get("/getlasttwotrnasaction/:userId", authenticate, requireSelfOrAdmin, getlasttwotrnasaction)
router.get("/getRecentTransactionsbyOpay/:userId", authenticate, requireSelfOrAdmin, getRecentTransactionsbyOpay)
router.delete("/deleterecenttransaction/:transactionId", authenticate, requireUser, deleterecenttransaction)
router.put("/changetransactions/:transactionId", authenticate, requireUser, changetransactions)
router.put("/reverseTransaction/:id", authenticate, requireUser, reverseTransaction)
router.get("/sessionstatus", authenticate, requireUser, sessionstatus)

/* ------------------------------------------------------------------ *
 * Admin routes (role: 'admin')
 * ------------------------------------------------------------------ */
router.get("/getallusers", authenticate, requireAdmin, getallusers)
router.get("/getCounts", authenticate, requireAdmin, getCounts)
router.get("/getTotalBalance", authenticate, requireAdmin, getTotalBalance)
router.get("/activesessions", authenticate, requireAdmin, activesessions)
router.get("/payments", authenticate, requireAdmin, payments)
router.get("/funding", authenticate, requireAdmin, funding)
router.delete("/delectfunding/:id", authenticate, requireAdmin, delectfunding)
router.delete("/deleteuserTransaction/:id", authenticate, requireAdmin, deleteuserTransaction)
router.put("/blockUser/:id", authenticate, requireAdmin, blockUser)
router.put("/unblockUser/:id", authenticate, requireAdmin, unblockUser)
router.post("/setUnlimited", authenticate, requireAdmin, setUnlimited)
router.delete("/logoutsession/:sessionId", authenticate, requireAdmin, logoutsession)
router.post("/changeadminpassword", authenticate, requireAdmin, changeadminpassword)

module.exports = router

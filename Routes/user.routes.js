const express = require("express")
const { userWelcome, adminlogin, createUser, userlogin, useraccount, transactions, getransactions, getallusers, gettransactions, getCounts, saveRecentTransaction, getrecentransaction, deleterecenttransaction, deleteuserTransaction, changetransactions, getlasttwotrnasaction } = require("../Controllers/user.controllers")
const router = express.Router()

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

module.exports = router
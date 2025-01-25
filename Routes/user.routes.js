const express = require("express")
const { userWelcome, adminlogin, createUser, userlogin, useraccount, transactions, getransactions, getallusers, gettransactions, getCounts } = require("../Controllers/user.controllers")
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

module.exports = router
const express = require("express")
const { userWelcome, adminlogin, createUser, userlogin, useraccount } = require("../Controllers/user.controllers")
const router = express.Router()

router.get("/user", userWelcome);
router.post("/adminlogin", adminlogin)
router.post("/createuser", createUser)
router.post("/userlogin", userlogin)
router.post("/useraccount", useraccount)

module.exports = router
const express = require("express")
const { userWelcome, adminlogin, createUser, userlogin } = require("../Controllers/user.controllers")
const router = express.Router()

router.get("/user", userWelcome);
router.post("/adminlogin", adminlogin)
router.post("/createuser", createUser)
router.post("/userlogin", userlogin)

module.exports = router
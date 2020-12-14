const express = require("express")
const detectXSS = require("../middleware/xss")
const User = require("../models/user")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const accountRouter = express.Router()

accountRouter.post("/register", detectXSS, async (req, res) => {
    if (req.body.password !== req.body.reenter) {
        return res.status(400).send({error: "Passwords do not match."})
    }
    if (req.body.password.length < 8) {
        return res.status(400).send({error: "Password must be at least 8 characters long."})
    }
    const preexistingUser = await User.findOne({username: req.body.username})
    if (preexistingUser) {
        return res.status(400).send({error: "Account with username already exists."})
    }
    let user = new User({ 
        username: req.body.username,
        password: await bcrypt.hash(req.body.password, 8)
    })
    const token = await user.generateAuthToken()
    req.session.token = token
    try {
        await user.save()
    } catch (error) {
        console.log(error)
        return res.status(400).send({error: "An unknown error occurred."})
    }
    return res.status(200).send()
})

accountRouter.post("/login", detectXSS, async (req, res) => {
    const preexistingUser = await User.findOne({username: req.body.username})
    if (!preexistingUser) {
        return res.status(400).send({error: "Username or password is incorrect."})
    }
    const passwordsMatch = await bcrypt.compare(req.body.password, preexistingUser.password)
    if (!passwordsMatch) {
        return res.status(400).send({error: "Username or password is incorrect."})
    }
    const token = await preexistingUser.generateAuthToken()
    req.session.token = token
    return res.status(200).send()
})

accountRouter.post("/retrieve", async (req, res) => {
    const token = req.session.token
    if (!token) {
        return res.status(400).send()
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findOne({_id: decoded, token})
    if (!user) {
        return res.status(400).send()
    }
    req.session.user = user
    return res.status(200).send(user)
})

module.exports = accountRouter
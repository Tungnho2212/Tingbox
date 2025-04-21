const express = require('express');
const router = express.Router();
const User = require('../app/models/User');
const UserController = require('../app/controllers/UserController');

router.get('/register', UserController.registerForm);
router.post('/register', UserController.register);
router.get('/login', UserController.loginForm);
router.post('/login', UserController.login);
router.get('/logout', UserController.logout);

module.exports = router;

var express = require('express');
var router = express.Router();
var user_controller = require('../controllers/wsController');

router.get('/getPort', user_controller.getPort);


module.exports = router;

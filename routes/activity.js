var express = require('express');
var router = express.Router();
var act_controller = require('../controllers/activityController');

var checkForSession = function(req){
    var sesh = req.session;
    if(!sesh.login || !sesh.actType){
        return false;
    }
    return true;
};

router.all('*', function (req, res, next) {
    let userVerified = checkForSession(req);
    if(userVerified) {
        next() // pass control to the next handler
    }else{
        res.redirect('/');
    }
});

router.get('/create/:type', act_controller.createActivityInit);
router.get('/view/:type/:id', act_controller.viewActivity);
router.post('/create', act_controller.createActivity);
router.get('/acceptInvite/:activityId', act_controller.acceptInvite);

module.exports = router;

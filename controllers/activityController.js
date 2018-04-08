var sesh;
var activityType = require('../models/activity/activityType');
var activity = require('../models/activity/activity');
var activityUser = require('../models/users/activityUser');
var moment = require('moment');


exports.createActivityInit = function(req, res){
    sesh = req.session;
    var type = req.params.type;
    res.render('activity/create', {type: type, csrf : req.csrfToken()});
};

exports.acceptInvite = function(req, res){
    sesh = req.session;
    let id = req.params.activityId;
    if(!id){
        return res.redirect('/profile');
    }
    activityUser.findFromUser(sesh.login, sesh.actType, function(err, actUser, user){
        activity.findOne({_id: id}, function(err, act){
            act.participants.push(actUser._id);
            act.save(function(err){
                generateActivityObj(act, actUser, false, function(viewObj){
                    return res.render('activity/viewActivity', viewObj);
                })
            });
        });
    })
};

exports.createActivity = function(req, res){
    sesh = req.session;
    var name = req.body.name;
    var typeName = req.body.activityType;
    var numParticipants = req.body.minParticipants;
    var timeOfActivity = moment(req.body.activityDate).format();
    var location = req.body.locationName;
    var eircode = req.body.eircode;

    var error = false;

/*    if(!name.match('[^A-Za-z0-9]')){
        error = 'Invalid name entered';
    }
    if(!location.match('[^A-Za-z0-9]')){
        error = 'Invalid name entered';
    }
    if(!eircode.match('[^A-Za-z0-9]')){
        error = 'Invalid name entered';
    }
    if(numParticipants < 2){
        error = 'Must select at least 2 participants';
    }
    if(!timeOfActivity.isValid()){
        error = 'Please select a valid date and time for the activity';
    }*/

    activityType.findOne({name: typeName}).exec(function(err, typeFound){
        if(err){
          //  return handleError(err);
        }

        if(!typeFound){
            error = 'Error creating activity';
        }

        if(error){
            return res.render('activity/create', {type: typeName,error: error, csrf : req.csrfToken()});
        }


        activityUser.findFromUser(sesh.login, typeName, function(err, actUser){
            if(err){
                res.send(err);
            }

            activity.create({
                name: name,
                type: typeFound._id,
                min_participants: numParticipants,
                location_name: location,
                activity_date: timeOfActivity,
                created_on: moment().format(),
                created_by: actUser._id,
                participants: [actUser._id]
            }, function (err, activityCreated) {
                if (err) {
                    throw err;
                }
                //res.redirect('/activity/view');
                res.redirect('/activity/view/' + typeFound.name + '/' + activityCreated._id);
            });
        });
    });
};

exports.viewActivity = function(req, res){
    sesh = req.session;
    var typeName = req.params.type;
    var activityId = req.params.id;

    activity.findById(activityId, function(err, actObj){
        if(err){
            throw err;
        }
        if(!actObj){
            return res.redirect('/profile');
        }
        // get the creator
        activityUser.findFromUser(sesh.login, typeName, function(err, actUser){
            if(err){
                throw err;
            }
            if(!actUser){
                return res.redirect('/profile');
            }
            var userId = actUser._id;
            var creatorId = actObj.created_by;

            let running = false;
            actObj.checkForParticipant(userId, function(exists){
                if(!exists && !userId.equals(creatorId)){
                    actUser.notifications.forEach(function(notification){
                       if(notification.activity.equals(activityId)){
                           running = true;
                           generateActivityObj(actObj, actUser, true, function(viewObj){
                               return res.render('activity/viewActivity', viewObj);
                           });
                       }else{
                           console.log(notification.activity + "!==" +activityId);
                       }
                    });
                    if(!running) {
                        return res.redirect('/profile');
                    }
                }
                return generateActivityObj(actObj, actUser, false, function(viewObj){
                    return res.render('activity/viewActivity', viewObj);
                });
            });
        });
    })
};

let generateActivityObj = function(actObj, actUser, readOnly, _callback){
    actObj.getParticipants(function(participants) {
        activityType.findOne({name: sesh.actType}).exec(function (err, typeObj) {

            actObj.activity_date = moment(actObj.activity_date).format('MMMM Do YYYY, h:mm:ss a');
            actObj.created_on = moment(actObj.created_on).format('MMMM Do YYYY, h:mm:ss a');

            console.log(moment(actObj.activity_date).format('MMMM Do YYYY, h:mm:ss a'));

            var visualAct = {
                _id : actObj._id,
                name: actObj.name,
                min_participants: actObj.min_participants,
                location_name: actObj.location_name,
                lat: actObj.lat,
                lng: actObj.lng,
                activity_date: moment(actObj.activity_date).format('MMMM Do YYYY, h:mm:ss a'),
                created_on: moment(actObj.created_on).format('MMMM Do YYYY, h:mm:ss a'),
                created_by: actObj.created_by
            };

            let onlyRead = false;
            if (readOnly) {
                onlyRead = true;
            }

            _callback({
                activity: visualAct,
                user: actUser,
                participants: participants,
                attributeNames: typeObj.attribute_names,
                readOnly: onlyRead
            });

        });
    });
};

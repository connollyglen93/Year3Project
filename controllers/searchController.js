let sesh;
let activityUser = require('../models/users/activityUser');
let activityType = require('../models/activity/activityType');
let activity = require('../models/activity/activity');
let comparator = require('../models/attribute/calculator');

let attributeConstants = require('../var/attributeConstants.json');


exports.begin = function(req, res) {
    sesh = req.session;
    var similarUsers = [];

    activity.findOne({_id: req.params.activityId}, function(err, activityFound) {
        if(err){
            throw err;
        }
        comparator.getComparator(function (comparatorValue) {
            activityUser.findFromUser(sesh.login, sesh.actType, function (err, currentUser) {
                currentUser.getRepresentativeAttributeValue(function (mainRepresentative) {
                    var maxRange;
                    var minRange;
/*                    console.log('Comparator Value=>' + comparatorValue);
                    console.log('Representative Value=>' + mainRepresentative);*/
                    if ((mainRepresentative + comparatorValue) > 100) {
                        maxRange = attributeConstants.max;
                    } else {
                        maxRange = mainRepresentative + comparatorValue;
                    }
                    if ((mainRepresentative + comparatorValue) < 0) {
                        minRange = attributeConstants.min;
                    } else {
                        minRange = mainRepresentative - comparatorValue;
                    }
/*                    console.log('Min Range =>' + maxRange);
                    console.log('Max Range =>' + minRange);
                    console.log('Max Range =>' + attributeConstants.max);
                    console.log('Min Range =>' + attributeConstants.min);*/
                    activityUser.findAll(sesh.actType, function (err, users) {
                        if (err) {
                            throw err;
                        }
                        var actUserIds = [];
                        var userIds = [];
                        let alreadyParticipating;
                        users.forEach(function (fullUser) {
                            alreadyParticipating = false;
                            if (!fullUser.actUser._id.equals(currentUser._id)) {
                                activityFound.participants.forEach(function(participant) {
                                    if(participant.equals(fullUser.actUser._id)) {
                                        alreadyParticipating = true;
                                    }
                                });
                            }else{
                                alreadyParticipating = true;
                            }
                            if(!alreadyParticipating){
                                actUserIds.push(fullUser.actUser._id);
                                userIds.push(fullUser.actUser.userId);
                            }
                        });
                        activityUser.getRepresentativeAttributeValues(actUserIds, function (err, representativeValues) {
                                representativeValues.forEach(function (representativeValue) {
                                    if (representativeValue.value > minRange && representativeValue.value < maxRange) {
                                        users.forEach(function (fullUser) {
                                            if (fullUser.user._id.equals(representativeValue.actUser.userId)) {
                                                similarUsers.push({
                                                    id: representativeValue.actUser._id,
                                                    username: fullUser.user.username,
                                                    attributeValues: representativeValue.actUser.attributeValues
                                                });
                                            }
                                        });
                                    }
                                });
                                activityType.findOne({name: sesh.actType}, function (err, activity) {
                                    res.render('search/index', {
                                        activityType: sesh.actType,
                                        activity: activityFound,
                                        attributeNames: activity.attribute_names,
                                        currentUser: currentUser,
                                        similarUsers: similarUsers,
                                        csrf: req.csrfToken()});
                                });
                        });
                    });
                });
            });
        });
    });
};
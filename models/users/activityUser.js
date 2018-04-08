var mongoose = require('mongoose');
var activityType = require('../activity/activityType');
var activity = require('../activity/activity');
var user = require('../users/user');
var moment = require('moment');
const bcrypt = require('bcrypt');
let notification = require('../interactions/notifications');
var attributeConstants = require('../../var/attributeConstants.json');


var Schema = mongoose.Schema;

var ActivityUserSchema = new Schema(
    {
        userId: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
        typeId: {type: Schema.Types.ObjectId, required: true, ref: 'ActivityType'},
        attributeValues: [{type: Number}],
        notifications: [{
                        level: String,
                        content: String,
                        timestamp: {type: Date, default: moment().format()},
                        source: {type: Schema.Types.ObjectId, required: true, ref: 'ActivityUser'},
                        activity: {type: Schema.Types.ObjectId, required: false, ref: 'Activity'},
                        seen: {type: Boolean, default: false}
                        }]
    }
    , { collection: 'activity_users' });

ActivityUserSchema.pre('save', function(next){
    self = this;

    activityType.findOne({_id: self.typeId}).exec(function(err, type){
        if(err){
            console.log(err);
        }
        var numOfAttributes = type.attribute_names.length;
        var attributeValues = [];
        for (var i = 0; i < numOfAttributes; i++){
            attributeValues[i] = attributeConstants.base;
        }
        self.attributeValues = attributeValues;
        next();
    });
});

ActivityUserSchema.methods.validateAttributeValueCount = function(_callback){
    self = this;
    activityType.findOne({_id: self.typeId}).exec(function(err, actType){
        if(err){
            console.log(err.message);
        }
        if(actType.attribute_names.length === self.attributeValues.length){
            return _callback();
        }else if(actType.attribute_names.length > self.attributeValues.length){
            for(var i = self.attributeValues.length; i < actType.attribute_names.length; i++){
                self.attributeValues[i] = attributeConstants.base;
            }
            self.save();
        }else{
            var attributeValue = [];
            for(var l = 0; l < actType.attribute_names.length; l++){
                attributeValue[l] = self.attributeValues[l];
            }
            self.attributeValues = attributeValue;
            self.save();
        }
        _callback();
    });
};

ActivityUserSchema.methods.getActivities = function(_callback){
    var activitiesFound = {};
    self = this;

    activity.find({type: self.typeId}, function (err, activities) {
        if (err) {
            throw err;
        }
        let remainingActivities = [];
        activities.forEach(function (act) {
            if(act.created_by.equals(self._id)){
                activitiesFound[act._id] = {name: act.name, participants: act.participants.length,
                    location: act.location_name, date: moment(act.activity_date).endOf('day').fromNow(),
                    creator: true};
            }else{
                remainingActivities.push(act);
            }
        });

        let ok = false;

        if(remainingActivities.length > 0){ //handles asynchronous nature of function
            let lastActivity = remainingActivities[remainingActivities.length - 1];
            remainingActivities.forEach(function(act){
                act.checkForParticipant(self._id, function(result){
                    if(result) {
                        activitiesFound[act._id] = {
                            name: act.name, participants: act.participants.length,
                            location: act.location_name, date: moment(act.activity_date).endOf('day').fromNow(),
                            creator: false
                        };
                    }
                    if(act._id.equals(lastActivity._id)){
                        ok = true;
                    }
                });
            });
        }else{
            ok = true;
        }

        let waitForAsync;
        (waitForAsync = function(){
            if(!ok){
                setTimeout(function(){
                    waitForAsync();
                }, 1000)
            }else{
                console.log(activitiesFound);
                _callback(activitiesFound);
            }
        })();
    })
};

ActivityUserSchema.methods.getRepresentativeAttributeValue = function(_callback){
    var total = 0;
    this.attributeValues.forEach(function(value){
        total += value;
    });
    var value = total / this.attributeValues.length;
    _callback(value);
};

ActivityUserSchema.methods.getNotificationsDue = function(_callback){
    if(this.notifications.length === 0){
        return _callback(true, []);
    }
    self = this;
    activityType.findOne({_id: self.typeId}, function(err, type){
        _callback(false, self.notifications, type.name);
    })
};

ActivityUserSchema.methods.getUser = function(_callback){
    self = this;

    user.findOne({_id: self.userId}).exec(function(err, user){
        _callback(err, user);
    });
};

ActivityUserSchema.methods.receiveInvite = function({sender, senderName, activity},_callback){
    self = this;
    notification.createInvite({sender: sender, senderName: senderName, activity:activity},function(invite){
        self.notifications.push(invite);
        self.save(function(err){
            if(err){
                return _callback(err, {});
            }
            return _callback(false, self);
        })
    });
};

ActivityUserSchema.statics.getRepresentativeAttributeValues = function(ids, _callback){
    var representativeValues = [];
    this.find({'_id' :{ $in: ids}}).exec(function(err, actUsers) {
        if(err){
            _callback(err, false);return;
        }

        actUsers.forEach(function(actUser) {
            var total = 0;
            actUser.attributeValues.forEach(function (value) {
                total += value;
            });
            var value = total / actUser.attributeValues.length;
            representativeValues.push({actUser: actUser, value: value});
        });
        _callback(false, representativeValues);
    });
};

ActivityUserSchema.statics.findAll = function(actType, _callback){
    let fullActUsers = [];
    let complete = false;
    let activityUser = mongoose.model('ActivityUser', ActivityUserSchema);
    activityType.findOne({name: actType}, function (err, activity) {
        activityUser.find({typeId: activity._id}, function(err, actUsers){
            if(err){
                return _callback(err, false);
            }
            let lastActUser = actUsers[actUsers.length - 1];

            actUsers.forEach(function(actUser){
                actUser.getUser(function(err, user){
                    fullActUsers.push({user: user, actUser: actUser});
                    if(actUser._id.equals(lastActUser._id)){
                        complete = true;
                    }
                });
            });
            let waitForAsync;
            (waitForAsync = function(){
                if(!complete){
                    setTimeout(function(){
                        waitForAsync();
                    }, 500)
                }else{
                    return _callback(false, fullActUsers);
                }
            })();
        })

    });
};

ActivityUserSchema.statics.getUsers = function(ids,_callback){
    self = this;
    if(ids === undefined || ids.length === 0){
        _callback('No Ids Passed', false);return;
    }
    user.find({'_id' :{ $in: ids}}).exec(function(err, users){
        _callback(err, users);
    });
};

ActivityUserSchema.statics.findFromUser = function search (login, actType, _callback) {
    var error = false;
    user.findOne({username : login}).exec(function(err, userObj){
        if(err){
            console.log(err);
        }
        if(!userObj){
            error = "Couldn't find user";
            return _callback(error, false);
        }
        activityType.findOne({name: actType}).exec(function(err, actObj){
            if(err){
                console.log(err);
            }
            if(!actObj){
                error = "Couldn't find activity type";
                return _callback(error, false, userObj);
            }
            var activityUser = mongoose.model('ActivityUser', ActivityUserSchema);
            activityUser.findOne({userId: userObj._id, typeId: actObj._id}).exec(function(err, actUser){
               if(err){
                   console.log(err);
               }
               if(!actUser){
                   error = "Couldn't find activity user";
                   return _callback(error, false, userObj);
               }
               return _callback(error, actUser, userObj);
            });
        });

    });
};

//Export model
module.exports = mongoose.model('ActivityUser', ActivityUserSchema);
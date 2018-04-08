var mongoose = require('mongoose');
var activityUser = require('../users/activityUser');

var Schema = mongoose.Schema;

var ActivitySchema = new Schema(
    {
        name: {type: String, required: true, max: 100},
        type: {type: Schema.Types.ObjectId, required: true, ref: 'ActivityType'},
        min_participants: {type: Number, required: true},
        location_name: {type: String, required: true},
        lat: {type: Number, required: false},
        lng: {type: Number, required: false},
        activity_date: {type: Date, required: true},
        created_on: {type: Date, required: true},
        created_by: {type: Schema.Types.ObjectId, required:true, ref: 'ActivityUser'},
        participants: [{type: Schema.Types.ObjectId, required: true, ref: 'ActivityUser'}]
    }
    , { collection: 'activity'});

ActivitySchema.methods.checkForParticipant = function(userId, _callback){
    for(var participant in this.participants){
        if(userId.equals(this.participants[participant])){
            _callback(true);
            return;
        }
    }
    _callback(false);
};

ActivitySchema.methods.getParticipants = function(_callback){
    var participants = {};
    var ids = [];
    var actUserIds = [];
    var self = this;
    self.participants.forEach(function(participant){
        ids.push(participant);
    });

    var activityUser = require('../users/activityUser');
    activityUser.find({'_id' :{ $in: ids}}, function(err, actUsers){
        actUsers.forEach(function(actUser){
            actUserIds.push(actUser.userId);
        });
        activityUser.getUsers(actUserIds, function(err, users){
            if(err){
                throw err;
            }
            actUsers.forEach(function(actUser){
                users.forEach(function(user){
                    if(user._id.equals(actUser.userId)){
                        if(self.created_by.equals(actUser._id)) {
                            participants[actUser._id] = {
                                attributes: actUser.attributeValues,
                                name: user.username,
                                creator: true
                            };
                        }else{
                            participants[actUser._id] = {
                                attributes: actUser.attributeValues,
                                name: user.username,
                                creator: false
                            };
                        }
                    }
                });
            });
            _callback(participants);
        });
    });
};

//Export model
module.exports = mongoose.model('Activity', ActivitySchema);
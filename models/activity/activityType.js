var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ActivityTypeSchema = new Schema(
    {
        name: {type: String, required: true, max: 100},
        background_color: {type: String, required: true},
        attribute_names: [{type: String}]
    }
    , { collection: 'activity_types' });

//Export model
module.exports = mongoose.model('ActivityType', ActivityTypeSchema);
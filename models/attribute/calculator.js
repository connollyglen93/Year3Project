var ActivityUser = require('../users/activityUser');
var fs = require('fs');
let moment = require('moment');

var Calculator = function (comparatorLocation) {
    if(comparatorLocation === undefined){
        this.location = './var/comparator.json';
    }
};

Calculator.prototype.calcComparator = function(){
    var attributeValues = [];
    self = this;
    ActivityUser.find({}, function(err, users) {
        users.forEach(function (user) {
            user.attributeValues.forEach(function (attribute){
                attributeValues.push(attribute);
            })
        });
        //calc mean
        var mean;
        var total = 0;
        attributeValues.forEach(function(attribute){
            total += attribute;
        });
        mean = total / attributeValues.length;

        //calc squared mean
        var squaredDifferenceTotal = 0;
        var difference;
        attributeValues.forEach(function(attribute){
            difference = attribute - mean;
            difference = Math.pow(difference, 2);
            squaredDifferenceTotal += difference;
        });

        var variance = squaredDifferenceTotal / attributeValues.length;

        var standardDeviation = Math.sqrt(variance);

        if(standardDeviation === 0){ //cover base stats
            standardDeviation = 1;
        }

        var dateTime = moment().format();

        var json = "{comparator: "+standardDeviation+", timestamp: '"+dateTime+"'}";
        fs.writeFile(self.location, json, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("Comparator Updated!");
        });
        return standardDeviation;
    });
};

Calculator.prototype.refreshComparator = function(){
    self = this;
    fs.readFile(self.location, function read(err, data) {
        if (err) {
            throw err;
        }
        if(!data){
            console.log('Failed to read comparator file');
        }

        var content = data;
        var dateWritten = moment(content.timestamp);
        if(dateWritten < moment().add(-1, 'days').format()){
            return self.calcComparator();
        }
        return false;
    });
};

Calculator.prototype.getComparator = function(_callback){
    self = this;
    fs.readFile(self.location, function read(err, data) {
        if (err) {
            throw err;
        }
        if(!data){
            console.log('Failed to read comparator file');
        }
        data = JSON.parse(data);

        _callback(data.comparator);
    });
};

module.exports = new Calculator();
var logger;
var db;
var fs = require('fs');
var winston = require('winston');
var Config = {};
exports.Config = Config;

exports.parseConfig = function(callback){
    var conf = fs.readFileSync(__dirname+"/properties.conf");
    var i = 0;
    var parsed = conf.toString().split("\r\n");
    parsed.forEach(function(line){
        i++;
        if ((line.indexOf("#") != 0)&&(line.indexOf("=") != -1)){
            Config[line.split("=")[0]] = line.split("=")[1];
        }
        if(i == parsed.length){
            callback()
        }
    })
};

exports.initLogger = function(){
    logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)(),
            new (winston.transports.File)({ filename: 'logs/server.log',maxsize:10485760,maxFiles:10,timestamp:true })
        ]
    });
    logger.handleExceptions(new winston.transports.File({ filename: 'logs/server_errors.log' }));
    logger.exitOnError = false;
};

exports.initDB = function(port,callback){
    var mongo = require('mongodb'),
        Server = mongo.Server,
        Db = mongo.Db;

    var dbServer = new Server('localhost', parseInt(port), {auto_reconnect: true,safe:true});
    db = new Db('automationframework', dbServer);

    db.open(function(err, db) {
        if(!err) {
            if (callback) callback();
            console.log("DB connected");
        }
        else{
            console.error("Couldn't connect to MongoDB", err.message);
            process.exit(1);
        }
    });

};

exports.getDB = function(){
    return db;
};

exports.uniqueId = function()
{
    var newDate = new Date;
    var partOne = newDate.getTime();
    var partTwo = 1 + Math.floor((Math.random()*32767));
    var partThree = 1 + Math.floor((Math.random()*32767));
    var id = partOne + '-' + partTwo + '-' + partThree;
    return id;
};

exports.ArrayIndexOf = function(a, fnc) {
    if (!fnc || typeof (fnc) != 'function') {
        return -1;
    }
    if (!a || !a.length || a.length < 1) return -1;
    for (var i = 0; i < a.length; i++) {
        if (fnc(a[i])) return i;
    }
    return -1;
};

exports.walkDir = function(dir, done,fileCallback) {
    dirWalker(dir,done,fileCallback)
};

function dirWalker(dir, done,fileCallback) {
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null);
        list.forEach(function(file) {
            file = dir + '/' + file;
            fs.stat(file, function(err, stat) {
                fileCallback(file);
                if (stat && stat.isDirectory()) {
                    dirWalker(file, function(err, res) {
                        if (!--pending) done(null);
                    },fileCallback);
                } else {
                    if (!--pending) done(null);
                }
            });
        });
    });
}

exports.cleanUpExecutions = function(){
    db.collection('machines', function(err, collection) {
        collection.update({},{$set:{state:"",takenThreads:0}},{multi:true});
    });
    db.collection('executiontestcases', function(err, collection) {
        collection.update({"status":"Running"},{$set:{status:"Not Run","result":"",resultID:null,error:"",trace:"",startdate:"",enddate:"",runtime:""}},{multi:true,safe:true},function(err){
        });
    });
    db.collection('executions', function(err, collection) {
        collection.update({"status":"Running"},{$set:{status:"Ready To Run"}},{multi:true,safe:true},function(err){
        });
    });
};




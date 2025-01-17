var generate = require("../../lib/generate.js");
var validateRoom = require('../../lib/validate.js');
var SbError = require("../../lib/SbError.js");
var validator = new (require('valid'))();
var log = require('../../lib/logger.js');
module.exports = function (core) {

    /* list of event that the basic validation function is called for.*/
    var events = ['init', 'text', 'edit', 'join', 'part', 'away', 'back', 'admit', 'expel', 'room', 'user'];

    /* if few more validtion is to be added for to any event add it to this list. eq:
		var handlers = {
			'init': function(action, callback){
				callback();
			}
		};
	*/
    validator.registerType('identities', function(is) {
        var r = is instanceof Array;
        if (r) {
            is.forEach(function(i)  {
                r = r && (typeof i === 'string');
            });
        }
        return r;
    });
    validator.registerType('roomid', validateRoom);
    var actionValidator = {
        ref: ['string', 'undefined'],
        id: ['undefined', 'string'],
        type: ['nonEmptyString'],
        to: ['string'],
        time: ['undefined', 'number'],
        session: ['string'],
        resource: ['undefined', 'string'],
        origin: ['strictObject', 'undefined']
    };
 
    var initValidator = {
        suggestedNick: ['undefined', 'string'],
        origin: ['undefined', 'strictObject']

    };

    var textValidator = {
        text: ['nonEmptyString'],
        labels: ['undefined', 'strictObject'],
        mentions: ['array', 'undefined'],
        threads: ['array', 'undefined'],
        to: ['roomid']
    };
     
    var userValidator = {
        user: [
            {
                id: ['string'],
                identities: ['identities'],
                params: ['strictObject'],
                guides: ['strictObject']
            }
        ]
    };
    
    var roomValidator = {
        room: [
            {
                id: ['string'],
                identities: ['undefined', 'identities'],
                params: ['strictObject'],
                guides: ['strictObject']
            }
        ],
        to: ['roomid']
    };
    

    function validate(action, valid, callback) {
        log.d("Action:", action, valid);
        var result = validator.validate(action, valid);
        log.d("validation results", result);
        if (!result.status) {
            log.e("Error: invalid init params", JSON.stringify(result));
            if (!(action.type && typeof action.type === 'string')) action.type = '';
            callback(new Error("INVALID_" + action.type.toUpperCase() + "_PARAMS"));
            return false;
        }
        return true;
    }


    var handlers = {
        init: function (action, callback) {
            if (!validate(action, initValidator, callback)) return;
            action.to = "me";
            if (action.suggestedNick) action.suggestedNick = validateRoom(action.suggestedNick, true);
            callback();
        },
        text: function (action, callback) {
            if (!validate(action, textValidator, callback)) return;
            var mentionMap = {};
            if (!(action.text && action.text.trim())) return callback(new SbError("TEXT_MISSING"));
            if (/^\//.test(action.text)) {
                if (!/^\/me/.test(action.text)) {
                    return callback(new SbError("UNRECOGNIZED_SLASH_COMMNAD"));
                }
            }
            if (!action.labels) action.labels = {};
            if (action.mentions && action.mentions.length > 0) {
                //checking for multiple mentions for the same user
                action.mentions.forEach(function (i) {
                    mentionMap[i] = true;
                });
                action.mentions = Object.keys(mentionMap);
            } else {
                action.mentions = [];
            }
            action.updateTime = action.time;
            callback();
        },
        admit: function (action, callback) {
            if (!action.ref) return callback(new SbError("REF_NOT_SPECIFIED"));
            if (!validateRoom(action.ref)) {
                return callback(new SbError("INVALID_REF"));
            }
            if (!action.role) action.role = "follow_invited";
            callback();
        },
        expel: function (action, callback) {
            if (!action.ref) return callback(new SbError("REF_NOT_SPECIFIED"));
            if (!validateRoom(action.ref)) {
                return callback(new SbError("INVALID_REF"));
            }
            if (!action.role) action.role = "banned";
            callback();
        },
        edit: function (action, callback) {
            if (!action.ref) return callback(new SbError("REF_NOT_SPECIFIED"));
            if (!action.text && !action.labels) return callback(new SbError("NO_OPTION_TO_EDIT"));
            if (action.labels && typeof action.labels != "object") return callback(new SbError("INVALID_EDIT_OPTION_LABEL"));
            if (action.text && typeof action.text != "string") return callback(new SbError("INVALID_EDIT_OPTION_TEXT"));
            callback();
        },
        user: function (action, callback) {
           if (!validate(action, userValidator, callback)) return;
            action.user.id = action.user.id.toLowerCase();   
            if (action.role) delete action.role;
            callback();
        },
        room: function (action, callback) {
            if (!validate(action, roomValidator, callback)) return;
            action.room.id = action.room.id.toLowerCase();
            if (!action.room.identities) action.room.identities = [];
            callback();
        }
    };

    events.forEach(function (event) {
        core.on(event, function (action, callback) {
            if (!validate(action, actionValidator, callback)) return;
            basicValidation(action, function (err) {
                if (err) return callback(err);
                if (handlers[event]) {
                    handlers[event](action, callback);
                } else {
                    callback();
                }
            });
        }, "validation");
    });


    core.on("getThreads", function (action, callback) {
        if (!(action.to || action.q)) {
            return callback(new SbError("INVALID_ROOM"));
        }
        if (!action.time) action.time = new Date().getTime();
        return queryValidation(action, callback);
    }, "validation");
    core.on("getTexts", function (action, callback) {
        if (!action.to) {
            return callback(new SbError("INVALID_ROOM"));
        }

        if (action.hasOwnProperty("updateTime")) {
            if (action.updateTime === null) action.updateTime = new Date().getTime();
        }

        return queryValidation(action, callback);
    }, "validation");
    core.on("getRooms", function (action, callback) {
        if (!(action.ref || action.hasOccupant || action.hasMember || action.identity || action.featured)) {
            return callback(new SbError("INVALID_QUERY"));
        }
        return queryValidation(action, callback);
    }, "validation");
    core.on("getUsers", function (action, callback) {
        if (!(action.ref || action.occupantOf || action.memberOf || action.identity || action.timezone)) {
            return callback(new SbError("INVALID_QUERY"));
        }
        return queryValidation(action, callback);
    }, "validation");

};

function queryValidation(query, callback) {
	if (!query.id) query.id = generate.uid();
	if (!query.session) {
		callback(new SbError("NO_SESSION_ID"));
	} else {
		callback();
	}
}

function basicValidation(action, callback) {
    if (!action.id) action.id = generate.uid();
    /*
		validation on action.from is not need because we ignore the from sent be the client.
		from and user is loaded by the entity loader using the session property.
	*/
    log.d("Basic validation:", action);
    if (!(action.type === "init" || action.type === "user") && (!validateRoom(action.to)))  {
        return callback(new SbError("INVALID_ROOM"));
    }
    if (action.from) action.from = action.from.toLowerCase();
    action.to = action.to.toLowerCase();
    if (!action.session) return callback(new SbError("NO_SESSION_ID"));

    if (/^web/.test(action.session) || !action.time) {
        action.time = new Date().getTime();
    }

    return callback();
}

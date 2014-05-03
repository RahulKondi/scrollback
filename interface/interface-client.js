/* global window */
var underscore = require('underscore');
var core;
var libsb = {
		user: "",
		rooms: "",
		occupantOf: [],
		memberOf: [],
		isConnected: false,
		isInited: false,
		connect: connect,
		disconnect: disconnect,
		resource: generate.uid(),

		getLoginMenu: getLoginMenu,
		getTexts: getTexts,
		getThreads: getThreads,
		getOccupants: getOccupants,
		getMembers: getMembers,
		getRooms: getRooms,
		getUsers: getUsers,
		enter: enter,
		leave: leave,
		join: join,
		part: part,
		say: say,
		admit: admit,
		expel: expel,
		getSession: getSession,
		logout: function(){
			core.emit("logout");
			core.emit("disconnect");
		},

		roomConfigForm: roomConfigForm,
		userPreferForm: userPreferForm
};
module.exports = function(c){
	core = c;

	libsb.on = core.on;
	libsb.emit = core.emit;

	window.libsb = libsb;

    core.on('init-dn', recvInit);
	core.on('back-dn', recvBack);
	core.on('away-dn', recvAway);
	core.on('join-dn', recvJoin);
	core.on('part-dn', recvPart);
	core.on('admit-dn', recvAdmit);
	core.on('expel-dn', recvExpel);

	core.on('connected', onConnect);
	core.on('disconnected', onDisconnect);

	core.on("init-dn", function() {
		if(!libsb.isInited){
			libsb.isInited = true;
			core.emit("inited");
		}

	}, 10)
};

function onConnect(){
	libsb.isConnected = true;
}

function onDisconnect(){
	libsb.isConnected = false;
	libsb.isInited = false;
}
function connect(){
	core.emit('connection-requested');
}

function disconnect(){
	core.emit('disconnect');
}

function getLoginMenu(callback){
	core.emit('auth-menu', callback);
}

function getTexts(query, callback){
	core.emit('getTexts', query, callback);
}

function getOccupants(query, callback){
	core.emit('getUsers', {occupantOf: query}, callback);
}

function getMembers(query, callback){
	core.emit('getUsers', {memberOf: query}, callback);
}

function getRooms(query, callback){
	core.emit('getRooms', query, callback);
}

function getThreads(query, callback){
	core.emit('getThreads', query, callback);
}

function getSession(query, callback){
	core.emit('getSession', query, callback);
}

function getUsers(query, callback){
	core.emit('getUsers', {ref: query}, callback);
}

function enter(roomId, callback){
	core.emit('back-up', {to:roomId}, callback);
}

function leave(roomId, callback){
	core.emit('away-up', {to:roomId}, callback);
}

function join(roomId, callback){
	core.emit('join-up', {to: roomId}, callback);
}

function part(roomId, callback){
	core.emit('part-up', {to: roomId}, callback);
}

function say(roomId, text, callback){
	core.emit('text-up', {to: roomId, text: text, from: libsb.user.id}, callback);
}

function admit(roomId, ref, callback){
	core.emit('admit-up', {to: roomId, ref: ref}, callback);
}

function expel(roomId, ref, callback){
	core.emit('expel-up', {to: roomId, ref: ref}, callback);
}

function roomConfigForm(){

}

function userPreferForm(){

}

function recvInit(init, next){

	libsb.session = init.session;
	if(init.auth && !init.user.id) {
		core.emit("navigate", {});
	}
	libsb.user = init.user;

	if(underscore.isEqual(libsb.user, init.user)){
		core.emit('user-update');
	}
	
	next();
}

function recvBack(back, next){
	if(back.from !== libsb.user.id) return next();
/*	if(!libsb.rooms.filter(function(room){ return room.id === back.to; }).length){
		libsb.rooms.push(back.room);
		core.emit('rooms-update');
	}
	if(!libsb.occupantOf.filter(function(room){ return room.id === back.to; }).length){
		libsb.occupantOf.push(back.room);
		core.emit('occupantof-update');
	}*/
	next();
}

function recvAway(away, next){
	if(away.from !== libsb.user.id) return next();
	libsb.rooms = underscore.compact(libsb.rooms.map(function(room){ if(room.id !== away.to) return room; }));
	libsb.occupantOf = underscore.compact(libsb.occupantOf.map(function(room){ if(room.id !== away.to) return room; }));
	core.emit('rooms-update');
	core.emit('occupantof-update');
	next();
}

function recvJoin(join, next){
	if(join.from !== libsb.user.id) return next();
	if(!libsb.memberOf.filter(function(room){return room.id === join.to; }).length){
		libsb.memberOf.push(join.room);
		core.emit('memberof-update');
	}
	next();
}

function recvPart(part, next){
	if(part.from !== libsb.user.id) return next();
	libsb.memberOf = underscore.compact(libsb.memberOf.map(function(room){if(room.id !== part.to) return room; }));
	core.emit('memberof-update');
	next();
}

function recvAdmit(admit, next){
	if(admit.ref === libsb.user.id){
		libsb.memberOf.push(admit.room);
	}
	next();
}

function recvExpel(expel, next){
	if(expel.ref === libsb.user.id){
		libsb.memberOf = libsb.memberOf.filter(function(room){ return room.id !== expel.to; });
	}
	next();
}

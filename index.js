/*
	Scrollback: Beautiful text chat for your community. 
	Copyright (c) 2014 Askabt Pte. Ltd.
	
This program is free software: you can redistribute it and/or modify it 
under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

This program is distributed in the hope that it will be useful, but 
WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see http://www.gnu.org/licenses/agpl.txt
or write to the Free Software Foundation, Inc., 59 Temple Place, Suite 330,
Boston, MA 02111-1307 USA.
*/
var plugins = [ "analytics", "validator","browserid-auth", "facebook", "recommendation",
			   "threader", "authorizer", "redis-storage",  "leveldb-storage",
			   "admin-notifier", "entityloader", "irc", "twitter",  "censor", "email", "superuser", "search", "sitemap"]
require('newrelic');
var log = require('./lib/logger.js');
var core = new (require("./lib/emitter.js"))(), config = require("./config.js");
log.setEmailConfig(config.email);

process.title = config.core.name;
process.env.NODE_ENV = config.env;
log.w("This is \"" +  process.env.NODE_ENV + "\" server");

function start(name) {
	log.i("starting ", name);
	var plugin = require("./"+name+"/"+name+".js");
	plugin(core);
}

plugins.forEach(function(name) {
	start(name);
});
start("http"); // start http app at last 

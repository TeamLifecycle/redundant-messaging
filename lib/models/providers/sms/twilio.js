var debug = require('debug')('email');
EmailServiceProvider = require("../../email_service_provider")

function Twilio(keys){
  if (!keys) return
	this.name = "twilio"
	this.keys = keys

  this.initialize = function() {
    this.client = require('twilio')(this.keys.account_sid, this.keys.auth_token);
  }

  this.send = function(from, to, message, callback) {
    
    return this.client.sendMessage({
        to: to,
        from: from,
        body: message
    }, function(err, responseData) {
        if (err) {
          debug("-_-_ FAILED with twilio _-_-");
          debug(err);
          return callback(err);
        } else {
          debug("-_-_ sent with twilio _-_-");
          return callback(null, result, "twilio");
        }
    });
  }

  this.initialize()
}

Twilio.prototype = new EmailServiceProvider()

module.exports = Twilio
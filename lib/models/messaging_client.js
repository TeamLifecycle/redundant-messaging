var debug = require('debug')('venn');
var vennApiService = require("../services/venn_api")

var Mandrill = require("./providers/email/mandrill")
var Sendgrid = require("./providers/email/sendgrid")
var Mailgun = require("./providers/email/mailgun")
var Postmark = require("./providers/email/postmark")

var Plivo = require("./providers/sms/plivo")
var Nexmo = require("./providers/sms/nexmo")
var Sinch = require("./providers/sms/sinch")
var Twilio = require("./providers/sms/twilio")

var Parse = require("./providers/push/parse")
var OneSignal = require("./providers/push/onesignal")
var ZeroPush = require("./providers/push/zeropush")
var PushBots = require("./providers/push/pushbots")

var Q = require("q")
var async = require("async")
var helpers = require("../services/helpers")
var MessagingUserStatus = require('./messaging_user_status');
var UserCodes = (new MessagingUserStatus()).StatusCodes;

function MessagingClient(type) {
  this.services = {}
  this.type = type
  this.sendLog = []
  // TODO this should be private
  this.initServices = function(keys) {
    var context = this
    for (var property in keys) {
        messagingProvider = undefined
        if(property === "mandrill" && keys[property]) messagingProvider = new Mandrill(keys[property])
        else if(property === "sendgrid" && keys[property]) messagingProvider = new Sendgrid(keys[property])
        else if(property === "mailgun" && keys[property]) messagingProvider = new Mailgun(keys[property])
        else if(property === "postmark" && keys[property]) messagingProvider = new Postmark(keys[property])
        else if(property === "sinch" && keys[property]) messagingProvider = new Sinch(keys[property])
        else if(property === "twilio" && keys[property]) messagingProvider = new Twilio(keys[property])
        else if(property === "plivo" && keys[property]) messagingProvider = new Plivo(keys[property])
        else if(property === "nexmo" && keys[property]) messagingProvider = new Nexmo(keys[property])
        else if(property === "parse" && keys[property]) messagingProvider = new Parse(keys[property])
        else if(property === "onesignal" && keys[property]) messagingProvider = new OneSignal(keys[property])
        else if(property === "zeropush" && keys[property]) messagingProvider = new ZeroPush(keys[property])
        else if(property === "pushbots" && keys[property]) messagingProvider = new PushBots(keys[property])
        if(messagingProvider) context.services[property] = messagingProvider
      }
    // debug("services --------->", context.services)
    return context
  }

  function isEmpty(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}


  this.sortServices = function(callback) {
    var context = this
    vennApiService.getPriority( this.getApiKey(), context.type, function(err, servicesOrdered) {

      // in case priorities dont return, just leave them as is
      if(!servicesOrdered || !servicesOrdered.length){
        return callback(null)
      }

      servicesReordered = {}
      for (i = 0; i < servicesOrdered.length; i++) {
        serviceName = servicesOrdered[i]
        servicesReordered[serviceName] = context.services[serviceName]
      }
      context.services = servicesReordered

      return callback(null, context.services)
    });
  }

  this.sendRedundantly = function(data, callback) {
    var context = this
    servicesLength = helpers.objectToArray(context.services).length
    async.eachSeries(helpers.objectToArray(context.services), function(service, cb){
      if(!service) return cb();
      var i = helpers.objectToArray(context.services).indexOf(service);
      debug("sending...", data)
      service.send(data, function(err, result){
        if(result) {
          sendLog.push(result.status.state)
          return callback(null, result.service.name);
        } else {
          sendLog.push(err.state)
          if (MessagingUserStatus.prototype.isPrototypeOf(err)) {
            // User error! Pop out of sendRedundantly loop
            return cb(err.state);

          } else {
            // Service error! Continue to next service
            return cb();
          }
        }
      });
    }, function(err){
      return callback(err);
    });
  }

  this.getApiKey = function() { return this.apiKey }

  // this.initialize = function(apiKey) {
  //   apiKey = apiKey;
  //   if(!apiKey) return console.error("No Venn API Key provided!");
  //   this.apiKey = apiKey
  // }

  this.send = function(data, keys, callback) {
    debug("send data", data)
    var context = this
    sendLog = []
    context.services = {}
    // key = data.key || context.apiKey;

    // Ensure a Venn API key is provided. (If not, it means initialize() probably wasn't called)
    if(!keys) {
      return callback(new MissingVennAPIKeyStatus());
    }

    // Validate data being sent
    var validState = validateParams(this.type, data);
    if (validState.code !== UserCodes.VALID) {
      sendLog.push(validState);
      // vennApiService.postLog(key, sendLog);
      return callback(validState);
    }

    // vennApiService.getKeys( key, context.type, function(err, keys) {
      debug("keys", keys)
      context.initServices(keys)

      // Check that Venn App integrations are turned on
      // if(helpers.isEmptyObject(context.services)) {
      //   var integrationsStatus = new VennIntegrationsTurnedOffStatus(context.type);
      //   sendLog.push(integrationsStatus);
      //   // vennApiService.postLog(key, sendLog);
      //   return callback(integrationsStatus);
      // }

      context.sortServices(function(){
        debug("ordered context.services", context.services)
        context.sendRedundantly(data, function(err, result){
          // vennApiService.postLog(key, sendLog);

          // err results from user error
          if(err) return callback( err );

          // undefined result is possible if a service or all services fail. Send back sendLog to user for ordered failure details
          if (!result) return callback(sendLog);

          // Successful send
          return callback( null, {"service": result} );
        })
      })
    // })
  }

}


/*=============================================================================

Define Data Validation Handlers

=============================================================================*/

/*
Email validation

@param data         The content of the email
*/
function EmailDataValidator(data) {
  MessagingUserStatus.call(this, 'email validator');
  
  if(data.from && !helpers.validateEmail(data.from)) {
    // From email address is invalid
    debug("data:", data);
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid "from" email address: ' + data.from;

  } else if(!helpers.validateEmail(data.to)) {
    // To email address is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid "to" email address: ' + data.to;

  } else if(!helpers.validateMessage(data.subject)) {
    // Subject string is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid subject: ' + data.subject;

  } else if(!helpers.validateMessage(data.message)) {
    // Message string is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid message: ' + data.message;

  } else {
    // Input data is valid
    this.state.code = this.StatusCodes.VALID;
    this.state.message = 'Ok';
  }
}

EmailDataValidator.prototype = Object.create(MessagingUserStatus.prototype);
EmailDataValidator.prototype.constructor = EmailDataValidator;

/*
Push validation

@param data         The content of the push
*/
function PushDataValidator(data) {
  MessagingUserStatus.call(this, 'push validator');

  if(data.deviceType != "ios" && data.deviceType != "android") {
    // Device type specification is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid device type: ' + data.deviceType;

  } else if(!helpers.validateMessage(data.deviceToken)) {
    // Device token is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid device token: ' + data.deviceToken;

  } else if(!helpers.validateMessage(data.message)) {
    // Message string is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid message: ' + data.message;

  } else {
    // Input data is valid
    this.state.code = this.StatusCodes.VALID;
    this.state.message = 'Ok';
  }
}

PushDataValidator.prototype = Object.create(MessagingUserStatus.prototype);
PushDataValidator.prototype.constructor = PushDataValidator;

/*
SMS validation

@param data         The content of the sms message
*/
function SMSDataValidator(data) {
  MessagingUserStatus.call(this, 'sms validator');

  if(!helpers.validatePhoneNumber(data.to)) {
    // To phone number is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid "to" phone number: ' + data.to;

  } else if(data.from && !helpers.validatePhoneNumber(data.from)) {
    // From phone number is invalid (if it is input through API)
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid "from" phone number: ' + data.from;

  } else if(!helpers.validateMessage(data.message)) {
    // Message string is invalid
    this.state.code = this.StatusCodes.INVALID;
    this.state.message = 'Invalid message: ' + data.message;

  } else {
    // Input data is valid
    this.state.code = this.StatusCodes.VALID;
    this.state.message = 'Ok';
  }
}

SMSDataValidator.prototype = Object.create(MessagingUserStatus.prototype);
SMSDataValidator.prototype.constructor = SMSDataValidator;

/*
Normalize 'Venn API key missing' Error

@return             MessageUserStatus state detailing normalized error
*/
function MissingVennAPIKeyStatus() {
  MessagingUserStatus.call(this, 'Venn API key validator');

  this.state.code = this.StatusCodes.MISSING;
  this.state.message = "No valid API Key provided! Can't send!";
  return this.state;
}

MissingVennAPIKeyStatus.prototype = Object.create(MessagingUserStatus.prototype);
MissingVennAPIKeyStatus.prototype.constructor = MissingVennAPIKeyStatus;

/*
Normalize 'Venn App Integrations turned off' Error

@return             MessageUserStatus state detailing normalized error
*/
function VennIntegrationsTurnedOffStatus(type) {
  MessagingUserStatus.call(this, 'Venn App Integrations validator');

  this.state.code = this.StatusCodes.MISSING;
  this.state.message = "No " + type.toString() + " integrations turned on! Turn some on in your Venn Dashboard!";
  return this.state;
}

VennIntegrationsTurnedOffStatus.prototype = Object.create(MessagingUserStatus.prototype);
VennIntegrationsTurnedOffStatus.prototype.constructor = VennIntegrationsTurnedOffStatus;

/*
Normalize 'Invalid Service Type' Error

@return             MessageUserStatus state detailing normalized error
*/
function InvalidServiceTypeStatus(type) {
  MessagingUserStatus.call(this, 'Venn Service Type validator');

  this.state.code = this.StatusCodes.INVALID;
  this.state.message = "Services of type: " + type.toString() + " are not supported.";
  return this.state;
}

InvalidServiceTypeStatus.prototype = Object.create(MessagingUserStatus.prototype);
InvalidServiceTypeStatus.prototype.constructor = InvalidServiceTypeStatus;


/*=============================================================================

Define Helper Functions

=============================================================================*/

/*
Validate given data parameters

@param type         The type of service the data corresponds to
@param data         The data to be validated
@return             MessageUserStatus state detailing the results of the validation
*/
validateParams = function(type, data) {

  if(type === "email") return (new EmailDataValidator(data)).state;
  else if(type === "push") return (new PushDataValidator(data)).state;
  else if(type === "sms") return (new SMSDataValidator(data)).state;
  else return new InvalidServiceTypeStatus(type);
}


module.exports = MessagingClient;
var debug = require('debug')('venn');
MessagingServiceProvider = require("../../messaging_service_provider")
MessagingServiceStatus = require('../../messaging_service_status');
MessagingUserStatus = require('../../messaging_user_status');

/*=============================================================================

Define Postmark Service Provider

=============================================================================*/
function Postmark(keys){
  if (!keys) return
  this.name = "postmark"
  this.keys = keys

  this.initialize = function() {
    var postmark = require("postmark")
    this.client = new postmark.Client(this.keys.server_key);
  }

  this.send = function(data, callback) {
    var context = this;
    debug(context.name, "send data", data);
    emailData = {
      "From": data.from || context.keys.from_email, 
      "To": data.to, 
      "Subject": data.subject, 
      "HtmlBody": data.message
    }
    if(data.from_name || context.keys.from_name) {
      fromName = data.from_name || context.keys.from_name;
      emailData["From"] = fromName + " <" + emailData["From"] + ">";
    }
    this.client.sendEmail(emailData, function(err, result) {
        var postmarkStat;
        if(err) {
          postmarkStat = new PostmarkErrorStatus(err);
          debug("-_-_ FAILED with postmark _-_-");
          debug(postmarkStat);
          return callback(postmarkStat);
        }
        else {
          postmarkStat = new PostmarkSuccessStatus(result);
          debug("-_-_ sent with postmark _-_-");
          result.service = context;
          result.status = postmarkStat;
          debug(result);
          return callback(null, result);
        }
    });
  }

  this.initialize()
}

Postmark.prototype = new MessagingServiceProvider()


/*=============================================================================

Define Postmark Service Status Handlers

=============================================================================*/

/*
Success Status

@param response     JSON response object from Postmark service  
*/
function PostmarkSuccessStatus(response) {
  MessagingServiceStatus.call(this, 'postmark');

  // Message successfully sent
  this.state.message = response.Message;
  this.state.code = this.StatusCodes.SUCCESS;
}

PostmarkSuccessStatus.prototype = Object.create(MessagingServiceStatus.prototype);
PostmarkSuccessStatus.prototype.constructor = PostmarkSuccessStatus;

/*
Error Status

@param response     JSON response object from Postmark service  
*/
function PostmarkErrorStatus(response) {
  MessagingServiceStatus.call(this, 'postmark');

  // There was an error when attempting to send message
  this.state.message = response.code + ': ' + response.message;

  // Catch internal server error
  if (response.status == 500) {
    this.state.code = this.StatusCodes.SERVICE_DOWN;
    return
  }

  // See http://developer.postmarkapp.com/developer-api-overview.html for status error codes
  if (response.code == 400) this.state.code = this.StatusCodes.DATA_REJECTED;
  else if (response.code == 401) this.state.code = this.StatusCodes.DATA_REJECTED;
  else if (response.code == 405) this.state.code = this.StatusCodes.LIMIT_EXCEEDED;
  else if (response.code == 406) this.state.code = this.StatusCodes.DATA_REJECTED;
  else if (response.code == 507) this.state.code = this.StatusCodes.DATA_REJECTED;
  else if (response.code == 522) this.state.code = this.StatusCodes.DATA_REJECTED;
  else this.state.code = this.StatusCodes.DEFAULT;
}

PostmarkErrorStatus.prototype = Object.create(MessagingServiceStatus.prototype);
PostmarkErrorStatus.prototype.constructor = PostmarkErrorStatus;


/*=============================================================================

Define Postmark User Status Handler

=============================================================================*/
function PostmarkUserStatus(message, code) {
  MessagingUserStatus.call(this, 'postmark');

  // Put logic here for handling any possible user errors
}

PostmarkUserStatus.prototype = Object.create(MessagingUserStatus.prototype);
PostmarkUserStatus.prototype.constructor = PostmarkUserStatus;


/*=============================================================================

Define Postmark Helper Functions

=============================================================================*/


module.exports = Postmark
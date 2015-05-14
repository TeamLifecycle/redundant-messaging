var assert = require("assert")
var nock = require("nock")
var client = require("../../../lib/index").SMS;
var MessagingUserStatus = require('../../../lib/models/messaging_user_status');
var UserCodes = (new MessagingUserStatus()).StatusCodes;

describe('receive error from twilio', function () {

	it('when no from number in code nor database', function (done) {
		nock.cleanAll()
		nock('https://api.getvenn.io/v1')
			.get('/keys/sms')
			.reply(200, {
				"twilio": {
					"account_sid": "sldkfjdslkjf",
					"auth_token": "sldkfjdslkjf"
				},
				"nexmo": {
					"api_key": "sldkfjdslkjf",
					"api_secret": "sldkfjdslkjf"
				}
			});
		nock('https://api.twilio.com:443')
			.post('/2010-04-01/Accounts/sldkfjdslkjf/Messages.json')
			.reply(201, [{"status": "sent"}] );
		nock('https://rest.nexmo.com/sms/json')
			.post('')
			.reply(200, {"message": "success"});
		nock('https://api.getvenn.io/v1')
			.get('/priority/sms')
			.reply(200, [ "twilio"]);

		client.initialize()
		client.send({to:"15138853322", message:"message-13579"}, function(err, result){
			assert.notEqual(err, undefined);
			assert.equal(result, undefined);
			assert.equal(err.code, UserCodes.MISSING)
			done();
		})
	})

	it('when bad to number', function (done) {
		nock.cleanAll()
		nock('https://api.getvenn.io/v1')
			.get('/keys/sms')
			.reply(200, {
				"twilio": {
					"account_sid": "sldkfjdslkjf",
					"auth_token": "sldkfjdslkjf"
				},
				"nexmo": {
					"api_key": "sldkfjdslkjf",
					"api_secret": "sldkfjdslkjf"
				}
			});
		nock('https://api.twilio.com:443')
			.post('/2010-04-01/Accounts/sldkfjdslkjf/Messages.json')
			.reply(201, [{"status": "sent"}] );
		nock('https://rest.nexmo.com/sms/json')
			.post('')
			.reply(200, {"message": "success"});
		nock('https://api.getvenn.io/v1')
			.get('/priority/sms')
			.reply(200, [ "twilio"]);

		client.initialize()
		client.send({to:"15138853322923042903432", from: "15135549122", message:"message-13579"}, function(err, result){
			assert.notEqual(err, undefined);
			assert.equal(result, undefined);
			assert.equal(err.code, UserCodes.INVALID);
			done()
		})
	})

	it('when bad from number', function (done) {
		nock.cleanAll()
		nock('https://api.getvenn.io/v1')
			.get('/keys/sms')
			.reply(200, {
				"twilio": {
					"account_sid": "sldkfjdslkjf",
					"auth_token": "sldkfjdslkjf"
				},
				"nexmo": {
					"api_key": "sldkfjdslkjf",
					"api_secret": "sldkfjdslkjf"
				}
			});
		nock('https://api.twilio.com:443')
			.post('/2010-04-01/Accounts/sldkfjdslkjf/Messages.json')
			.reply(201, [{"status": "sent"}] );
		nock('https://rest.nexmo.com/sms/json')
			.post('')
			.reply(200, {"message": "success"});
		nock('https://api.getvenn.io/v1')
			.get('/priority/sms')
			.reply(200, [ "twilio"]);

		client.initialize()
		client.send({to:"15135549122", from: "2309423098493840923", message:"message-13579"}, function(err, result){
			assert.notEqual(err, undefined);
			assert.equal(result, undefined);
			assert.equal(err.code, UserCodes.INVALID);
			done()
		})
	})
})
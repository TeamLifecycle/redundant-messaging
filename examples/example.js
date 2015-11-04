var debug = require('debug')('venn');
var Email = require("../lib/index")("a db").Email;
debug("email", Email)
// Email.initialize();
var data = {
	key: "abc",
	from: "from@venn.com",
	to: "timmyg13@gmail.com",
	subject: "subject-1",
	message: "message-1"
}
Email.send(data, function(err, result){
	console.info("error:", err);
	console.info("sent with:", result);
})

exports.objectToArray = function(obj){
	var arr = [];
	for (var key in obj) {
	    if (obj.hasOwnProperty(key)) {
	        arr.push(obj[key])
	    }
	};
	return arr;
}

exports.arrayToObject = function (arr) {
  obj = {};

  arr.forEach(function (a) {
    obj[a.slug] = a.value;    
  })

  return obj;
};

exports.keysToObj = function (obj) {
  bigObj = {};

  for (var slug in obj) {
    bigObj[slug] = exports.arrayToObject(obj[slug]);
  }

  return bigObj;
};

exports.isEmptyObject = function(obj) {
  var key;
  if (obj === null) {
    return true;
  }
  if (obj.length && obj.length > 0) {
    return false;
  }
  if (obj.length === 0) {
    return true;
  }
  for (key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
};

exports.validateEmail = function (email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email);
}

exports.stripPhoneNumber = function(number) {
  var re;
  re = /\D/g;
  return number.toString().trim().replace(re, '');
};

exports.validatePhoneNumber = function(number) {
  var stripped;
  stripped = exports.stripPhoneNumber(number);
  return stripped.length === 11;
};

exports.validateMessage = function(msg) {
  return msg && msg.length;
};


module.exports = exports
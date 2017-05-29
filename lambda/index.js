exports.handler = (event, context, callback) => {
  var request = require('request');
  var options = {
    method: 'GET',
    url: 'https://api.stackexchange.com/2.2/info',
    json: true,
    qs: {site: 'iot'},
    headers: {
        'Content-Type': 'application/json'
    }
  }
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(response.headers['content-type'])
      //callback(null, body);
    }else {
      //callback(null, "Error");
    }
  });
};

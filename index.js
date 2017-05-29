'use strict';

console.log('Loading more params...');
//console.log(process.env);
const AWS = require('aws-sdk');
const r = require('request');
const docClient = new AWS.DynamoDB.DocumentClient({
  "region": 'us-east-1'
});

function popuateItems(data,index){
  let itemsArray = [];
  for(let i=index;i<=(index+24);i++) {
    let datum = data[i];
    let item = {
      PutRequest: {
        Item: datum
      }
    };
    if(item){
      itemsArray.push(item);
    }
  }
  return itemsArray;
}

function getWindSpeed() {
  console.log("Request before:");
  return r('http://api.openweathermap.org/data/2.5/weather?q=Hyderabad,India&appid=8d6a46f92c052d3d104690de8690f3e6', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Success request");
      var windspeed = JSON.parse(body).wind.speed;
      let params = populateData(windspeed);

      return params;
    }
  });
}

function populateData(w,index) {
  let ind = index;
  let d = new Date();
  let date = d.getTime();
  let time = d.toLocaleTimeString("en-GB",{ timeZone: "Asia/Kolkata" });
  let data = [];

  for(let i=index;i<=(index+24);i++) {
    data[i] = {
      trackerId: 'NGT-AZP-Q1-0'+i,
      date: date,
      time: time,
      temperature: parseFloat(Math.random() * 24 + 14).toFixed(4),
      windspeed: w
    }
  }

  //console.log(data);

  let params = {
    RequestItems: {
       "trackerdata": popuateItems(data,ind)
     }
  };

  //console.log("Params",params.RequestItems.trackerdata);

  return params;
}

exports.handler = function(event, context, callback) {
  let params = [];

  r('http://api.openweathermap.org/data/2.5/weather?q=Hyderabad,India&appid=8d6a46f92c052d3d104690de8690f3e6', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Success request");
      var windspeed = JSON.parse(body).wind.speed;

      let params1 = populateData(windspeed,1);
      let params2 = populateData(windspeed,26);
      let params3 = populateData(windspeed,51);
      let params4 = populateData(windspeed,76);

      let params = [ params1,params2,params3,params4 ];

      //console.log(params);

      for(let k =0;k<4;k++) {
        docClient.batchWrite(params[k],function(err,data){
          if(err){
            console.log(JSON.stringify(err, null, 2));
            callback(err,null)
          }else {
            console.log(data);
            callback(null,data);
          }
        });
      }

    }//endif
  });

}

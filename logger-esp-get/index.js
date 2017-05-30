'use strict';
console.log("Loading the lambda function");

const AWS = require('aws-sdk');
const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = 'iot-esp';

exports.handler = function(event,context,cb) {

    console.log(event);

    var a = moment(event.params.querystring.date);
    console.log("Date Query String",event.params.querystring.date);
    var q1 = a.isValid();

    var st,lt,channel,limit,rSelect,cc,p,hk,rk;
    limit = 1;
    rSelect = "ALL_ATTRIBUTES";
    cc = "NONE";
    if( event.params.querystring.date ) {
      console.log("Date given");
      st = (a.utc().valueOf());
      lt = (parseInt(st)+ 86400000);
    } else {
      st = (moment(moment().format('YYYY-MM-DD')).utc().valueOf());
      lt = (parseInt(st)+ 86400000);
    }

    console.log(a.utc().format(),st,"Date",moment(lt).utc().format(),lt);
    channel = "1";
    if(event.params.path.c) {
      channel = event.params.path.c;
      hk = channel;
    }
    if(event.params.querystring.l){
      limit = parseInt(event.params.querystring.l);
    }
    if(event.params.querystring.select){
      rSelect = "COUNT";
    }
    if(event.params.querystring.cc){
      cc = "TOTAL";
    }
    if(event.params.querystring.p){
      p = event.params.querystring.p;
      // let pr = p.split(',');
      // hk = pr[0];
      rk = p;
    }
    const params = {
          "TableName": tableName,
          "KeyConditionExpression" : 'host = :hostmax and utime between :st and :lt ',
          // "ExpressionAttributeNames" :{
          //       "#tid": "trackerId"
          // },
          "ExpressionAttributeValues": {
              // ":hostmin": "1",
              ":hostmax": channel.toString(),
              ":st": st,
              ":lt": lt
          },
          // 'ProjectionExpression' : 'host,powac,enac,utime',
          "ScanIndexForward": false,
          "Select": rSelect,
          "ReturnConsumedCapacity": cc,
          "Limit": limit
    };

    if(hk & rk) {
      params.ExclusiveStartKey = {
        "host": hk.toString(),
        "utime": parseInt(rk)
      }
    }
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            console.log("Get succeeded:", JSON.stringify(data, null, 2));
            cb(null,data);
        }
   });
};

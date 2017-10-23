var Horseman    = require('node-horseman');
var tesseract   = require('node-tesseract');
var uniqid      = require('uniqid');
var fs          = require('fs');
var Jimp        = require("jimp");
var os          = require('os');
var config      = require(__dirname + '/config');
var cluster     = require('cluster'),
    numCPUs     = require('os').cpus().length,
    http        = require('http'),
    url_util    = require('url');

var repeat      = 0;

var url_pnr             = 'http://www.indianrail.gov.in/enquiry/PnrEnquiry.html',
    url_seat            = 'http://www.indianrail.gov.in/enquiry/SeatAvailability.html';

var tesseract_config    = __dirname + '/tesseract_config';

var is_aws              = process.env.AWS || 1;
if(parseInt(is_aws)===1)
    is_aws  = true;
else
    is_aws  = false;


function ocr(param,callback){
    var options = {
        config          : tesseract_config,
    }
    if(is_aws){
        options.binary              = __dirname + '/tesseract';
        options.TESSDATA_PREFIX     = __dirname + '/';
    }
    tesseract.process(param.temp,options,function(err, text) {
        if(err) {
            fs.unlink(param.temp,function(){
                callback(false);
            })
        } else {
            if(text.indexOf('-')===-1 && text.indexOf('+')===-1){
                fs.unlink(param.temp,function(){
                    callback(false);
                })
            }else{
                var res     = text.trim().replace(/(\r\n|\n|\r|\?|=|:)/gm,"");
                var captcha = eval(res);
                fs.unlink(param.temp,function(){
                    callback(''+captcha);
                })
            }
        }
    });
}

function solve(param,callback) {
    Jimp.read(param.temp, function (err, image) {
        image.resize(150,50);
        image.greyscale();
        image.write( param.temp, function(){
            ocr(param,callback);
        });
    });
}

function scrape_pnr(param,callback){
    var options     = {
        timeout     : config.timeout,
    }
    if(is_aws){
        options.phantomPath = __dirname + '/phantomjs';
    }
    if(config.use_proxy){
        var proxy               = config.proxies[Math.floor(Math.random()*config.proxies.length)];
        options.proxy           = proxy.host + ':' + proxy.port;
        options.proxyType       = proxy.type;
        if(proxy.user){
            options.proxyAuth   = proxy.user + ':' + proxy.pass;
        }
    }
    console.log(options);
    var horseman    = new Horseman(options);
    horseman
        .on('resourceError', function(error) {
            console.log("Resource Error:",error);
        })
        .userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
        .open(url_pnr)
        .crop('#CaptchaImgID', param.temp)
        .then(function () {
            solve(param,function (captcha) {
                if(captcha===false){
                    horseman.close();
                    scrape_pnr(param,callback);
                }else{
                    horseman.evaluate(function(param,captcha){
                        var result = {};
                        $.ajax({
                            async:false,
                            cache:false,
                            url : 'CommonCaptcha',
                            data : {
                                inputCaptcha        : captcha,
                                inputPnrNo          : param.pnr,
                                inputPage           : 'PNR'
                            },
                            success: function (response) {
                                var resp =$.parseJSON(JSON.stringify(response));
                                if(resp.flag=='NO') {
                                    result = {error:'Captcha not matched'};
                                }
                                else
                                {
                                    if (resp.errorMessage == null || resp.errorMessage == '') {
                                        result=response;
                                    }
                                    else {
                                        result={error:resp.errorMessage};
                                    }
                                }
                            },
                            error: function (xhr, status) {
                                result={error:"Error! Internal Error. Please try after sometime."};
                            }
                        });
                        return result;
                    },param,captcha)
                        .then(function (result) {
                            callback(result);
                        })
                        .close();
                }
            });
        });
}

function generate_output(param,resp) {
    if(resp.error)
        return resp;
    var trainStatus="";
    if(resp.trainCancelStatus != undefined)
    {
        trainStatus=resp.trainCancelStatus;
    }
    var informationMessage="";
    if(resp.informationMessage[0] != "" && resp.informationMessage[1] != "")
    {
        informationMessage=resp.informationMessage[0]+" , "+resp.informationMessage[1];
    }
    if(resp.informationMessage[0] != "" && resp.informationMessage[1] == "")
    {
        informationMessage=resp.informationMessage[0];
    }
    var data = {
        pnr             : param.pnr,
        journeyDetails  : [
            {
                trainNumber     : resp.trainNumber,
                trainName       : resp.trainName,
                boardingDate    : resp.dateOfJourney.day + "-" + resp.dateOfJourney.month + "-" + resp.dateOfJourney.year,
                from            : resp.sourceStation ,
                to              : resp.destinationStation,
                reservedUpto    : resp.reservationUpto,
                boardingPoint	: resp.boardingPoint,
                class           : resp.journeyClass
            }
        ],
        otherDetails    : [
            {
                totalFare		: resp.bookingFare,
                chartingStatus	: resp.chartStatus,
                remarks         : informationMessage,
                trainStatus     : trainStatus
            }
        ],
        psgnDetails     : []
    };
    for(var i=0;i<resp.passengerList.length;i++){
        var rowData             = resp.passengerList[i];
        var finalStatusCurrent  =rowData.currentStatus;
        var finalStatusBooking  = rowData.bookingStatus;
        var count = 1;
        if(!(rowData.currentCoachId == null || rowData.currentCoachId =="")){
            finalStatusCurrent = finalStatusCurrent+"/"+rowData.currentCoachId;
        }
        if((rowData.currentStatus != "CNF" && rowData.currentStatus != "CAN") || (rowData.currentStatus =="CNF" && rowData.currentBerthNo != 0)){
            finalStatusCurrent = finalStatusCurrent+"/"+rowData.currentBerthNo;
        }

        if(!(rowData.bookingCoachId == null || rowData.bookingCoachId =="")){
            finalStatusBooking = finalStatusBooking+"/"+rowData.bookingCoachId;
        }
        if((rowData.bookingStatus != "CNF" && rowData.bookingStatus != "CAN") || (rowData.bookingStatus =="CNF" && rowData.bookingBerthNo != 0)){
            finalStatusBooking = finalStatusBooking+"/"+rowData.bookingBerthNo;
        }
        if(rowData.bookingBerthCode != null && rowData.bookingBerthCode != "-1"){
            finalStatusBooking = finalStatusBooking+"/"+rowData.bookingBerthCode;
        }
        data.psgnDetails.push({
            sNo	            : "Passenger "+ rowData.passengerSerialNumber,
            bookingStatus   : finalStatusBooking+ "/"+rowData.passengerQuota,
            currentStatus   : finalStatusCurrent
        });
    }
    return data;
}

if(is_aws){
    console.log("AWS");
    // exports.handler = function(event, context) {
        var uniq = uniqid();
        var query =  '2333387904'; //event.queryStringParameters
        // if (!query.pnr) {
        //     context.succeed({
        //         body: '',
        //         headers: {
        //             "Content-Type": "application/json"
        //         },
        //         statusCode: 200
        //     });
        // }
        var param           = {
            pnr: '2333387904',
            temp: __dirname+'/tmp/' + uniq + '.png'
        };
        var finish_callback = function(ou) {
          console.log("Finished Callback:",ou)
        }
        // var finish_callback = function (output) {
        //     if (output.error){
        //         if(output.error.indexOf('Captcha not matched') !== -1) {
        //             scrape_pnr(param, finish_callback);
        //         }else{
        //             if(repeat<config.repeat){
        //                 scrape_pnr(param, finish_callback);
        //                 repeat++;
        //             }else{
        //                 context.succeed({
        //                     body: JSON.stringify(output),
        //                     headers: {
        //                         "Content-Type": "application/json"
        //                     },
        //                     statusCode: 200
        //                 });
        //             }
        //         }
        //     }else{
        //         context.succeed({
        //             body: JSON.stringify(generate_output(param,output)),
        //             headers: {
        //                 "Content-Type": "application/json"
        //             },
        //             statusCode: 200
        //         });
        //     }
        // };
        scrape_pnr(param, finish_callback);
    // }
}else{
    if (cluster.isMaster) {
        for (var i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
    }
    else {
        http.createServer(function (request, response) {
            var query   = url_util.parse(request.url, true).query;
            if (!query.pnr) {
                response.writeHead(200, {'Content-Type': 'image/x-icon'} );
                response.end();
                return;
            }
            var uniq    = uniqid();
            var param           = {
                pnr: query.pnr,
                temp: os.tmpdir() + '/' + uniq +'.png'
            };
            var finish_callback = function (output) {
                if (output.error && output.error.indexOf('Captcha not matched') !== -1)
                    return scrape_pnr(param, finish_callback);
                response.writeHead(200,{'Content-Type':'application/json'});
                response.end(JSON.stringify(generate_output(param,output)));
            };

            scrape_pnr(param,finish_callback);
        }).listen(config.port,function () {
            console.log("server listening on port " + config.port + ', with ' + numCPUs + 'CPUs')
        });
    }
}

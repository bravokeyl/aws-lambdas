const SerialPort = require('serialport');
const port = new SerialPort('/dev/ttyUSB0', {
  baudRate: 115200
});

let alp = 'abcdefghijklmnopqrstuvwxyz';
alp = alp.split('');
function shuffle(array) {
  var rand, index = -1,
    length = array.length,
    result = Array(length);
  while (++index < length) {
    rand = Math.floor(Math.random() * (index + 1));
    result[index] = result[rand];
    result[rand] = array[index];
  }
  return result;
}

let rece = '';
port.on('error', function(err) {
  console.log('Error: ', err.message);
})

port.on('data', function (data) {
  rece = rece+data.toString();
  if(rece.length >50){
    console.log("D50:",rece.toString());
    rece = '';
  }
  console.log(data,data.toString());
});

const serialWrite = function(){
  let jun = shuffle(alp).join('');
//  port.write( jun, function(err) {
  //  if (err) {
    //  return console.log('Error on write: ', err.message);
    //}
    //console.log('M:',jun);
//  });
}


setInterval(serialWrite,5000);

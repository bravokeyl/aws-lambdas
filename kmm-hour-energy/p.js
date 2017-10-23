const fs = require('fs');
const path = require('path');
const filename = path.resolve(__dirname,'d.json');

function channelSplit(d,sep){
  return d.split(sep);
}
function extractChannels(d) {
  let darr = channelSplit(d.data,'z\n');
  return darr;
}
function singleChannel(data) {
  let d = data.split(',');
  let c,pow,en,v,irms,ticks;
  data = [];
  let c1 = [];
  if(d.length>0) {
    d.forEach((p,j) => {
      let fc = p.charAt(0);
      // Discard all other data except required
      switch (fc) {
        case 'e':
          en = p.slice(1);
          break;
        case 'p':
          pow = p.slice(1);
          break;
        case 'v':
          v = p.slice(1);
          break;
        case 'i':
          irms = p.slice(1);
          break;
        case 'c':
          c = p.slice(1);
          break;
        case 'b':
          ticks = p.slice(2);
          break;
        default:
      }
    });
    data = {
      "channel": c,
      "energy": en,
      "power": pow,
      "current": irms,
      "voltage": v,
      "ticks": ticks
    };
    // console.log(c1.length)
  }
  // let channel = {
  //   t: d[0],
  //   c: d[1],
  //   e: d[4]
  // }
  // console.log(data,"DTA");
  return data;
}

fs.readFile('d.json',function(err,res){
  // console.log(res.toString());
  let d = JSON.parse(res.toString());
  let items = d.Items;
  getHourEnergy(items);
})

function getHourEnergy(items) {
  let channelsObj = {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
  };
  // console.log(d.Items.length);

  items.forEach(function(e,i){
    // console.log(e.timestamp,i);
    let channels = extractChannels(e);
    channels.forEach(function(e,i){
      if(e.length>0){
        channel = singleChannel(e);
        channelsObj[channel.channel].push(channel)
      }
    });
    if(i>0){
      let diff = items[i-1].timestamp - items[i].timestamp;
      // console.log(items[i-1].timestamp,items[i].timestamp, diff);
    }
  });

  for(c=1;c<7;c++){
    let len = channelsObj[c].length;

    // fs.writeFile(c+".json",JSON.stringify(channelsObj[c]),function(err,d){
    //   if(err) console.log(err);
    // });
    if(c==2 || c== 3 || c ==4 ) {
      console.log("===========CHANNEL",c,":",len,"==================");
      // console.log("First Energy Value:",channelsObj[c][0].energy);
      // console.log("Last Energy Value:",channelsObj[c][len-1].energy);
      console.log("Energy in the hour:",(channelsObj[c][0].energy-channelsObj[c][len-1].energy)/10000);
      // channelsObj[c].forEach(function(e,i){
      //     if(i>0){
      //       let diff = channelsObj[c][i-1].ticks - channelsObj[c][i].ticks;
      //       // if(diff!=1){
      //         // console.log(channelsObj[c][i-1].ticks,channelsObj[c][i].ticks, diff);
      //         diff = channelsObj[c][i-1].energy - channelsObj[c][i].energy;
      //         // if(diff<0){
      //         //   console.log("ENERGY",channelsObj[c][i-1]);
      //         //   console.log("ENERGY Prev",channelsObj[c][i]);
      //         // }
      //       // }
      //     }
      //     if(channelsObj[c][i].energy < 0) {
      //       console.log(channelsObj[c][i]);
      //     }
      //     if(channelsObj[c][i].power < 0) {
      //       console.log(channelsObj[c][i]);
      //     }
      // });
      console.log("=============================================");
    }
  }
}

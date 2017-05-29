var AWS = new require('aws-sdk');

var kcl = require('kinesis-client-library')

var  s3 = new AWS.S3()

let newlineBuffer = new Buffer('\n')

kcl.AbstractConsumer.extend({
  // create places to hold some data about the consumer
  initialize: function (done) {
    this.cachedRecords = []
    this.cachedRecordsSize = 0
    // This MUST be called or processing will never start
    // That is really really really bad
    done()
  },

  processRecords: function (records, done) {
    // Put each record into our list of cached records (separated by newlines) and update the size
    records.forEach(function (record) {
      this.cachedRecords.push(record.Data)
      this.cachedRecords.push(newlineBuffer)
      this.cachedRecordsSize += (record.Data.length + newlineBuffer.length)
    }.bind(this))

    // not very good for performance
    var shouldCheckpoint = this.cachedRecordsSize > 50000000

    // Get more records, but not save a checkpoint
    if (! shouldCheckpoint) return done()

    // Upload the records to S3
    s3.putObject({
      Bucket: 'engdata',
      Key: 'kinesis/pithre/' + Date.now(),
      Body: Buffer.concat(this.cachedRecords)
    }, function (err)  {
      if (err) return done(err)

      this.cachedRecords = []
      this.cachedRecordsSize = 0
      console.log("Pithre",this.cachedRecords);
      // Pass `true` to checkpoint the latest record we've received
      done(null, true)
    }.bind(this))
  }
})

#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="logger-parse-$timestamp.zip";
echo $filename;
echo "Running script...";
rm logger-parse-*.zip
zip -r $filename . -x deploy.sh
echo "Uploading to S3..."
aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name logger-parse-data --zip-file fileb://$filename
echo "End script"

#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="kmm-parse-power-$timestamp.zip";
echo $filename;
echo "Running script...";
rm kmm-parse-power-*.zip
zip -r $filename . -x deploy.sh
#echo "Uploading to S3..."
#aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name kmm-parse-power --zip-file fileb://$filename --profile luser
echo "End script"

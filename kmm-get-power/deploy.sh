#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="kmm-get-power-$timestamp.zip";
echo $filename;
echo "Running script...";
rm kmm-get-power-*.zip
zip -r $filename . -x deploy.sh
#echo "Uploading to S3..."
#aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name kmm-get-power --zip-file --profile luser fileb://$filename
echo "End script"

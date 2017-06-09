#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="logger-device-data-status-$timestamp.zip";
echo $filename;
echo "Running script...";
rm logger-device-data-status-*.zip
zip -r $filename . -x "deploy.sh" "package.json" ".eslintrc.json"
echo "Uploading to S3..."
aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name logger-device-data-status --zip-file fileb://$filename
echo "End script"

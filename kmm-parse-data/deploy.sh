#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="kmm-parse-data-$timestamp.zip";
echo $filename;
echo "Running script...";
rm kmm-parse-data-*.zip
zip -r $filename . -x deploy.sh
#echo "Uploading to S3..."
#aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name kmm-parse-data --zip-file fileb://$filename
echo "End script"

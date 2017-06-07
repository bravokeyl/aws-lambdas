#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="logger-sqs-corrupt-$timestamp.zip";
echo $filename;
echo "Running script...";
rm logger-sqs-corrupt-*.zip
zip -r $filename . -x deploy.sh
echo "Uploading to S3..."
aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name logger-sqs-corrupt --zip-file fileb://$filename
echo "End script"

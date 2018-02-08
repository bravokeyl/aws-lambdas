#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="get-fb-access-token-$timestamp.zip";
echo $filename;
echo "Running script...";
rm get-fb-access-token-*.zip
zip -r $filename . -x deploy.sh
#echo "Uploading to S3..."
#aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name get-fb-access-token --zip-file --profile luser fileb://$filename
echo "End script"

#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="logger-set-shadow-$timestamp.zip";
echo $filename;
echo "Running script...";
rm logger-set-shadow-*.zip
zip -r $filename . -x "deploy.sh" "package.json" ".eslintrc.json"
echo "Uploading to S3..."
aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name logger-set-shadow --zip-file fileb://$filename
echo "End script"

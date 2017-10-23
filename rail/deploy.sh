#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="rail-$timestamp.zip";
echo $filename;
echo "Running script...";
rm rail-*.zip
zip -r $filename . -x "deploy.sh" "package.json" ".eslintrc.json"
# echo "Uploading to S3..."
# aws s3 cp $filename s3://logger-lambdas
echo "Uploading lambda function...";
aws lambda update-function-code --function-name rail --zip-file fileb://$filename
echo "End script"

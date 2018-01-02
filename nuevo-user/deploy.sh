#!/bin/bash
timestamp=`date '+%Y-%m-%d-%H-%M-%S'`;
filename="nuevo-user-$timestamp.zip";
echo $filename;
echo "Running script...";
rm nuevo-user-*.zip
zip -r $filename . -x deploy.sh
echo "Uploading lambda function...";
aws lambda update-function-code --function-name nuevo-user --zip-file fileb://$filename --profile luser
echo "End script"

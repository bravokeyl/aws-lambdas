#!/bin/bash
for day in 06
do
  for number in {00..11}
  do
    dat='2018/02/'$day'/'$number
    echo $dat
    pay='{"params":{"querystring":{"dhr":"';
    a='"}}}';
    b=$pay"${dat}"$a
    echo $b
    aws lambda invoke --function-name kmm-harvest-hour --payload $b  "a.json" --profile luser --no-verify-ssl
    echo " "
    read -p "Continuing in 10 Seconds...." -t 3
    echo "Continuing ...."
  done
done
exit 0

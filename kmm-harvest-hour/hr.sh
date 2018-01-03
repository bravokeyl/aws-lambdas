#!/bin/bash
for day in {24..31}
do
  for number in {00..23}
  do
    dat='2017/12/'$day'/'$number
    echo $dat
    pay='{"params":{"querystring":{"dhr":"';
    a='"}}}';
    b=$pay"${dat}"$a
    echo $b
    aws lambda invoke --function-name kmm-harvest-hour --payload $b  "a.json" --profile luser
    echo " "
    read -p "Continuing in 3 Seconds...." -t 3
    echo "Continuing ...."
  done
done
exit 0

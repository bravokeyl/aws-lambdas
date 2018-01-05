#!/bin/bash
for day in 05
do
  for number in {16..18}
  do
    dat='2018/01/'$day'/'$number
    echo $dat
    pay='{"params":{"querystring":{"dhr":"';
    a='"}}}';
    b=$pay"${dat}"$a
    echo $b
    aws lambda invoke --function-name kmm-harvest-hour --payload $b  "a.json" --profile luser
    echo " "
    read -p "Continuing in 10 Seconds...." -t 10
    echo "Continuing ...."
  done
done
exit 0

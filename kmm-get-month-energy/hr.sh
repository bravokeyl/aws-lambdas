#!/bin/bash
# https://pyz1xbouqb.execute-api.us-east-1.amazonaws.com/l/h?dhr=
for number in {01..07}
do
  dat='2017/10/'$number
  echo $dat
  curl https://pyz1xbouqb.execute-api.us-east-1.amazonaws.com/l/d?dhr=$dat
done
exit 0

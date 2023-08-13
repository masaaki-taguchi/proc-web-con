#!/usr/bin/bash
throttled=$(vcgencmd get_throttled | awk ' BEGIN { FS="=" } ; { print $2 } ')
temperature=$(vcgencmd measure_temp | awk ' BEGIN { FS="=" } ; { print $2 } ')
volt=$(vcgencmd measure_volts | awk ' BEGIN { FS="=" } ; { print $2 } ')
clock=$(vcgencmd measure_clock arm | awk ' BEGIN { FS="=" } ; { print $2 / 1000000000 "GHz" } ')

cur_throttle=""
if [ $((${throttled} & 0x4)) -ne 0 ]; then
  cur_throttle+="スロットリング発生/" 
fi
if [ $((${throttled} & 0x1)) -ne 0 ]; then
  cur_throttle+="電圧不足/" 
fi
if [ $((${throttled} & 0x2)) -ne 0 ]; then
  cur_throttle+="クロック数制限/" 
fi
if [ $((${throttled} & 0x8)) -ne 0 ]; then
  cur_throttle+="温度制限/" 
fi
if [ -z "$cur_throttle" ]; then
  cur_throttle="-" 
fi
cur_throttle=$(echo $cur_throttle | sed 's/\/*$//')

prev_throttle=""
if [ $((${throttled} & 0x40000)) -ne 0 ]; then
  prev_throttle+="スロットリング発生/" 
fi
if [ $((${throttled} & 0x10000)) -ne 0 ]; then
  prev_throttle+="電圧不足/" 
fi
if [ $((${throttled} & 0x20000)) -ne 0 ]; then
  prev_throttle+="クロック数制限/" 
fi
if [ $((${throttled} & 0x80000)) -ne 0 ]; then
  prev_throttle+="温度制限/" 
fi
if [ -z "$prev_throttle" ]; then
  prev_throttle="-" 
fi
prev_throttle=$(echo $prev_throttle | sed 's/\/*$//')

echo "クロック数: "$clock
echo "温度: "$temperature
echo "電圧: "$volt
echo "スロットル: "$throttled" [現在: "$cur_throttle"] [以前: "$prev_throttle"]"

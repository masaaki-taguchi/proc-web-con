#!/usr/bin/bash
throttled=$(vcgencmd get_throttled | awk ' BEGIN { FS="=" } ; { print $2 } ')
temperature=$(vcgencmd measure_temp | awk ' BEGIN { FS="=" } ; { print $2 } ')
volt=$(vcgencmd measure_volts | awk ' BEGIN { FS="=" } ; { print $2 } ')
clock=$(vcgencmd measure_clock arm | awk ' BEGIN { FS="=" } ; { print $2 / 1000000000 "GHz" } ')

cur_throttle=""
if [ $((${throttled} & 0x1)) -ne 0 ]; then
  cur_throttle+="Under-voltage detected/" 
fi
if [ $((${throttled} & 0x2)) -ne 0 ]; then
  cur_throttle+="Arm frequency capped/" 
fi
if [ $((${throttled} & 0x4)) -ne 0 ]; then
  cur_throttle+="Currently throttled/" 
fi
if [ $((${throttled} & 0x8)) -ne 0 ]; then
  cur_throttle+="Soft temperature limit active/" 
fi
if [ -z "$cur_throttle" ]; then
  cur_throttle="-" 
fi
cur_throttle=$(echo $cur_throttle | sed 's/\/*$//')

prev_throttle=""
if [ $((${throttled} & 0x10000)) -ne 0 ]; then
  prev_throttle+="Under-voltage has occurred/" 
fi
if [ $((${throttled} & 0x20000)) -ne 0 ]; then
  prev_throttle+="Arm frequency capping has occurred/" 
fi
if [ $((${throttled} & 0x40000)) -ne 0 ]; then
  prev_throttle+="Throttling has occurred/" 
fi
if [ $((${throttled} & 0x80000)) -ne 0 ]; then
  prev_throttle+="Soft temperature limit has occurred/" 
fi
if [ -z "$prev_throttle" ]; then
  prev_throttle="-" 
fi
prev_throttle=$(echo $prev_throttle | sed 's/\/*$//')

echo "Clock: "$clock
echo "Temperature: "$temperature
echo "Volt: "$volt
echo "Throttled: "$throttled" [Current: "$cur_throttle"] [Previous: "$prev_throttle"]"

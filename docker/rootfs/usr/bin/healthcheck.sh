#!/bin/sh
set -e

pidof hbbs >/dev/null
pidof hbbr >/dev/null
pidof luoda-api >/dev/null

netstat -ltn 2>/dev/null | grep -q ':21114 '
netstat -ltn 2>/dev/null | grep -q ':21116 '
netstat -ltn 2>/dev/null | grep -q ':21117 '
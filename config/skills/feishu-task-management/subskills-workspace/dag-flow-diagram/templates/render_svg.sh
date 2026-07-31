#!/bin/bash
# render.sh <name> <w> <h> [scale]
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
N=$1; W=$2; H=$3; S=${4:-2.5}
cat > /tmp/_wrap_$N.html <<HTML
<html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#FBFAF8}svg{display:block}</style></head><body>
$(cat $N.svg)
</body></html>
HTML
"$CHROME" --headless --disable-gpu --hide-scrollbars --screenshot="$N.png" \
  --window-size=$W,$H --force-device-scale-factor=$S "/tmp/_wrap_$N.html" >/dev/null 2>&1
python3 -c "
from PIL import Image
im=Image.open('$N.png'); w,h=im.size
print(f'$N  {w}x{h}  w/h={w/h:.2f}')"

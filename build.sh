#!/bin/sh
# Joins the source modules into the single-file game (index.html).
cd "$(dirname "$0")/src" && cat head.html data.js map.js game.js econ.js ai.js render.js art.js ui.js tail.html > ../index.html && echo "built index.html ($(wc -c < ../index.html) bytes)"

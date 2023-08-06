#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "Removing previously compiled files... "
rm -rf generated/ || true

echo "Linting typescript..."
npx prettier --log-level error --write . 

echo "Compiling typescript ..."
npx tsc
# if [ "$(uname)" == "Darwin" ]; then
# 	# Mac:
# 	find generated/ -type f -name '*.js' -print0 | xargs -0 sed -i '' -E 's/from "([^"]+)";$/from "\1.js";/g'
# elif [ "$(uname)" == "Linux" ]; then
# 	# Linux:
# 	find generated/ -type f -name '*.js' -print0 | xargs -0 -I {} sed -i '{}' -e 's/from "\([^"]*\)";/from "\1.js";/g'
# else
# 	rm -rf generated/ || true
# 	echo "Sorry, your OS type is not supported"
# fi
echo "Done."

#!/bin/bash
npx tsc
find generated/ -type f -name '*.js' -print0 | xargs -0 sed -i '' -E 's/from "([^"]+)";$/from "\1.js";/g'
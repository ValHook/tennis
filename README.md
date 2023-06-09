# Tennis Roster Generator

## Running the website

To use it on GitHub, [visit the site here](https://valhook.github.io/tennis/).  
To use it locally, you will need to serve it.  
All the logic runs in the browser, there is no backend.  
Therefore the easiest way is to serve the site is by executing:
```
python3 -m http.server (from the project's root directory)
```
You can then visit the locally served website at [http://localhost:8000](http://localhost:8000).

## Writing changes

The only dependencies you need are Typescript and a linter.
```
npm install -g typescript prettier
```

Then write your changes in `ts/` and compile them by executing:
```
./ts/compile.sh
```

It doesn't matter which directory you execute the shell script from.  
However, note that this script for Mac and Linux only.  
Windows users may want to use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install).  
  
This regenerates the `ts/generated` directory which the `index.html` page is configured to load.

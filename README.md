# Tennis Roster Generator

## Running the generator

### Online

The latest public version is [hosted on ValHook's GitHub](https://valhook.github.io/tennis/).  

### Locally

To use it locally, you will need to serve it. All the logic runs in the browser; there is no backend.  

The easiest way is to serve the site is by executing the following from the project's root directory:

```
python3 -m http.server
```

You can then visit your locally served website at [http://localhost:8000](http://localhost:8000).

## Compiling

### Dependencies

The only dependencies you need are Typescript and a linter. To install them through `npm`, execute:

```
npm install -g typescript prettier
```

### Writing changes

Write your changes in `ts/` and compile them by executing:

```
./ts/compile.sh
```

While doesn't matter which directory you execute the shell script from, note that this script for Mac and Linux only. Windows users may want to use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install).
  
This regenerates the `ts/generated` directory which the `index.html` page is configured to load.

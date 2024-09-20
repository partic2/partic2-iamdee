# iamdee

[![NPM version](https://badge.fury.io/js/iamdee.svg)](https://npmjs.org/package/iamdee)
[![Build Status][travis-image]][travis-url]

[project-url]: https://github.com/grassator/iamdee
[travis-url]: https://travis-ci.org/grassator/iamdee
[travis-image]: https://travis-ci.org/grassator/iamdee.svg?branch=master


Small and extensible AMD loader. fork from https://github.com/grassator/iamdee.

## Usage

Add inline script from the minified file from the `dist` folder into your page. Then in your code you can use regular `require` / `define` functions:

```js
require(['your-dependency'], function (yourDependency) {
    // your code
});
```

or

```js
define(['your-dependency'], function (yourDependency) {
    // your code
});
```

## Supported Features

* Named modules
* Anonymous modules
* `baseUrl` config

## Browser Support

* Evergreen (Chrome, Firefox, Opera, Safari, Edge)
* Web worker
* Extensible for other runtime by implementing ScriptLoader and push/unshift into define.amd.scriptLoaders


## License

The MIT License (MIT)

Copyright (c) 2018 Dmitriy Kubyshkin

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

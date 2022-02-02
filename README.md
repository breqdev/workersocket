# workersocket

A WebSocket that runs in a Web Worker.

Published as an ES module only.

## Node.js

Web Workers are not available in Node.js. As a fallback, this module will return a `ws` object. This is intended to support both dual browser/node libraries and browser libraries that run unit tests in Node.

## Deps

- [`ws`](https://www.npmjs.com/package/ws) to support use with Node. Adds nothing to a browser bundle.

## Example

This library strives to be as similar to the WebSocket API as possible.

```js
import { WorkerSocket } from "workersocket";

const socket = new WorkerSocket("ws://echo.websocket.events");

socket.onmessage = (event) => {
  console.log(event.data);
  socket.close();
};

socket.send("Hello, world!");
```

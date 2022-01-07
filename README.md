# workersocket

A WebSocket that runs in a Web Worker.

ESM only.

```js
import { WorkerSocket } from "workersocket";

const socket = new WorkerSocket("ws://echo.websocket.events");

socket.onmessage = (event) => {
  console.log(event);
  socket.close();
};

socket.send("Hello, world!");
```

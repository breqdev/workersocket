import WorkerSocket from "../index.js";
import { expect } from "https://unpkg.com/@esm-bundle/chai/esm/chai.js";

window.mocha.setup("bdd");
window.mocha.checkLeaks();

window.testFail = 0;
window.testComplete = 0;

describe("workersocket", () => {
  let socket;

  it("returns an object", () => {
    socket = new WorkerSocket("wss://echo.websocket.events");
    expect(socket).to.be.an("object");
  });

  it("can open a connection", (done) => {
    socket.onopen = done;
  });

  it("sets the readystate to open", () => {
    expect(socket.readyState).to.equal(1);
  });

  it("can send and receive messages", (done) => {
    socket.onmessage = (message) => {
      if (message.data.startsWith("echo.websocket.events")) {
        return;
      }
      expect(message.data).to.equal("hello");
      done();
    };

    socket.send("hello");
  });

  it("can send and receive binary messages", (done) => {
    socket.binaryType = "arraybuffer";

    socket.onmessage = (message) => {
      expect(message.data).to.be.an.instanceOf(ArrayBuffer);
      done();
    };

    socket.send(new ArrayBuffer(5));
  });

  it("supports addEventListener syntax", (done) => {
    socket.onmessage = null;

    const handleMessage = (message) => {
      expect(message.data).to.equal("hello");
      socket.removeEventListener("message", handleMessage);
      done();
    };

    socket.addEventListener("message", handleMessage);

    socket.send("hello");
  });

  it("can disconnect the connection and set the ready state", (done) => {
    socket.onclose = () => {
      expect(socket.readyState).to.equal(3);
      done();
    };
    socket.close();
  });

  it("sets the ready state appropriately", () => {
    expect(socket.readyState).to.equal(3);
  });

  it("does not allow disconnected sockets to be used", () => {
    expect(() => socket.send("hiii")).to.throw();
  });

  it("can reconnect the connection", (done) => {
    socket = new WorkerSocket("wss://echo.websocket.events");
    socket.onopen = done;
  });

  it("sets the readystate back to open", () => {
    expect(socket.readyState).to.equal(1);
  });

  it("allows sending messages after reconnection", (done) => {
    socket.onmessage = (message) => {
      if (message.data.startsWith("echo.websocket.events")) {
        return;
      }
      expect(message.data).to.equal("hello");
      done();
    };

    socket.send("hello");
  });

  it("can handle reconnections using the onclose event", (done) => {
    socket.onclose = () => {
      socket = new WorkerSocket("wss://echo.websocket.events");
      socket.onopen = done;
    };
    socket.close();
  });

  it("can close the connection for cleanup", (done) => {
    socket.onclose = done;
    socket.close();
  });
});

window.mocha
  .run()
  .on("fail", (test, err) => {
    window.testFail = 1;
  })
  .on("end", () => {
    window.testComplete = 1;
  });

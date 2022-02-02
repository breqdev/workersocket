import WorkerSocket from "../index.js";
import { expect } from "https://unpkg.com/@esm-bundle/chai/esm/chai.js";

describe("workersocket", () => {
  it("returns an object", () => {
    const socket = new WorkerSocket("ws://localhost:8080");
    expect(socket).to.be.an("object");
    socket.close();
  });
});

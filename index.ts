const workerImpl = () => {
  let socket: WebSocket | null = null;

  const connect = (url: string, protocols: string[]) => {
    socket = new WebSocket(url, protocols);
    socket.onopen = () => {
      self.postMessage({ type: "open" });
    };
    socket.onclose = () => {
      self.postMessage({ type: "close" });
    };
    socket.onerror = (error: Event) => {
      self.postMessage({ type: "error", error });
    };
    socket.onmessage = (event: MessageEvent) => {
      self.postMessage({ type: "message", message: event.data });
    }
  };

  self.addEventListener("message", ({ data }) => {
    if (data.type === "create") {
      connect(data.url, data.protocols || []);
    } else if (data.type === "send") {
      if (socket) {
        socket.send(data.data);
      }
    } else if (data.type === "close") {
      if (socket) {
        socket.close();
      }
      self.close();
    }
  });
};

const workerURL = URL.createObjectURL(
  new Blob(["(" + workerImpl.toString() + ")();"], { type: "text/javascript" })
);

type WorkerSocketEvent = "open" | "close" | "error" | "message";

class WorkerSocket {
  worker: Worker;

  readyState = 0;
  listeners: {
    open: Array<() => void>;
    close: Array<() => void>;
    error: Array<(error: Event) => void>;
    message: Array<(message: MessageEvent) => void>;
  } = {
    open: [],
    close: [],
    error: [],
    message: [],
  };

  constructor(url: string, protocols: string[]) {
    this.worker = new Worker(workerURL);
    this.worker.postMessage({ type: "create", url, protocols });

    this.worker.onmessage = ({ data }) => {
      if (data.type === "open") {
        this.readyState = 1;
        this.listeners.open.forEach((listener) => listener());
      } else if (data.type === "close") {
        this.readyState = 3;
        this.listeners.close.forEach((listener) => listener());
      } else if (data.type === "error") {
        this.readyState = 3;
        this.listeners.error.forEach((listener) => listener(data.error));
      } else if (data.type === "message") {
        this.listeners.message.forEach((listener) => listener(data.message));
      }
    };
  }

  send(data: string | ArrayBuffer) {
    this.worker.postMessage({ type: "send", data });
  }

  close() {
    this.worker.postMessage({ type: "close" });
  }

  addEventListener(
    type: WorkerSocketEvent,
    listener: (() => void) | ((error: Event) => void) | ((message: MessageEvent) => void)
  ) {
    this.listeners[type].push(listener as () => void);
  }

  removeEventListener(
    type: WorkerSocketEvent,
    listener: (() => void) | ((error: Event) => void) | ((message: MessageEvent) => void)
  ) {
    this.listeners[type] = this.listeners[type].filter(
      (l) => l !== listener
    ) as Array<() => void>;
  }

  set onopen(listener: () => void) {
    this.addEventListener("open", listener);
  }

  set onclose(listener: () => void) {
    this.addEventListener("close", listener);
  }

  set onerror(listener: (error: Event) => void) {
    this.addEventListener("error", listener);
  }

  set onmessage(listener: (message: MessageEvent) => void) {
    this.addEventListener("message", listener);
  }
}

export default WorkerSocket;

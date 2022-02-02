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
    };
  };

  self.addEventListener("message", ({ data }) => {
    if (data.type === "create") {
      connect(data.url, data.protocols || []);
    } else if (data.type === "binaryType") {
      if (socket) {
        socket.binaryType = data.binaryType;
      }
    } else if (data.type === "send") {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(data.data);
      }
    } else if (data.type === "close") {
      if (socket) {
        socket.close();
      }
    } else {
      console.warn("[workersocket] unknown message type", data.type);
    }
  });
};

const workerURL = URL.createObjectURL(
  new Blob(["(" + workerImpl.toString() + ")();"], {
    type: "text/javascript",
  })
);

const worker = new Worker(workerURL);

type WorkerSocketEvent = "open" | "close" | "error" | "message";

class WorkerSocket {
  worker: Worker | null;

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

  workerMessageHandler: (event: any) => void;

  constructor(url: string, protocols: string[] = []) {
    this.worker = worker;
    this.worker.postMessage({ type: "create", url, protocols });

    this.workerMessageHandler = ({ data }: any) => {
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
        this.listeners.message.forEach((listener) =>
          listener(new MessageEvent("message", { data: data.message }))
        );
      }
    };

    this.worker.addEventListener("message", this.workerMessageHandler);
  }

  set binaryType(binaryType: "blob" | "arraybuffer") {
    if (!this.worker) {
      throw new Error("[workersocket] worker is not connected");
    }
    this.worker.postMessage({ type: "binaryType", binaryType });
  }

  send(data: string | ArrayBuffer) {
    if (!this.worker) {
      throw new Error("[workersocket] worker is not connected");
    }
    this.worker.postMessage({ type: "send", data });
  }

  close() {
    this.worker?.postMessage({ type: "close" });

    this.worker?.removeEventListener("message", this.workerMessageHandler);

    this.listeners.close.forEach((listener) => listener());

    this.worker = null;
  }

  addEventListener(
    type: WorkerSocketEvent,
    listener:
      | (() => void)
      | ((error: Event) => void)
      | ((message: MessageEvent) => void)
  ) {
    this.listeners[type].push(listener as () => void);
  }

  removeEventListener(
    type: WorkerSocketEvent,
    listener:
      | (() => void)
      | ((error: Event) => void)
      | ((message: MessageEvent) => void)
  ) {
    this.listeners[type] = this.listeners[type].filter(
      (l) => l !== listener
    ) as Array<() => void>;
  }

  set onopen(listener: () => void | null) {
    this.listeners.open = listener ? [listener] : [];
  }

  set onclose(listener: () => void | null) {
    this.listeners.close = listener ? [listener] : [];
  }

  set onerror(listener: (error: Event) => void | null) {
    this.listeners.error = listener ? [listener] : [];
  }

  set onmessage(listener: (message: MessageEvent) => void | null) {
    this.listeners.message = listener ? [listener] : [];
  }
}

export default WorkerSocket;

const nanoid = () => Math.random().toString(36).substring(2, 9);

const workerImpl = () => {
  let sockets: Record<string, WebSocket> = {};

  const connect = (url: string, protocols: string[], socketId: string) => {
    const socket = new WebSocket(url, protocols);
    socket.onopen = () => {
      self.postMessage({ type: "open", socketId });
    };
    socket.onclose = () => {
      self.postMessage({ type: "close", socketId });
    };
    socket.onerror = (error: Event) => {
      self.postMessage({
        type: "error",
        error: {
          code: (error as any).code,
          reason: (error as any).reason,
          wasClean: (error as any).wasClean,
        },
        socketId,
      });
    };
    socket.onmessage = (event: MessageEvent) => {
      self.postMessage({ type: "message", message: event.data, socketId });
    };

    sockets[socketId] = socket;
  };

  self.addEventListener("message", ({ data }) => {
    if (data.type === "create") {
      connect(data.url, data.protocols || [], data.socketId);
    } else if (data.type === "binaryType") {
      if (sockets[data.socketId]) {
        sockets[data.socketId].binaryType = data.binaryType;
      }
    } else if (data.type === "send") {
      if (
        sockets[data.socketId] &&
        sockets[data.socketId].readyState === WebSocket.OPEN
      ) {
        sockets[data.socketId].send(data.data);
      }
    } else if (data.type === "close") {
      if (sockets[data.socketId]) {
        sockets[data.socketId].close();
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
  id: string;
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
    this.id = nanoid();

    worker.postMessage({ type: "create", url, protocols, socketId: this.id });

    this.workerMessageHandler = ({ data }: any) => {
      if (data.socketId !== this.id) {
        return;
      }

      if (data.type === "open") {
        this.readyState = 1;
        this.listeners.open.forEach((listener) => listener());
      } else if (data.type === "close") {
        this.readyState = 3;
        this.listeners.close.forEach((listener) => listener());
      } else if (data.type === "error") {
        this.listeners.error.forEach((listener) => listener(data.error));
      } else if (data.type === "message") {
        this.listeners.message.forEach((listener) =>
          listener(new MessageEvent("message", { data: data.message }))
        );
      }
    };

    worker.addEventListener("message", this.workerMessageHandler);
  }

  set binaryType(binaryType: "blob" | "arraybuffer") {
    worker.postMessage({ type: "binaryType", binaryType, socketId: this.id });
  }

  send(data: string | ArrayBuffer) {
    if (this.readyState !== 1) {
      throw new Error("WebSocket is not open");
    }
    worker.postMessage({ type: "send", data, socketId: this.id });
  }

  close() {
    worker.postMessage({ type: "close", socketId: this.id });

    worker.removeEventListener("message", this.workerMessageHandler);

    this.readyState = 3;
    this.listeners.close.forEach((listener) => listener());
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

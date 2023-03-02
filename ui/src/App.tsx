import React, { useState } from "react";
import "./App.css";

interface IEvent {
  version: "0";
  id: string;
  "detail-type": "PRODUCT_CREATED" | "PRODUCT_UPDATED";
  source: "event-generator-lambda";
  account: string;
  time: string;
  region: string;
  resources: unknown;
  detail: { name: string; priceInPence: number; colour: string };
}

enum ConnectingState {
  IDLE = "IDLE",
  DISCONNECTED = "DISCONNECTED",
  CONNECTED = "CONNECTED",
  CONNECTING = "CONNECTING",
  FAILED = "FAILED",
}

function prettyStatus(status: ConnectingState): string {
  switch (status) {
    case ConnectingState.IDLE:
      return "Waiting to connect.";
    case ConnectingState.CONNECTING:
      return "Connecting...";
    case ConnectingState.CONNECTED:
      return "Connected!";
    case ConnectingState.FAILED:
      return "Failed to connect - check the developer tools.";
    case ConnectingState.DISCONNECTED:
      return "Disconnected - hit 'Connect' to go again!";
    default:
      throw new Error(`Unhandled state ${status}`);
  }
}

const API_URL = process.env.REACT_APP_API_URL;

const EVENT_RING_BUFFER_SIZE = 20;

function colourForEventTime(time: string): string {
  const parsedTime = new Date(time);
  const now = new Date();
  const diffMs = now.getTime() - parsedTime.getTime();

  if (diffMs < 5000) {
    return "#80ffaa";
  } else if (diffMs < 10000) {
    return "#99ffbb";
  } else if (diffMs < 15000) {
    return "#b3ffcc";
  } else if (diffMs < 20000) {
    return "#ccffdd";
  } else if (diffMs < 30000) {
    return "#e6ffee";
  } else {
    return "#ffffff";
  }
}

function App() {
  const [events, setEvents] = useState<IEvent[]>([]);
  const [connected, setConnected] = useState<ConnectingState>(
    ConnectingState.IDLE,
  );
  const [currentSocket, setCurrentSocket] = useState<WebSocket | null>(null);
  const [lastEventReceived, setLastEventReceived] = useState<Date | null>(null);

  return (
    <div
      className="mt-3 mx-auto grid grid-cols-12 gap-4"
      style={{ maxWidth: 1280 }}
    >
      <div className="col-span-12">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Live Debugging EventBridge Event Bus
          </h1>
        </header>
      </div>

      <div className="col-span-12 text-center">
        <button
          type="button"
          className="text-white bg-green-700 hover:bg-green-800 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none"
          onClick={() => {
            if (currentSocket) {
              alert("You're already connected!");
              return;
            }

            setConnected(ConnectingState.CONNECTING);

            const eventsRingBuffer = Array(EVENT_RING_BUFFER_SIZE).fill(null);
            let currentEvent = 0;

            if (!API_URL) {
              throw new Error("You must specify a REACT_APP_API_URL.");
            }

            const socket = new WebSocket(API_URL);

            socket.addEventListener("open", () => {
              console.log("websocket connection established");
              setConnected(ConnectingState.CONNECTED);
            });

            socket.addEventListener("message", (event) => {
              console.log("Message from server ", event.data, currentEvent);

              eventsRingBuffer[currentEvent] = JSON.parse(event.data);
              currentEvent++;

              if (currentEvent === eventsRingBuffer.length) {
                currentEvent = 0;
              }

              // Does not trigger a re-render in and of itself
              setEvents(eventsRingBuffer);

              // Nasty hack to trigger a render
              setLastEventReceived(new Date());
            });

            socket.addEventListener("close", () => {
              console.log("websocket connection closed");
              setConnected(ConnectingState.DISCONNECTED);
              setCurrentSocket(null);
            });

            socket.addEventListener("error", (event) => {
              console.error("websocket connection errored", event);
              setConnected(ConnectingState.FAILED);
              setCurrentSocket(null);
            });

            setCurrentSocket(socket);
          }}
        >
          Connect
        </button>
        <button
          type="button"
          className="text-white bg-red-700 hover:bg-red-800 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 focus:outline-none"
          onClick={() => {
            setConnected(ConnectingState.DISCONNECTED);

            currentSocket?.close();
          }}
        >
          Disconnect
        </button>

        <p>{prettyStatus(connected)}</p>
      </div>

      <div className="col-span-12">
        <p className="text-center">
          The last {EVENT_RING_BUFFER_SIZE} events are shown in a ring buffer
          that wraps around when full.{" "}
          {lastEventReceived ? (
            <>Last event received at {lastEventReceived.toISOString()}</>
          ) : (
            <></>
          )}
        </p>
      </div>

      <div className="col-span-12">
        <ul>
          {events
            .filter((event) => !!event)
            .map((event) => (
              <li
                key={event.id}
                className="grid grid-cols-12 gap-4"
                style={{ backgroundColor: colourForEventTime(event.time) }}
              >
                <div className="col-span-2 p-4">{event.time}</div>
                <div className="col-span-2 p-4 eventData">
                  {event["detail-type"]}
                </div>
                <div className="col-span-8 p-4 eventData">
                  {JSON.stringify(event.detail, null, 2)}
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

export default App;

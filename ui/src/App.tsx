import React, { useState } from "react";
import "./App.css";

interface IEvent {
  timestamp: string;
  data: string;
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
      return "Waiting to connect. Set your API key and then hit 'Connect'.";
    case ConnectingState.CONNECTING:
      return "Connecting...";
    case ConnectingState.CONNECTED:
      return "Connected!";
    case ConnectingState.FAILED:
      return "Failed to connect - check the developer tools.";
    case ConnectingState.DISCONNECTED:
      return "Disconnected - hit 'Connect' to go again!";
    default:
      throw new Error(`Unhandled state ${status}`)
  }
}

function App() {
  const [apiKey, setApiKey] = useState("");
  const [events, setEvents] = useState<IEvent[]>([]);
  const [connected, setConnected] = useState<ConnectingState>(
    ConnectingState.IDLE,
  );
  const [currentSocket, setCurrentSocket] = useState<WebSocket | null>(null);

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
          className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none"
          onClick={() => {
            const result = window.prompt("Enter your API key");
            if (result) {
              setApiKey(result);
            }
          }}
        >
          Set API key
        </button>
        <button
          type="button"
          className="text-white bg-green-700 hover:bg-green-800 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none"
          onClick={() => {
            if (!apiKey) {
              alert("You must set your API key first.");
              return;
            }

            if (currentSocket) {
              alert("You're already connected!");
              return;
            }

            setConnected(ConnectingState.CONNECTING);

            const socket = new WebSocket('wss://9ujk89eew6.execute-api.eu-west-1.amazonaws.com/live/');

            socket.addEventListener('open', () => {
              setConnected(ConnectingState.CONNECTED);
            });

            socket.addEventListener('message', (event) => {
              console.log('Message from server ', event.data);

              /*
                Mutating the events array like this is probably very
                naughty and is proof that I should be nowhere near a React
                codebase.
               */
              events.push(event.data);
              setEvents(events);
            });

            socket.addEventListener("close", () => {
              setConnected(ConnectingState.DISCONNECTED);
            })

            socket.addEventListener("error", (event) => {
              console.log("Error:", event)
              setConnected(ConnectingState.FAILED);
            })

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
        <ul>
          {events.map((event) => (
            <li className="grid grid-cols-12 gap-4">
              <div className="col-span-4 p-4">{event.timestamp}</div>
              <div className="col-span-8 p-4 eventData">event.data</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;

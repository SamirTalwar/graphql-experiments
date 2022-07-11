import { useEffect, useState } from "react";
import * as counter from "./counter";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    (async () => {
      const ws = await counter.subscribe();
      ws.onmessage = (message) => {
        setCount(JSON.parse(message.data).data.counter.count);
      };
      ws.send(`subscription { counter { count } }`);
    })().catch(console.error);
  });

  return (
    <div className="App">
      <h1>
        <a href="#" onClick={counter.increment}>
          🐮
        </a>
      </h1>
      <p>This cow has been clicked {count} times.</p>
    </div>
  );
}

export default App;

import { useEffect, useState } from "react";
import * as counter from "./counter";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    counter
      .query()
      .then((data) => setCount(data.counter.count))
      .catch(console.error);
  });
  const increment = () =>
    counter.increment().then((data) => setCount(data.increment.count));

  return (
    <div className="App">
      <h1>
        <a href="#" onClick={increment}>
          🐮
        </a>
      </h1>
      <p>This cow has been clicked {count} times.</p>
    </div>
  );
}

export default App;

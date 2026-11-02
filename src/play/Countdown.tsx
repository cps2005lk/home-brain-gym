import { useEffect, useState } from "react";

interface CountdownProps {
  readonly title: string;
  readonly how: string;
  readonly onDone: () => void;
}

/** 3 - 2 - 1 before the game starts, like the prototype. */
export function Countdown({ title, how, onDone }: CountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onDone();
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 800);
    return () => clearTimeout(timer);
  }, [count, onDone]);

  return (
    <div className="board">
      <div className="center">
        <p className="sub">{title}</p>
        <div className="big">{count}</div>
        <p style={{ margin: 0, maxWidth: "30ch" }}>{how}</p>
      </div>
    </div>
  );
}

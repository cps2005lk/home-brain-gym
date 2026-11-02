interface SparklineProps {
  /** Scores, oldest first. */
  readonly values: readonly number[];
}

/**
 * The little bar chart on a game tile.
 *
 * A React component is just a function that returns markup (JSX). The props
 * are its parameters, typed by an interface - very close to a method taking a
 * small record in C#. `readonly` props remind us never to change them: a
 * component only draws what it is given.
 */
export function Sparkline({ values }: SparklineProps) {
  if (values.length === 0) return null;
  const highest = Math.max(1, ...values);

  return (
    <div className="spark" title={`Last ${values.length} scores`}>
      {values.map((value, index) => (
        // Every item in a list needs a stable "key" so React can tell the
        // items apart when the list changes.
        <i
          key={`${index}-${value}`}
          style={{ height: `${Math.max(3, (value / highest) * 26)}px` }}
        />
      ))}
    </div>
  );
}

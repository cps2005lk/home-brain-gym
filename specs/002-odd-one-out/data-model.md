# Data model: Odd One Out

All of this lives in memory, inside `src/games/odd-one-out/logic.ts`. Nothing
new is saved: the finished game becomes the same `FinishedPlay` row as every
game (score = rounds, detail = mistakes).

## ShapeKind

`"circle" | "square" | "triangle" | "star" | "heart"` (a union type, like the
other games use instead of an enum).

Each kind has a `symmetryDeg`: circle 0 (any turn looks the same), square 90,
triangle 120, star 72, heart 360.

## Shape

| Field     | Type        | Meaning                                    |
| --------- | ----------- | ------------------------------------------ |
| `kind`    | `ShapeKind` | Which shape is drawn.                      |
| `scale`   | `number`    | 1 = normal size.                           |
| `turnDeg` | `number`    | 0 = not turned.                            |
| `dot`     | `boolean`   | Has the small centre dot (Teen shapes do). |

Two shapes are "the same" when all four fields are equal.

## Change (Teen only)

`"bigger" | "smaller" | "turned" | "no-dot"`. `changesFor(kind, level)` gives the
changes allowed for a kind; `turned` is left out when `symmetryDeg === 0` or
`turnDeg % symmetryDeg === 0` (FR-016).

## Grid

| Field      | Type               | Meaning                                  |
| ---------- | ------------------ | ---------------------------------------- |
| `shapes`   | `readonly Shape[]` | `rows × cols` shapes, row by row.        |
| `oddIndex` | `number`           | Where the odd shape is (0 … length − 1). |

Rules (tested over many seeded grids, SC-001):

- `shapes.length === rows * cols` for the level.
- Every shape except `shapes[oddIndex]` is equal to the others.
- `shapes[oddIndex]` is not equal to them.
- Junior: the odd `kind` differs. Teen: the odd `kind` is the same, and
  exactly one of size, turn or dot differs.

## OddOneOutLevel

| Field          | Junior | Teen |
| -------------- | ------ | ---- |
| `seconds`      | 45     | 30   |
| `rows`         | 2      | 4    |
| `cols`         | 3      | 4    |
| `subtle`       | false  | true |
| `biggerScale`  | –      | 1.2  |
| `smallerScale` | –      | 0.82 |
| `turnDeg`      | –      | 20   |

(Unused numbers can be kept on Junior too; the type is one shape for both.)

## OddOneOutState

| Field           | Type                         | Meaning                                  |
| --------------- | ---------------------------- | ---------------------------------------- |
| `level`         | `LevelId`                    |                                          |
| `endsAtMs`      | `number`                     | `startedAtMs + seconds * 1000`           |
| `nowMs`         | `number`                     | Last event time.                         |
| `grid`          | `Grid`                       | The grid on screen.                      |
| `gridShownAtMs` | `number`                     | When this grid appeared (for the pause). |
| `correct`       | `number`                     | Rounds solved - the score.               |
| `mistakes`      | `number`                     |                                          |
| `lastAnswer`    | `"right" \| "wrong" \| null` | For the flash.                           |

Input: `number` - the index of the tapped shape.

## State changes (`reduce`)

1. Game already over → state unchanged.
2. `tick` → only `nowMs` moves.
3. Answer with `atMs >= endsAtMs` → only `nowMs` moves (now over; not counted).
4. Answer with `atMs < gridShownAtMs + 300` → only `nowMs` moves (ignored).
5. Answer with an index outside the grid → only `nowMs` moves.
6. Answer on `oddIndex` → `correct + 1`, `lastAnswer: "right"`, new grid,
   `gridShownAtMs = atMs`.
7. Any other answer → `mistakes + 1`, `lastAnswer: "wrong"`, new grid,
   `gridShownAtMs = atMs`.

import { useState } from "react";
import { AVATARS, KID_COLORS, KID_COLOR_TOKENS, type Kid } from "../data/types";

interface KidEditorProps {
  readonly kid: Kid;
  readonly onSave: (kid: Kid) => void;
  readonly onCancel: () => void;
}

/**
 * Name, avatar and colour - the parts a kid may change themselves.
 * The level is not here: only the parent sets it (Milestone 8).
 */
export function KidEditor({ kid, onSave, onCancel }: KidEditorProps) {
  /**
   * `useState` gives a component its own memory. It returns the value and a
   * function to replace it; calling that function makes React draw again.
   * TypeScript works the type out from the starting value, so `draft` is a Kid.
   */
  const [draft, setDraft] = useState(kid);

  return (
    <div className="card editor">
      <div>
        <span className="label">Name</span>
        <input
          type="text"
          value={draft.name}
          maxLength={16}
          aria-label="Kid name"
          /* event.target.value is typed, so a typo here is a compile error */
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
      </div>

      <div>
        <span className="label">Picture</span>
        <div className="choices">
          {AVATARS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              className="choice"
              aria-label={`Picture ${avatar}`}
              aria-pressed={draft.avatar === avatar}
              onClick={() => setDraft({ ...draft, avatar })}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Colour</span>
        <div className="choices">
          {KID_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="choice swatch"
              style={{ background: KID_COLOR_TOKENS[color] }}
              aria-label={`Colour ${color}`}
              aria-pressed={draft.color === color}
              onClick={() => setDraft({ ...draft, color })}
            />
          ))}
        </div>
      </div>

      <div className="row">
        <button type="button" className="play grow" onClick={() => onSave(draft)}>
          Save
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

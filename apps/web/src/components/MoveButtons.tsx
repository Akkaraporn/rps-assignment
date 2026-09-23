import { MOVES, type Move } from '@rps/shared';

interface Props {
  disabled: boolean;
  selected: Move | null;
  onChoose: (move: Move) => void;
}

export function MoveButtons({ disabled, selected, onChoose }: Props) {
  return (
    <div className="moves">
      <span className="moves__label">Your action</span>
      <div className="moves__buttons">
        {MOVES.map((move) => (
          <button
            key={move}
            type="button"
            className={`move-button${move === selected ? ' move-button--selected' : ''}`}
            disabled={disabled}
            aria-pressed={move === selected}
            data-testid={`move-${move}`}
            onClick={() => onChoose(move)}
          >
            {move}
          </button>
        ))}
      </div>
    </div>
  );
}
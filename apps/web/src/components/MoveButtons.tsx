import { MOVES, type Move } from '@rps/shared';

interface Props {
  disabled: boolean;
  onChoose: (move: Move) => void;
}

export function MoveButtons({ disabled, onChoose }: Props) {
  return (
    <div className="moves">
      <span className="moves__label">Your action</span>
      <div className="moves__buttons">
        {MOVES.map((move) => (
          <button
            key={move}
            type="button"
            className="move-button"
            disabled={disabled}
            onClick={() => onChoose(move)}
          >
            {move}
          </button>
        ))}
      </div>
    </div>
  );
}
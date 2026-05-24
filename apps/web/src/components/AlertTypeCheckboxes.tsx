import {
  ALERT_TYPE_LABELS,
  SUBSCRIBABLE_ALERT_TYPES,
  type AlertType,
} from '../api/types';

interface Props {
  selected: AlertType[];
  onChange: (next: AlertType[]) => void;
}

export function AlertTypeCheckboxes({ selected, onChange }: Props) {
  const toggle = (type: AlertType) => {
    if (selected.includes(type)) {
      onChange(selected.filter((item) => item !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="checkbox-group">
      {SUBSCRIBABLE_ALERT_TYPES.map((type) => (
        <label key={type} className="checkbox">
          <input
            type="checkbox"
            checked={selected.includes(type)}
            onChange={() => toggle(type)}
          />
          {ALERT_TYPE_LABELS[type]}
        </label>
      ))}
    </div>
  );
}

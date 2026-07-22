import { useCallback } from 'react';

/** Props exposed to a React component rendered as a Filament field. */
export interface ReactFieldProps<T> {
  /** Current value from Filament. */
  value: T;
  /** Controlled-input callback. The wrapper forwards it to Filament. */
  onChange: (value: T) => void;
  fieldName?: string;
  fieldId?: string;
  livewireComponentId?: string;
  errors?: string[];
  validation?: unknown[];
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  resizable?: boolean;
  fullscreen?: boolean;
  toolbar?: string[];
}

/**
 * Small convenience adapter for shared components that want a stable,
 * React-shaped field API without knowing about Livewire.
 */
export function useReactField<T>(props: ReactFieldProps<T>) {
  const { value, onChange } = props;
  const setValue = useCallback(
    (nextValue: T | ((previous: T) => T)) => {
      const nextResolvedValue =
        typeof nextValue === 'function' ? (nextValue as (previous: T) => T)(value) : nextValue;

      onChange(nextResolvedValue);
    },
    [onChange, value]
  );

  return {
    value,
    setValue,
    errors: props.errors ?? [],
    hasErrors: (props.errors?.length ?? 0) > 0,
    required: props.required ?? false,
    disabled: props.disabled ?? false,
    fieldName: props.fieldName,
    fieldId: props.fieldId,
  };
}

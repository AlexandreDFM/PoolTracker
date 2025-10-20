import { useCallback, useState } from 'react';

const COLORS = ['pink', 'purple', 'orange'];

const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

/**
 * Hook that provides a random color and a function to refresh it.
 * @param initial optional initial color, if not provided a random one is used
 * @returns [color, refreshColor]
 */
export default function useRandColor(initial) {
  const [color, setColor] = useState(() => (initial ? initial : randColor()));

  const refreshColor = useCallback(() => {
    setColor(randColor());
  }, []);

  return [color, refreshColor];
}

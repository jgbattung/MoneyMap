import { useEffect, useRef, useState } from 'react';

export function useShakeOnError(formState: {
  submitCount: number;
  isSubmitSuccessful: boolean;
}): {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  shakeClassName: string;
} {
  const { submitCount, isSubmitSuccessful } = formState;
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [shakeClassName, setShakeClassName] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (submitCount > 0 && !isSubmitSuccessful) {
      setShakeClassName('animate-shake');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setShakeClassName('');
      }, 300);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [submitCount, isSubmitSuccessful]);

  return { buttonRef, shakeClassName };
}

import { useState, useEffect } from 'react';

export function useKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [initialHeight, setInitialHeight] = useState(0);

  useEffect(() => {
    setInitialHeight(window.innerHeight);

    const handleResize = () => {
      // Small delay to let the visual viewport stabilize
      setTimeout(() => {
        const currentHeight = window.innerHeight;
        const vViewport = window.visualViewport;
        
        if (vViewport) {
          const isKeyboard = vViewport.height < currentHeight * 0.85;
          setIsKeyboardOpen(isKeyboard);
          setKeyboardHeight(isKeyboard ? currentHeight - vViewport.height : 0);
        } else {
          const isKeyboard = currentHeight < initialHeight * 0.75;
          setIsKeyboardOpen(isKeyboard);
          setKeyboardHeight(isKeyboard ? initialHeight - currentHeight : 0);
        }
      }, 50);
    };

    const handleOrientationChange = () => {
      // Reset initial height on orientation change
      setTimeout(() => {
        setInitialHeight(window.innerHeight);
      }, 100);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [initialHeight]);

  return { isKeyboardOpen, keyboardHeight };
}

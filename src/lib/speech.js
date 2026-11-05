import { useCallback, useEffect, useRef, useState } from 'react';

// Browser Web Speech API. It usually needs internet (the browser sends audio to a server),
// so the UI always keeps typing available. On-device speech (e.g. Whisper) is the next step.
const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useSpeech(lang = 'en-IN') {
  const recRef = useRef(null);
  const onFinalRef = useRef(() => {});
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');

  const start = useCallback(
    (onFinal) => {
      if (!SR) return;
      onFinalRef.current = onFinal;
      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = (e) => {
        let fin = '';
        let tmp = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript;
          if (e.results[i].isFinal) fin += text;
          else tmp += text;
        }
        setInterim(tmp);
        if (fin) onFinalRef.current(fin);
      };
      rec.onerror = (e) => {
        const msg =
          e.error === 'network'
            ? 'Voice needs internet. Type the visit instead.'
            : e.error === 'not-allowed'
            ? 'Microphone is blocked. Allow it in the browser settings.'
            : e.error === 'no-speech'
            ? 'No speech heard. Try again.'
            : `Voice error: ${e.error}`;
        setError(msg);
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
        setInterim('');
      };
      setError('');
      rec.start();
      recRef.current = rec;
      setListening(true);
    },
    [lang]
  );

  const stop = useCallback(() => recRef.current?.stop(), []);
  useEffect(() => () => recRef.current?.abort(), []);

  return { supported: Boolean(SR), listening, interim, error, start, stop };
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

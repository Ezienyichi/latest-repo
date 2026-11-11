import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Icon from './Icon';

// A password <input> with a show/hide eye. Hidden by default and hidden again whenever its form is
// submitted. It only switches the input's type — the value is stored and sent exactly as before.
export default function PasswordInput({ className = 'fi', style, ...props }) {
  const [shown, setShown] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const hide = () => setShown(false);
    form.addEventListener('submit', hide);
    return () => form.removeEventListener('submit', hide);
  }, []);
  return (
    <div className="pw-wrap">
      <input {...props} ref={ref} className={className} type={shown ? 'text' : 'password'} style={{ ...style, paddingRight: 46 }} />
      <button type="button" className="pw-eye" onClick={() => setShown(s => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}>
        <Icon icon={shown ? EyeOff : Eye} size="inline" aria-hidden="true" />
      </button>
    </div>
  );
}

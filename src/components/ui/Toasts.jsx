import { X, Info, Check } from 'lucide-react';
import Icon from './Icon';

export default function Toasts({ list = [], dismiss }) {
  if (!list.length) return null;
  return (
    <div className="toast-wrap">
      {list.map(t => (
        <div key={t.id} className={`toast ${t.type || 'ok'}`} onClick={() => dismiss(t.id)}>
          <Icon icon={t.type === 'err' ? X : t.type === 'info' ? Info : Check} size="inline" />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

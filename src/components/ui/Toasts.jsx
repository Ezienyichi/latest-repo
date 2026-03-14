export default function Toasts({ list = [], dismiss }) {
  if (!list.length) return null;
  return (
    <div className="toast-wrap">
      {list.map(t => (
        <div key={t.id} className={`toast ${t.type || 'ok'}`} onClick={() => dismiss(t.id)}>
          <span>{t.type === 'err' ? '✕' : t.type === 'info' ? 'ℹ' : '✓'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

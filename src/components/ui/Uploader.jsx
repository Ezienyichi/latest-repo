import { useState, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import api from '../../utils/api';

function humanSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// bucket: 'artwork' | 'previews' | 'avatars' | 'charity-docs' — must match a
//   key in functions/_lib/storage.js BUCKETS, which is the actual authority
//   on what's allowed; accept/maxBytes here are for instant client feedback.
// value: { path, publicUrl } | null — currently-set file, if any
// onUploaded({ path, publicUrl }): fires once the upload completes.
//   publicUrl is null for private buckets (artwork, charity-docs) — callers
//   in those buckets store `path` and fetch a signed download URL on demand.
// Note: the signed URL from /uploads/sign accepts a raw PUT with no API key
// or auth header at all (verified against Supabase directly) — the token
// is embedded in the URL itself, so nothing Supabase-related ships to the
// browser beyond that one-time URL.
export default function Uploader({ bucket, accept, maxBytes, value, onUploaded, kind = 'image', label }) {
  const { toast } = useCart();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  const acceptList = accept.split(',').map(s => s.trim());

  const validate = (file) => {
    if (!acceptList.includes(file.type)) { toast(`"${file.type || 'that file type'}" isn't allowed here`, 'err'); return false; }
    if (file.size > maxBytes) { toast(`File is too large — max ${humanSize(maxBytes)}`, 'err'); return false; }
    return true;
  };

  const upload = useCallback(async (file) => {
    if (!validate(file)) return;
    setUploading(true);
    setProgress(0);
    try {
      const sign = await api.signUpload({ bucket, filename: file.name, contentType: file.type, fileSize: file.size });

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', sign.signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Upload failed — network error'));
        xhr.send(file);
      });

      onUploaded({ path: sign.path, publicUrl: sign.publicUrl });
      toast('Upload complete', 'ok');
    } catch (e) {
      toast(e.message || 'Upload failed', 'err');
    } finally {
      setUploading(false);
    }
  }, [bucket, maxBytes]);

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? 'var(--mint)' : 'var(--border)'}`,
        borderRadius: 'var(--r)', padding: 14, cursor: uploading ? 'default' : 'pointer', textAlign: 'left',
        background: dragOver ? 'rgba(23,124,29,.06)' : 'var(--glass)', transition: 'all .15s',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={onPick} style={{ display: 'none' }} />

      {kind === 'image' && value?.publicUrl ? (
        <img src={value.publicUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      ) : kind === 'image' ? (
        <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--border)', flexShrink: 0 }} />
      ) : value?.path ? (
        <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          <FileText size={20} strokeWidth={1.75} />
        </div>
      ) : null}

      <div style={{ flex: 1, fontSize: 12 }}>
        {uploading ? (
          <>
            <div style={{ marginBottom: 6 }}>Uploading… {progress}%</div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--mint)', transition: 'width .15s' }} />
            </div>
          </>
        ) : value?.path ? (
          <>
            <div style={{ fontWeight: 500 }}>{label || 'File uploaded'}</div>
            <div style={{ color: 'var(--muted)' }}>Click or drop to replace</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 500 }}>{label || 'Drop a file or click to browse'}</div>
            <div style={{ color: 'var(--muted)' }}>Max {humanSize(maxBytes)}</div>
          </>
        )}
      </div>
    </div>
  );
}

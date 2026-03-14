import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import DashboardShell from './DashboardShell';
import api from '../../utils/api';

export default function CharityMessages() {
  const { toast } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplate, setNewTemplate] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msgType, setMsgType] = useState('APPRECIATION');
  const [sending, setSending] = useState(false);
  const [tmplForm, setTmplForm] = useState({ name: '', subject: '', bodyHtml: '' });

  const load = () => { api.getCharityDashboard().then(setData).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const sendMessage = async () => {
    if (!subject.trim() || !body.trim()) { toast('Subject and body required', 'err'); return; }
    setSending(true);
    try {
      await api.post('/dashboard/charity/messages', { subject, bodyHtml: body, messageType: msgType });
      toast(`Message sent to ${data?.stats?.funderCount || 0} funders!`, 'ok');
      setComposing(false); setSubject(''); setBody('');
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setSending(false); }
  };

  const useTemplate = (t) => { setSubject(t.subject); setBody(t.bodyHtml); setShowTemplates(false); setComposing(true); toast('Template loaded', 'ok'); };

  const saveTemplate = async () => {
    if (!tmplForm.name || !tmplForm.subject) { toast('Name and subject required', 'err'); return; }
    try {
      await api.post('/dashboard/charity/templates', tmplForm);
      toast('Template saved!', 'ok');
      setNewTemplate(false); setTmplForm({ name: '', subject: '', bodyHtml: '' });
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const deleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try { await api.delete(`/dashboard/charity/templates/${id}`); toast('Deleted', 'ok'); load(); }
    catch (e) { toast(e.message, 'err'); }
  };

  const messages = data?.messages || [];
  const templates = data?.templates || [];

  if (loading) return <DashboardShell title="Messages"><div className="skel" style={{ height: 200, borderRadius: 'var(--rl)' }} /></DashboardShell>;

  return (
    <DashboardShell title="Messages & Templates">
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="btn btn-p" onClick={() => { setComposing(true); setShowTemplates(false); setNewTemplate(false); }}>✉️ Compose Message</button>
        <button className="btn btn-s" onClick={() => { setShowTemplates(true); setComposing(false); setNewTemplate(false); }}>📋 Templates ({templates.length})</button>
      </div>

      {/* Compose form */}
      {composing && (
        <div className="card" style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 22 }}>Compose Message</h3>
            <button className="btn btn-g btn-sm" onClick={() => setComposing(false)}>Cancel</button>
          </div>
          <div className="alert alert-i" style={{ marginBottom: 16 }}>
            <span>📨</span>
            <div>This message will be sent to <strong>{data?.stats?.funderCount || 0}</strong> funders via the platform. Funder email addresses remain private.</div>
          </div>
          <div className="fg">
            <label className="fl">Message Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['APPRECIATION', '💝 Appreciation'], ['NEWSLETTER', '📰 Newsletter'], ['RESOURCE_SHARE', '📁 Resource Share']].map(([v, l]) => (
                <button key={v} className={`btn btn-sm ${msgType === v ? 'btn-p' : 'btn-s'}`} onClick={() => setMsgType(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="fg"><label className="fl">Subject *</label><input className="fi" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject line" /></div>
          <div className="fg"><label className="fl">Message Body *</label><textarea className="fi fta" value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Write your message to funders..." /></div>
          {templates.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Load from template: </span>
              {templates.map(t => (
                <button key={t.id} className="btn btn-g btn-sm" style={{ marginLeft: 4, fontSize: 11 }} onClick={() => useTemplate(t)}>{t.name}</button>
              ))}
            </div>
          )}
          <button className="btn btn-p btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={sendMessage} disabled={sending}>
            {sending ? 'Sending...' : `Send to ${data?.stats?.funderCount || 0} Funders`}
          </button>
        </div>
      )}

      {/* Templates */}
      {showTemplates && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: 20 }}>Message Templates</h3>
            <button className="btn btn-s btn-sm" onClick={() => setNewTemplate(true)}>+ New Template</button>
          </div>

          {newTemplate && (
            <div className="card" style={{ padding: 22, marginBottom: 14 }}>
              <div className="fg"><label className="fl">Template Name</label><input className="fi" value={tmplForm.name} onChange={e => setTmplForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Monthly Appreciation" /></div>
              <div className="fg"><label className="fl">Subject</label><input className="fi" value={tmplForm.subject} onChange={e => setTmplForm(p => ({ ...p, subject: e.target.value }))} /></div>
              <div className="fg"><label className="fl">Body</label><textarea className="fi fta" value={tmplForm.bodyHtml} onChange={e => setTmplForm(p => ({ ...p, bodyHtml: e.target.value }))} rows={4} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-p btn-sm" onClick={saveTemplate}>Save Template</button>
                <button className="btn btn-g btn-sm" onClick={() => setNewTemplate(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="g3" style={{ gap: 14 }}>
            {templates.map(t => (
              <div key={t.id} className="card" style={{ padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Subject: {t.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 12, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>{t.bodyHtml?.replace(/<[^>]*>/g, '').slice(0, 120)}...</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-p btn-sm" onClick={() => useTemplate(t)}>Use</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(t.id)}>Delete</button>
                </div>
              </div>
            ))}
            {templates.length === 0 && !newTemplate && <div style={{ color: 'var(--muted)', fontSize: 13 }}>No templates yet. Create one to speed up funder communication.</div>}
          </div>
        </div>
      )}

      {/* Message history */}
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Message History</h3>
        {messages.length > 0 ? (
          <table className="tbl">
            <thead><tr><th>Subject</th><th>Type</th><th>Recipients</th><th>Sent</th></tr></thead>
            <tbody>
              {messages.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.subject}</td>
                  <td><span className={`badge ${m.messageType === 'APPRECIATION' ? 'b-green' : m.messageType === 'NEWSLETTER' ? 'b-blue' : 'b-gold'}`} style={{ fontSize: 10 }}>{m.messageType}</span></td>
                  <td>{m.recipientCount}</td>
                  <td style={{ fontSize: 12 }}>{new Date(m.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No messages sent yet. Compose your first appreciation message!</div>}
      </div>
    </DashboardShell>
  );
}

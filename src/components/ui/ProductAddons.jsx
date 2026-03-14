import { useState, useEffect } from 'react';

// Renders all product add-on fields dynamically based on type
// Supports: text, textarea, select, radio, checkbox, color_swatch, date, number, file, heading, note
// Conditional logic: show/hide fields based on other field values

export default function ProductAddons({ addons = [], values, onChange, conditionalRules = [] }) {
  // Determine visibility based on conditional rules
  const isVisible = (addon) => {
    if (!conditionalRules.length) return true;
    const rules = conditionalRules.filter(r => r.addonId === addon.id);
    if (!rules.length) return true;
    return rules.every(rule => {
      const triggerVal = values[rule.triggerAddonId];
      const matches = triggerVal === rule.triggerValue || (Array.isArray(triggerVal) && triggerVal.includes(rule.triggerValue));
      return rule.action === 'show' ? matches : !matches;
    });
  };

  const set = (id, val) => onChange({ ...values, [id]: val });

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="fl" style={{ marginBottom: 12 }}>Customise Your Order</div>
      {addons.filter(isVisible).map(ao => (
        <div key={ao.id} style={{ marginBottom: 16 }}>
          {/* HEADING */}
          {ao.fieldType === 'HEADING' && (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', paddingTop: 8 }}>{ao.label}</div>
          )}

          {/* NOTE */}
          {ao.fieldType === 'NOTE' && (
            <div className="alert alert-i" style={{ fontSize: 12 }}>{ao.label}</div>
          )}

          {/* TEXT */}
          {ao.fieldType === 'TEXT' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label} {ao.required && <span style={{ color: '#dc2626' }}>*</span>}</label>
              <input className="fi" value={values[ao.id] || ''} onChange={e => set(ao.id, e.target.value)}
                placeholder={ao.options?.placeholder || ''} required={ao.required} />
              {ao.priceModifier && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>+£{Number(ao.priceModifier).toFixed(2)}</div>}
            </div>
          )}

          {/* TEXTAREA */}
          {ao.fieldType === 'TEXTAREA' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label} {ao.required && <span style={{ color: '#dc2626' }}>*</span>}</label>
              <textarea className="fi fta" value={values[ao.id] || ''} onChange={e => set(ao.id, e.target.value)}
                placeholder={ao.options?.placeholder || ''} rows={3} required={ao.required} />
            </div>
          )}

          {/* SELECT */}
          {ao.fieldType === 'SELECT' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label} {ao.required && <span style={{ color: '#dc2626' }}>*</span>}</label>
              <select className="fi fsel" value={values[ao.id] || ''} onChange={e => set(ao.id, e.target.value)} required={ao.required}>
                <option value="">Select…</option>
                {(ao.options || []).map((opt, i) => <option key={i} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>)}
              </select>
            </div>
          )}

          {/* RADIO */}
          {ao.fieldType === 'RADIO' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label} {ao.required && <span style={{ color: '#dc2626' }}>*</span>}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(ao.options || []).map((opt, i) => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const label = typeof opt === 'string' ? opt : opt.label;
                  return (
                    <div key={i} onClick={() => set(ao.id, val)} style={{
                      padding: '10px 14px', borderRadius: 'var(--rs)', cursor: 'pointer',
                      border: `1px solid ${values[ao.id] === val ? 'var(--mint)' : 'var(--border)'}`,
                      background: values[ao.id] === val ? 'rgba(23,124,29,.06)' : 'var(--glass)',
                      display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s',
                    }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${values[ao.id] === val ? 'var(--mint)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {values[ao.id] === val && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mint)' }} />}
                      </div>
                      <span style={{ fontSize: 13 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHECKBOX */}
          {ao.fieldType === 'CHECKBOX' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(ao.options || []).map((opt, i) => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const label = typeof opt === 'string' ? opt : opt.label;
                  const checked = (values[ao.id] || []).includes(val);
                  const toggle = () => {
                    const current = values[ao.id] || [];
                    set(ao.id, checked ? current.filter(x => x !== val) : [...current, val]);
                  };
                  return (
                    <div key={i} onClick={toggle} style={{
                      padding: '10px 14px', borderRadius: 'var(--rs)', cursor: 'pointer',
                      border: `1px solid ${checked ? 'var(--mint)' : 'var(--border)'}`,
                      background: checked ? 'rgba(23,124,29,.06)' : 'var(--glass)',
                      display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s',
                    }}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${checked ? 'var(--mint)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: checked ? 'var(--mint)' : 'transparent' }}>
                        {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13 }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLOR SWATCH */}
          {ao.fieldType === 'COLOR_SWATCH' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label} {ao.required && <span style={{ color: '#dc2626' }}>*</span>}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(ao.options || []).map((color, i) => (
                  <div key={i} onClick={() => set(ao.id, color)}
                    className={`swatch${values[ao.id] === color ? ' on' : ''}`}
                    style={{ background: color, width: 32, height: 32 }}
                    title={color} />
                ))}
              </div>
              {values[ao.id] && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--fm)' }}>Selected: {values[ao.id]}</div>}
            </div>
          )}

          {/* DATE */}
          {ao.fieldType === 'DATE' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label}</label>
              <input className="fi" type="date" value={values[ao.id] || ''} onChange={e => set(ao.id, e.target.value)} />
            </div>
          )}

          {/* NUMBER */}
          {ao.fieldType === 'NUMBER' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label}</label>
              <input className="fi" type="number" value={values[ao.id] || ''} onChange={e => set(ao.id, e.target.value)} min={0} />
              {ao.priceModifier && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>×£{Number(ao.priceModifier).toFixed(2)} per unit</div>}
            </div>
          )}

          {/* FILE UPLOAD */}
          {ao.fieldType === 'FILE' && (
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{ao.label}</label>
              <div style={{ padding: '18px 16px', border: '2px dashed var(--border)', borderRadius: 'var(--r)', textAlign: 'center', cursor: 'pointer', background: 'var(--glass)' }}
                onClick={() => document.getElementById(`file-${ao.id}`)?.click()}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{values[ao.id]?.name || 'Click to upload a file'}</div>
                <input id={`file-${ao.id}`} type="file" style={{ display: 'none' }} onChange={e => set(ao.id, e.target.files?.[0] || null)} />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

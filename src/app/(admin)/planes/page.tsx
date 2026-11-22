'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { money } from '@/lib/utils';
import { useToast } from '@/components/providers';

type PlanOut = { id: number; code: string; name: string; price_month: string; limits: Record<string, number>; features: Record<string, boolean>; is_active: boolean };

const EMPTY_FORM = { code: '', name: '', price_month: '0', is_active: true, limits_raw: '{}', features_raw: '{}' };

export default function PlanesPage() {
  const toast = useToast();
  const qc    = useQueryClient();

  const [modal, setModal]     = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<PlanOut | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<PlanOut[]>('/plans'),
  });

  function openEdit(p: PlanOut) {
    setEditing(p);
    setForm({ code: p.code, name: p.name, price_month: p.price_month, is_active: p.is_active,
              limits_raw: JSON.stringify(p.limits, null, 2), features_raw: JSON.stringify(p.features, null, 2) });
    setModal('edit');
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal('create');
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        code: form.code, name: form.name, price_month: form.price_month, is_active: form.is_active,
        limits:   JSON.parse(form.limits_raw || '{}'),
        features: JSON.parse(form.features_raw || '{}'),
      };
      if (modal === 'create') {
        await api.post('/plans', payload);
        toast.success('Plan creado.');
      } else {
        await api.put(`/plans/${editing!.id}`, payload);
        toast.success('Plan actualizado.');
      }
      setModal(null);
      qc.invalidateQueries({ queryKey: ['plans'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : e instanceof SyntaxError ? 'JSON inválido en límites o features.' : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2 className="page-title">Planes</h2>
          <p className="page-sub">{plans?.length ?? 0} planes configurados</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><i className="bi bi-plus-lg" /> Nuevo plan</button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><span className="spinner spinner-lg" /></div>
        ) : !plans?.length ? (
          <div className="empty-state"><i className="bi bi-layers" /><p>No hay planes</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Código</th><th>Nombre</th><th className="numeric">Precio / mes</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td><code style={{ fontSize: 12, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{p.code}</code></td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="numeric text-money">{money(p.price_month)}</td>
                    <td>{p.is_active ? <span className="badge badge-success">Activo</span> : <span className="badge badge-neutral">Inactivo</span>}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                        <i className="bi bi-pencil" /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'create' ? 'Nuevo plan' : `Editar — ${editing?.name}`}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal(null)}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                <div className="form-group">
                  <label className="form-label">Código <span className="req">*</span></label>
                  <input className="form-input" value={form.code} disabled={modal === 'edit'}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))} placeholder="pro" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre <span className="req">*</span></label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus={modal === 'create'} />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio / mes (COP)</label>
                  <input type="number" min="0" className="form-input" value={form.price_month} onChange={(e) => setForm((f) => ({ ...f, price_month: e.target.value }))} />
                </div>
                <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 24 }}>
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                    Plan activo
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Límites (JSON)</label>
                  <textarea className="form-textarea" rows={6} style={{ fontFamily: 'monospace', fontSize: 12 }}
                    value={form.limits_raw} onChange={(e) => setForm((f) => ({ ...f, limits_raw: e.target.value }))} />
                  <span className="form-hint">Ej: {`{"users": 5, "products": 500}`}</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Features (JSON)</label>
                  <textarea className="form-textarea" rows={6} style={{ fontFamily: 'monospace', fontSize: 12 }}
                    value={form.features_raw} onChange={(e) => setForm((f) => ({ ...f, features_raw: e.target.value }))} />
                  <span className="form-hint">Ej: {`{"einvoice": true, "api": false}`}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={save}>
                {saving ? <><span className="spinner spinner-sm" /> Guardando…</> : <><i className="bi bi-check2" /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

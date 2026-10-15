"use client";

// CRM EDAI · Vencimientos de planes y dominios
// Ubicación sugerida: app/(admin)/crm/vencimientos/VencimientosCRM.tsx
// Ajusta el import de Supabase a la ruta que ya usas en EDAI-PANEL.

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Globe, CreditCard, MessageCircle, RefreshCw, Plus, X, AlertTriangle } from "lucide-react";

type Tipo = "plan" | "dominio" | "hosting" | "otro";
type Periodo = "mensual" | "trimestral" | "semestral" | "anual" | "unico";
type Estado = "vencido" | "por_vencer" | "al_dia";

interface Vencimiento {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  tipo: Tipo;
  servicio: string;
  dominio: string | null;
  proveedor: string | null;
  fecha_inicio: string;
  periodo: Periodo;
  fecha_vencimiento: string;
  monto_bs: number | null;
  dias_aviso: number;
  dias_restantes: number;
  estado: Estado;
}

interface Cliente { id: string; nombre: string }

// Fechas 'YYYY-MM-DD' sin desfase de zona horaria (Bolivia UTC-4)
const parseFecha = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmt = (s: string) => parseFecha(s).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function sumarPeriodo(fecha: string, periodo: Periodo) {
  const d = parseFecha(fecha);
  const meses = { mensual: 1, trimestral: 3, semestral: 6, anual: 12, unico: 0 }[periodo];
  d.setMonth(d.getMonth() + meses);
  return iso(d);
}

function mensajeWhatsApp(v: Vencimiento) {
  const fecha = fmt(v.fecha_vencimiento);
  const yaVencio = v.estado === "vencido";
  if (v.tipo === "dominio") {
    return yaVencio
      ? `Hola ${v.cliente_nombre}, le escribimos de EDAI. Su dominio ${v.dominio ?? ""} venció el ${fecha}. Para que su página siga funcionando hay que renovarlo lo antes posible. ¿Procedemos con la renovación?`
      : `Hola ${v.cliente_nombre}, le escribimos de EDAI. Su dominio ${v.dominio ?? ""} vence el ${fecha}. Le avisamos con tiempo para renovarlo y que su página no se interrumpa. ¿Procedemos con la renovación?`;
  }
  return yaVencio
    ? `Hola ${v.cliente_nombre}, le escribimos de EDAI. Su ${v.servicio} venció el ${fecha}. ¿Desea renovarlo para mantener el servicio activo?`
    : `Hola ${v.cliente_nombre}, le escribimos de EDAI. Le recordamos que su ${v.servicio} vence el ${fecha}${v.monto_bs ? ` (Bs ${v.monto_bs})` : ""}. ¿Lo renovamos?`;
}

const linkWhatsApp = (tel: string, texto: string) =>
  `https://wa.me/${tel.replace(/\D/g, "").replace(/^(?!591)/, "591")}?text=${encodeURIComponent(texto)}`;

const estiloEstado: Record<Estado, { fila: string; chip: string; texto: (d: number) => string }> = {
  vencido:    { fila: "border-l-red-500",    chip: "bg-red-50 text-red-700",       texto: d => `Venció hace ${Math.abs(d)} día${Math.abs(d) === 1 ? "" : "s"}` },
  por_vencer: { fila: "border-l-amber-500",  chip: "bg-amber-50 text-amber-800",   texto: d => d === 0 ? "Vence hoy" : `Vence en ${d} día${d === 1 ? "" : "s"}` },
  al_dia:     { fila: "border-l-emerald-500", chip: "bg-emerald-50 text-emerald-700", texto: d => `Faltan ${d} días` },
};

export default function VencimientosCRM() {
  const supabase = createClient();
  const [items, setItems] = useState<Vencimiento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtro, setFiltro] = useState<"todos" | Tipo>("todos");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  async function cargar() {
    setCargando(true);
    const [v, c] = await Promise.all([
      supabase.from("crm_vencimientos_estado").select("*").order("fecha_vencimiento"),
      supabase.from("crm_clientes").select("id, nombre").order("nombre"),
    ]);
    if (v.error) setError("No se pudieron cargar los vencimientos. Revisa que la migración esté aplicada.");
    else { setItems(v.data as Vencimiento[]); setError(null); }
    if (c.data) setClientes(c.data);
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function renovar(v: Vencimiento) {
    const nueva = sumarPeriodo(v.fecha_vencimiento, v.periodo);
    if (!confirm(`Marcar como renovado. Nuevo vencimiento: ${fmt(nueva)}`)) return;
    const { error } = await supabase.rpc("crm_renovar_vencimiento", { p_id: v.id });
    if (error) setError("No se pudo renovar. Intenta de nuevo.");
    else cargar();
  }

  const visibles = useMemo(() => items.filter(i => filtro === "todos" || i.tipo === filtro), [items, filtro]);
  const urgentes = items.filter(i => i.estado !== "al_dia").length;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Vencimientos</h2>
          <p className="text-sm text-slate-500">
            {urgentes > 0 ? `${urgentes} por atender: vencidos o dentro del plazo de aviso.` : "Todo al día."}
          </p>
        </div>
        <button onClick={() => setAbierto(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          <Plus size={16} /> Agregar vencimiento
        </button>
      </header>

      <div className="flex gap-2 text-sm" role="tablist">
        {(["todos", "plan", "dominio", "hosting", "otro"] as const).map(t => (
          <button key={t} role="tab" aria-selected={filtro === t} onClick={() => setFiltro(t)}
            className={`rounded-full px-3 py-1 capitalize ${filtro === t ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            {t === "todos" ? "Todos" : t === "plan" ? "Planes" : t === "dominio" ? "Dominios" : t}
          </button>
        ))}
      </div>

      {error && <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertTriangle size={16} />{error}</p>}

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no hay vencimientos registrados. Agrega el plan o el dominio de un cliente para recibir el aviso a tiempo.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {visibles.map(v => {
            const e = estiloEstado[v.estado];
            const Icono = v.tipo === "dominio" ? Globe : CreditCard;
            return (
              <li key={v.id} className={`flex flex-wrap items-center gap-4 border-l-4 p-4 ${e.fila}`}>
                <Icono size={20} className="shrink-0 text-slate-400" aria-hidden />
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium text-slate-900">{v.cliente_nombre}</p>
                  <p className="text-sm text-slate-600">
                    {v.tipo === "dominio" ? `${v.dominio ?? v.servicio}${v.proveedor ? `, en ${v.proveedor}` : ""}` : v.servicio}
                  </p>
                  <p className="text-xs text-slate-400">
                    {v.tipo === "dominio" ? "Registrado" : "Contratado"} el {fmt(v.fecha_inicio)}, renovación {v.periodo}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{fmt(v.fecha_vencimiento)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${e.chip}`}>{e.texto(v.dias_restantes)}</span>
                </div>
                <div className="flex gap-2">
                  {v.cliente_telefono && (
                    <a href={linkWhatsApp(v.cliente_telefono, mensajeWhatsApp(v))} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50">
                      <MessageCircle size={15} /> Avisar
                    </a>
                  )}
                  {v.periodo !== "unico" && (
                    <button onClick={() => renovar(v)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200">
                      <RefreshCw size={15} /> Renovado
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {abierto && <FormVencimiento clientes={clientes} onClose={() => setAbierto(false)} onSaved={() => { setAbierto(false); cargar(); }} />}
    </section>
  );
}

function FormVencimiento({ clientes, onClose, onSaved }: { clientes: Cliente[]; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const hoy = iso(new Date());
  const [f, setF] = useState({
    cliente_id: "", tipo: "plan" as Tipo, servicio: "", dominio: "", proveedor: "",
    fecha_inicio: hoy, periodo: "mensual" as Periodo, monto_bs: "", dias_aviso: "7",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esDominio = f.tipo === "dominio";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setF(p => k === "tipo" && val === "dominio" ? { ...p, tipo: "dominio", periodo: "anual", dias_aviso: "30" } : { ...p, [k]: val });
  };
  const vence = sumarPeriodo(f.fecha_inicio, f.periodo);

  async function guardar() {
    if (!f.cliente_id || (!f.servicio && !esDominio) || (esDominio && !f.dominio)) {
      setError(esDominio ? "Elige el cliente y escribe el dominio." : "Elige el cliente y escribe el servicio.");
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from("crm_vencimientos").insert({
      cliente_id: f.cliente_id, tipo: f.tipo,
      servicio: esDominio ? `Dominio ${f.dominio}` : f.servicio,
      dominio: esDominio ? f.dominio.trim().toLowerCase() : null,
      proveedor: f.proveedor || null,
      fecha_inicio: f.fecha_inicio, periodo: f.periodo, fecha_vencimiento: vence,
      monto_bs: f.monto_bs ? Number(f.monto_bs) : null, dias_aviso: Number(f.dias_aviso) || 7,
    });
    setGuardando(false);
    if (error) setError("No se pudo guardar. Revisa los datos e intenta de nuevo.");
    else onSaved();
  }

  const campo = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Agregar vencimiento</h3>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm">Cliente
            <select className={campo} value={f.cliente_id} onChange={set("cliente_id")}>
              <option value="">Elegir…</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm">Tipo
            <select className={campo} value={f.tipo} onChange={set("tipo")}>
              <option value="plan">Plan</option><option value="dominio">Dominio</option>
              <option value="hosting">Hosting</option><option value="otro">Otro</option>
            </select>
          </label>
          {esDominio ? (
            <label className="text-sm">Dominio<input className={campo} placeholder="minegocio.com" value={f.dominio} onChange={set("dominio")} /></label>
          ) : (
            <label className="text-sm">Servicio<input className={campo} placeholder="E-commerce, Plan Negocio" value={f.servicio} onChange={set("servicio")} /></label>
          )}
          {esDominio && (
            <label className="col-span-2 text-sm">Dónde se compró<input className={campo} placeholder="Namecheap" value={f.proveedor} onChange={set("proveedor")} /></label>
          )}
          <label className="text-sm">{esDominio ? "Fecha de registro" : "Fecha de inicio"}
            <input type="date" className={campo} value={f.fecha_inicio} onChange={set("fecha_inicio")} /></label>
          <label className="text-sm">Renovación
            <select className={campo} value={f.periodo} onChange={set("periodo")}>
              <option value="mensual">Mensual</option><option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option><option value="anual">Anual</option><option value="unico">Pago único</option>
            </select>
          </label>
          <label className="text-sm">Monto (Bs)<input type="number" min="0" className={campo} value={f.monto_bs} onChange={set("monto_bs")} /></label>
          <label className="text-sm">Avisar con (días)<input type="number" min="1" className={campo} value={f.dias_aviso} onChange={set("dias_aviso")} /></label>
        </div>

        {f.periodo !== "unico" && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Próximo vencimiento: <strong>{fmt(vence)}</strong></p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar vencimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

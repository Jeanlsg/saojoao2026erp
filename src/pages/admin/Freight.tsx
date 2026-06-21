import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { FreightRange } from "@/data/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormDialogBar } from "@/components/admin/FormDialogBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Truck, MapPin, AlertTriangle, Save, Check, Loader2 } from "lucide-react";
import { formatCep } from "@/lib/geocoding";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const emptyRange: Omit<FreightRange, "id"> = { minKm: 0, maxKm: 0, price: 0 };

/**
 * Detecta sobreposição entre `candidate` (com possível id antigo) e as
 * demais faixas — id é usado para excluir a própria faixa em edição.
 */
function findOverlap(
  candidate: Omit<FreightRange, "id"> & { id?: string },
  ranges: FreightRange[]
): FreightRange | null {
  for (const r of ranges) {
    if (candidate.id && r.id === candidate.id) continue;
    // Sobreposição: intervalos [a,b] e [c,d] se sobrepõem quando a <= d && c <= b
    const overlaps = candidate.minKm <= r.maxKm && r.minKm <= candidate.maxKm;
    if (overlaps) return r;
  }
  return null;
}

/** Verifica se há gaps entre faixas adjacentes ordenadas por minKm. */
function findGaps(ranges: FreightRange[]): Array<{ from: number; to: number }> {
  const sorted = [...ranges].sort((a, b) => a.minKm - b.minKm);
  const gaps: Array<{ from: number; to: number }> = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].maxKm < sorted[i + 1].minKm) {
      gaps.push({ from: sorted[i].maxKm, to: sorted[i + 1].minKm });
    }
  }
  return gaps;
}

export default function Freight() {
  const { freightRanges, addFreightRange, updateFreightRange, deleteFreightRange, calculateFreight, storeCep, setStoreCep } = useAdmin();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FreightRange | null>(null);
  const [form, setForm] = useState<Omit<FreightRange, "id">>(emptyRange);
  const [testCep, setTestCep] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ distanceKm: number; durationMin: number; address: string; price: number | null } | null>(null);
  const [testError, setTestError] = useState("");

  const handleTestFreight = async () => {
    const clean = testCep.replace(/\D/g, "");
    if (clean.length !== 8) { setTestError("CEP inválido."); return; }
    const cleanStoreCep = storeCep.replace(/\D/g, "");
    if (cleanStoreCep.length < 8) {
      setTestError("CEP da loja não configurado. Salve o CEP da loja acima primeiro.");
      return;
    }
    setTestLoading(true);
    setTestError("");
    setTestResult(null);
    console.log("[TestFreight] storeCep limpo:", cleanStoreCep, "| customerCep:", clean);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-route", {
        body: { storeCep: cleanStoreCep, customerCep: clean },
      });
      if (error) throw error;
      if (data.error) { setTestError(data.error); return; }
      const price = calculateFreight(data.distanceKm);
      setTestResult({ distanceKm: data.distanceKm, durationMin: data.durationMin, address: data.customerAddress, price });
    } catch (e: any) {
      setTestError(e.message || "Erro ao calcular.");
    } finally {
      setTestLoading(false);
    }
  };

  // CEP da loja: estado local — só persiste quando clica em "Salvar"
  const [cepDraft, setCepDraft] = useState(storeCep);
  useEffect(() => { setCepDraft(storeCep); }, [storeCep]);
  const cleanDraft = cepDraft.replace(/\D/g, "");
  const cleanSaved = storeCep.replace(/\D/g, "");
  const cepDirty = cleanDraft !== cleanSaved;
  const cepValid = cleanDraft.length === 8;

  const handleSaveCep = () => {
    if (!cepDirty || !cepValid) return;
    setStoreCep(formatCep(cepDraft));
    toast({ title: "CEP da loja salvo", description: formatCep(cepDraft) });
  };

  const openNew = () => { setEditing(null); setForm(emptyRange); setDialogOpen(true); };
  const openEdit = (r: FreightRange) => { setEditing(r); setForm({ minKm: r.minKm, maxKm: r.maxKm, price: r.price }); setDialogOpen(true); };

  // ---- Validação do formulário ----
  const formError = useMemo<string | null>(() => {
    if (form.maxKm <= form.minKm) return "A distância 'Até' precisa ser maior que 'De'.";
    if (form.minKm < 0 || form.price < 0) return "Use apenas valores positivos.";
    const overlap = findOverlap(
      { ...form, id: editing?.id },
      freightRanges
    );
    if (overlap) {
      return `Sobrepõe a faixa ${overlap.minKm}–${overlap.maxKm} km (R$ ${overlap.price.toFixed(2).replace(".", ",")}). Ajuste os limites.`;
    }
    return null;
  }, [form, editing, freightRanges]);

  const handleSave = () => {
    if (formError) return;
    if (editing) {
      updateFreightRange({ ...editing, ...form });
    } else {
      addFreightRange({ ...form, id: `fr${Date.now()}` });
    }
    setDialogOpen(false);
  };

  const sorted = [...freightRanges].sort((a, b) => a.minKm - b.minKm);
  const gaps = findGaps(freightRanges);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="hidden sm:inline">Faixas de Frete</span>
          <span className="sm:hidden">Frete</span>
        </h2>
        <Button onClick={openNew} size="sm" className="sm:size-default">
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Nova Faixa</span>
        </Button>
      </div>

      <div className="rounded-lg border border-border p-4 bg-card space-y-2">
        <Label className="text-sm font-medium flex items-center gap-1"><MapPin className="h-4 w-4" /> CEP da Loja</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="00000-000"
            value={cepDraft}
            onChange={(e) => setCepDraft(formatCep(e.target.value))}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveCep(); }}
            className="max-w-xs"
            maxLength={9}
          />
          <Button
            onClick={handleSaveCep}
            disabled={!cepDirty || !cepValid}
            size="sm"
            className="gap-1.5"
          >
            {cepDirty ? <><Save className="h-4 w-4" /> Salvar</> : <><Check className="h-4 w-4" /> Salvo</>}
          </Button>
          <span className="text-xs text-muted-foreground">
            Usado para calcular a distância até o cliente
            {cepDirty && cepValid && <span className="ml-1 text-amber-500">• alteração não salva</span>}
            {cepDirty && !cepValid && cleanDraft.length > 0 && <span className="ml-1 text-destructive">• CEP precisa ter 8 dígitos</span>}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 bg-card space-y-3">
        <Label className="text-sm font-medium">Testar cálculo de frete por CEP</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="CEP do cliente (00000-000)"
            value={testCep}
            onChange={(e) => { setTestCep(formatCep(e.target.value)); setTestResult(null); setTestError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleTestFreight(); }}
            className="max-w-xs"
            maxLength={9}
          />
          <Button
            onClick={handleTestFreight}
            disabled={testLoading || testCep.replace(/\D/g, "").length < 8}
            size="sm"
            className="gap-1.5"
          >
            {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            {testLoading ? "Calculando..." : "Calcular"}
          </Button>
        </div>
        {testError && <p className="text-xs text-destructive">{testError}</p>}
        {testResult && (
          <div className="rounded-md border border-border bg-background p-3 space-y-1 text-sm">
            <p className="text-muted-foreground truncate"><MapPin className="inline h-3.5 w-3.5 mr-1" />{testResult.address}</p>
            <p>Distância: <strong>~{testResult.distanceKm} km</strong> · Tempo estimado: <strong>~{testResult.durationMin} min</strong></p>
            {testResult.price !== null ? (
              <p>Frete: <strong className="text-primary text-base">R$ {testResult.price.toFixed(2).replace(".", ",")}</strong></p>
            ) : (
              <p className="text-destructive font-medium">Fora da área de cobertura ({testResult.distanceKm} km — sem faixa cadastrada)</p>
            )}
          </div>
        )}
      </div>

      {gaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-amber-500 mb-0.5">
              {gaps.length === 1 ? "Há um intervalo descoberto" : "Há intervalos descobertos"} entre as faixas:
            </p>
            <ul className="space-y-0.5 text-foreground/90">
              {gaps.map((g, i) => (
                <li key={i}>
                  • <strong>{g.from} km</strong> a <strong>{g.to} km</strong> — clientes nesse intervalo recebem "fora da área".
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* MOBILE: cards compactos */}
      <div className="space-y-2 sm:hidden">
        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma faixa cadastrada</p>
        ) : (
          sorted.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-foreground">{r.minKm}</span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-sm font-bold text-foreground">{r.maxKm} km</span>
                </div>
                <p className="text-base font-extrabold text-primary mt-0.5">
                  R$ {r.price.toFixed(2).replace(".", ",")}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteFreightRange(r.id)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP: tabela */}
      <div className="rounded-lg border border-border overflow-hidden hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>De (km)</TableHead>
              <TableHead>Até (km)</TableHead>
              <TableHead>Preço do Frete</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.minKm} km</TableCell>
                <TableCell className="font-medium">{r.maxKm} km</TableCell>
                <TableCell className="font-bold text-primary">R$ {r.price.toFixed(2).replace(".", ",")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteFreightRange(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <FormDialogBar
            title={editing ? "Editar Faixa" : "Nova Faixa de Frete"}
            onCancel={() => setDialogOpen(false)}
            onSubmit={handleSave}
            submitLabel={editing ? "Salvar" : "Criar"}
            submitDisabled={!!formError}
          />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>De (km)</Label>
                <Input type="number" step="0.1" min="0" value={form.minKm} onChange={(e) => setForm({ ...form, minKm: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Até (km)</Label>
                <Input type="number" step="0.1" min="0" value={form.maxKm} onChange={(e) => setForm({ ...form, maxKm: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Preço do Frete (R$)</Label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            </div>
            {formError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{formError}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

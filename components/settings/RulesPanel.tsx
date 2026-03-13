'use client';

import { useState } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { ScheduleRule, RuleType } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

const PARAM_LABELS: Record<string, string> = {
  hours: 'Valandos',
  days: 'Dienos',
  threshold: 'Slenkstis',
  maxShifts: 'Max budėjimų',
};

function RuleCard({ rule }: { rule: ScheduleRule }) {
  const { updateRule, removeRule } = useScheduleStore();
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [paramValue, setParamValue] = useState('');

  const paramEntries = Object.entries(rule.params);

  const startEditParam = (key: string, value: number | string | boolean) => {
    setEditingParam(key);
    setParamValue(String(value));
  };

  const saveParam = (key: string) => {
    const num = parseFloat(paramValue);
    if (!isNaN(num)) {
      updateRule(rule.id, { params: { ...rule.params, [key]: num } });
    }
    setEditingParam(null);
  };

  return (
    <div className={`border rounded-lg p-4 transition-all ${rule.enabled ? 'bg-white' : 'bg-gray-50 opacity-70'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-gray-900 truncate">{rule.name}</h4>
            <Badge
              variant={rule.severity === 'error' ? 'destructive' : 'secondary'}
              className="shrink-0 text-[10px] px-1.5 py-0"
            >
              {rule.severity === 'error' ? 'Klaida' : 'Perspėjimas'}
            </Badge>
            {rule.builtIn && (
              <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                Sisteminė
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>
        </div>
        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked: boolean) => updateRule(rule.id, { enabled: checked })}
        />
      </div>

      {/* Parameters */}
      {paramEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap gap-3">
            {paramEntries.map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {PARAM_LABELS[key] || key}:
                </span>
                {editingParam === key ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={paramValue}
                      onChange={(e) => setParamValue(e.target.value)}
                      className="h-6 w-16 text-xs px-1.5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveParam(key);
                        if (e.key === 'Escape') setEditingParam(null);
                      }}
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5 text-xs"
                      onClick={() => saveParam(key)}
                    >
                      OK
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditParam(key, value)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    disabled={!rule.enabled}
                  >
                    {String(value)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Severity toggle + delete for custom rules */}
      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Tipas:</span>
          <select
            value={rule.severity}
            onChange={(e) => updateRule(rule.id, { severity: e.target.value as 'error' | 'warning' })}
            className="text-xs border rounded px-1.5 py-0.5 bg-white"
          >
            <option value="error">Klaida (blokuoja)</option>
            <option value="warning">Perspėjimas</option>
          </select>
        </div>
        {!rule.builtIn && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => removeRule(rule.id)}
          >
            Pašalinti
          </Button>
        )}
      </div>
    </div>
  );
}

function AddRuleDialog() {
  const { addRule } = useScheduleStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    const text = input.trim();
    if (!text || analyzing) return;

    setAnalyzing(true);
    setError('');

    try {
      const res = await fetch('/api/rules/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: text, description: text }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rule: ScheduleRule = {
        id: `custom_${Date.now()}`,
        name: data.refinedName || text,
        description: data.refinedDescription || text,
        type: data.type as RuleType,
        enabled: true,
        severity: data.severity || 'warning',
        params: data.params || {},
        builtIn: false,
      };

      addRule(rule);
      setInput('');
      setOpen(false);
    } catch {
      setError('Nepavyko analizuoti taisyklės. Bandykite dar kartą.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(''); setAnalyzing(false); } }}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="text-xs" />
      }>
        + Nauja taisyklė
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nauja taisyklė</DialogTitle>
          <DialogDescription>
            Aprašykite taisyklę savo žodžiais — sistema automatiškai ją klasifikuos ir pritaikys
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Aprašykite taisyklę</Label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pvz.: Ne daugiau 3 savaitgalio budėjimų per mėnesį"
              className="mt-1"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              disabled={analyzing}
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Rašykite lietuviškai, pvz.: „Gydytojas negali budėti daugiau nei 2 savaitgalius", „Poilsis tarp budėjimų bent 3 dienos"
            </p>
          </div>
          {analyzing && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-blue-700">Analizuojama ir klasifikuojama...</span>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={analyzing}>
            Atšaukti
          </Button>
          <Button onClick={handleAdd} disabled={!input.trim() || analyzing}>
            {analyzing ? 'Analizuojama...' : 'Išsaugoti'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RulesPanel() {
  const { rules } = useScheduleStore();

  const builtInRules = rules.filter(r => r.builtIn);
  const customRules = rules.filter(r => !r.builtIn);
  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Grafiko taisyklės</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledCount} iš {rules.length} aktyvios
          </p>
        </div>
        <AddRuleDialog />
      </div>

      {/* Built-in rules */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Sisteminės taisyklės
        </h4>
        <div className="space-y-2">
          {builtInRules.map(rule => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      </div>

      {/* Custom rules */}
      {customRules.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Jūsų taisyklės
          </h4>
          <div className="space-y-2">
            {customRules.map(rule => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        </div>
      )}

      {customRules.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg">
          Galite pridėti savo taisykles arba paprašyti Laimos per chat
        </div>
      )}
    </div>
  );
}

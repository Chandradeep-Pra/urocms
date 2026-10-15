"use client";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DescriptionBulletsEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const items = value.split(/\r?\n/).map(item => item.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, ""));
  function update(index: number, text: string) { onChange(items.map((item, i) => i === index ? text : item).join("\n")); }
  return <fieldset className="space-y-3"><legend className="text-sm font-medium">Description bullet points</legend><p className="text-xs text-muted-foreground">Each point appears on the test card in Testing Zone.</p>
    {items.map((item, index) => <div key={index} className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><Input aria-label={`Description point ${index + 1}`} value={item} onChange={event => update(index, event.target.value)} placeholder={`Point ${index + 1}`} /><Button type="button" variant="ghost" size="icon" aria-label={`Remove point ${index + 1}`} onClick={() => onChange(items.filter((_, i) => i !== index).join("\n"))}><X size={16} /></Button></div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""].join("\n"))}><Plus size={15} />Add point</Button>
  </fieldset>;
}

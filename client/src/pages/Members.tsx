import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, UserRound, UserX } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function Members() {
  const memberships = trpc.classes.mine.useQuery();
  const membership = memberships.data?.[0];
  const classId = membership?.member.classId;
  const members = trpc.classes.members.useQuery({ classId: classId ?? 0 }, { enabled: Boolean(classId && membership?.member.role === "admin") });
  const setStatus = trpc.classes.setMemberStatus.useMutation({ onSuccess: () => { toast.success("Status atualizado."); members.refetch(); }, onError: error => toast.error(error.message) });
  const [busyId, setBusyId] = useState<number | null>(null);

  return <DashboardLayout><main className="min-h-screen bg-[#f4f1ea] -m-4 p-4 sm:p-8"><div className="mx-auto max-w-5xl space-y-8"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">8º B · Administração</p><h1 className="mt-2 font-serif text-4xl font-semibold text-slate-950">Membros do 8º B</h1><p className="mt-3 text-slate-500">Controle quem pode consultar e editar as lições do caderno da sala.</p></header>{membership?.member.role !== "admin" ? <Card><CardContent className="p-8 text-center text-slate-500">Somente administradores podem gerenciar membros.</CardContent></Card> : <Card className="border border-[#d8d2c8] shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">{membership.class.name}</CardTitle></CardHeader><CardContent className="space-y-3">{members.isLoading ? <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div> : members.data?.map(row => <div key={row.member.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#efe5d3] p-2 text-[#8a4b2a]">{row.member.role === "admin" ? <ShieldCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</div><div><p className="font-semibold text-slate-800">{row.user.name || "Usuário sem nome"}</p><p className="text-sm text-slate-500">{row.user.email || "Conta autenticada"}</p></div></div><div className="flex items-center gap-3"><Badge className={row.member.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-200 text-slate-600 hover:bg-slate-200"}>{row.member.status === "active" ? "Ativo" : "Inativo"}</Badge>{row.member.role !== "admin" && <Button size="sm" variant="outline" disabled={busyId === row.user.id} onClick={() => { setBusyId(row.user.id); setStatus.mutate({ classId: classId!, userId: row.user.id, status: row.member.status === "active" ? "inactive" : "active" }); }}><UserX className="mr-2 h-4 w-4" />{row.member.status === "active" ? "Desativar" : "Reativar"}</Button>}</div></div>)}</CardContent></Card>}</div></main></DashboardLayout>;
}

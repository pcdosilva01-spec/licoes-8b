import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { buildLessonFilter, LESSON_SUBJECTS } from "@shared/lessonFilters";
import { FileText, GraduationCap, Link2, Loader2, Pencil, Plus, ShieldCheck, Trash2, Upload, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const emptyForm = { subject: "", title: "", description: "", lessonDate: new Date().toISOString().slice(0, 10), dueDate: "", teacherName: "" };

type LessonForm = typeof emptyForm;

function daysLeft(expiresAt: Date | string) {
  const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function toDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [classId, setClassId] = useState<number | undefined>();
  const [inviteToken, setInviteToken] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("active");
  const [form, setForm] = useState<LessonForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);

  const memberships = trpc.classes.mine.useQuery(undefined, { enabled: isAuthenticated });
  const currentClass = memberships.data?.find(item => item.member.classId === classId) ?? memberships.data?.[0];
  const activeClassId = classId ?? currentClass?.member.classId;

  useEffect(() => {
    if (!classId && currentClass?.member.classId) setClassId(currentClass.member.classId);
  }, [classId, currentClass?.member.classId]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (token) setInviteToken(token);
  }, []);

  const lessonInput = useMemo(() => ({ classId: activeClassId ?? 0, ...buildLessonFilter(periodFilter as "active" | "week" | "all" | "expired", subjectFilter) }), [activeClassId, subjectFilter, periodFilter]);
  const lessons = trpc.lessons.list.useQuery(lessonInput, { enabled: Boolean(activeClassId) });
  const utils = trpc.useUtils();
  const setName = trpc.auth.setName.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); toast.success("Nome salvo."); }, onError: error => toast.error(error.message) });

  const createClass = trpc.classes.create.useMutation({ onSuccess: () => { toast.success("Espaço do 8º B criado."); memberships.refetch(); }, onError: error => toast.error(error.message) });
  const joinClass = trpc.classes.join.useMutation({ onSuccess: data => { toast.success("Você entrou na turma."); setInviteToken(""); setClassId(data.classId); memberships.refetch(); }, onError: error => toast.error(error.message) });
  const createLesson = trpc.lessons.create.useMutation({ onSuccess: () => { toast.success("Lição registrada."); closeForm(); lessons.refetch(); }, onError: error => toast.error(error.message) });
  const updateLesson = trpc.lessons.update.useMutation({ onSuccess: () => { toast.success("Lição atualizada."); closeForm(); lessons.refetch(); }, onError: error => toast.error(error.message) });
  const removeLesson = trpc.lessons.remove.useMutation({ onSuccess: () => { toast.success("Lição removida."); lessons.refetch(); }, onError: error => toast.error(error.message) });
  const rotateInvite = trpc.classes.rotateInvite.useMutation({ onSuccess: data => { setInviteUrl(`${window.location.origin}${data.invitePath}`); toast.success("Novo convite gerado."); }, onError: error => toast.error(error.message) });
  const uploadPdf = trpc.lessons.uploadPdf.useMutation({ onSuccess: () => { toast.success("PDF anexado."); lessons.refetch(); }, onError: error => toast.error(error.message) });

  function closeForm() { setForm({ ...emptyForm }); setEditingId(null); setShowForm(false); }
  function openEdit(lesson: any) {
    setEditingId(lesson.id);
    setForm({ subject: lesson.subject, title: lesson.title, description: lesson.description ?? "", lessonDate: new Date(lesson.lessonDate).toISOString().slice(0, 10), dueDate: lesson.dueDate ? new Date(lesson.dueDate).toISOString().slice(0, 10) : "", teacherName: lesson.teacherName ?? "" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function submitLesson(event: React.FormEvent) {
    event.preventDefault();
    if (!activeClassId) return;
    const payload = { classId: activeClassId, subject: form.subject, title: form.title, description: form.description || null, lessonDate: toDate(form.lessonDate), dueDate: form.dueDate ? toDate(form.dueDate) : null, teacherName: form.teacherName || null };
    if (editingId) updateLesson.mutate({ ...payload, id: editingId }); else createLesson.mutate(payload);
  }
  function upload(event: React.ChangeEvent<HTMLInputElement>, lessonId: number) {
    const file = event.target.files?.[0];
    if (!file || !activeClassId) return;
    if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) { toast.error("Escolha um PDF de até 10 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      uploadPdf.mutate({ classId: activeClassId, lessonId, fileName: file.name, mimeType: file.type, base64: result.split(",")[1] ?? "" });
    };
    reader.readAsDataURL(file);
  }

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#f4f1ea]"><Loader2 className="animate-spin text-indigo-600" /></div>;
  if (!isAuthenticated || !user) return <Landing />;
  if (!user.name?.trim()) return <NameGate onSubmit={name => setName.mutate({ name })} pending={setName.isPending} />;

  return <DashboardLayout>
    <main className="min-h-screen bg-[#f4f1ea] -m-4 p-4 sm:p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-b-2 border-[#9e6341] bg-transparent px-0 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b2a]"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Caderno do 8º B</div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">O caderno do 8º B.</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">Registre o que foi passado, encontre o que precisa e acompanhe o tempo restante antes que cada lição expire.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {activeClassId && currentClass?.member.role === "admin" && <Button variant="outline" className="rounded-xl border-slate-200 bg-white" onClick={() => rotateInvite.mutate({ classId: activeClassId, expiresInDays: 30 })}><Link2 className="mr-2 h-4 w-4" /> Gerar convite</Button>}
            {activeClassId && <Button className="rounded-xl bg-[#16324f] !text-[#fffdf8] shadow-none hover:bg-[#0f253c]" onClick={() => { setEditingId(null); setForm({ ...emptyForm }); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" /> Nova lição</Button>}
          </div>
        </header>

        {inviteUrl && <Card className="border-indigo-100 bg-indigo-50/70 shadow-none"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-indigo-950">Convite privado pronto</p><p className="text-sm text-indigo-700">Compartilhe este link somente com a turma.</p></div><button className="max-w-full truncate rounded-lg bg-white px-3 py-2 text-left text-xs text-indigo-700 ring-1 ring-indigo-100" onClick={() => navigator.clipboard.writeText(inviteUrl)}>{inviteUrl}</button></CardContent></Card>}

        {inviteToken && <Card className="border-amber-200 bg-amber-50/80 shadow-none"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-amber-950">Você recebeu um convite</p><p className="text-sm text-amber-800">Entre na turma privada para consultar e editar as lições.</p></div><Button className="rounded-xl bg-amber-600 hover:bg-amber-700" onClick={() => joinClass.mutate({ token: inviteToken })}>Entrar na turma</Button></CardContent></Card>}

        {!activeClassId ? <Card className="border border-[#d8d2c8] bg-[#fffdf8] shadow-none"><CardContent className="grid gap-8 p-7 md:grid-cols-[1.2fr_1fr] md:p-10"><div><Badge className="bg-[#efe5d3] text-[#8a4b2a] hover:bg-[#efe5d3]">Espaço exclusivo</Badge><h2 className="mt-4 font-serif text-3xl font-semibold">Caderno do 8º B.</h2><p className="mt-3 max-w-md leading-7 text-slate-500">Este espaço é reservado exclusivamente para as lições da turma 8º B.</p></div><div className="flex items-end"><Button onClick={() => createClass.mutate({})} style={{ color: "#fffdf8" }} className="h-12 w-full rounded-lg bg-[#16324f] hover:bg-[#0f253c]">Abrir espaço do 8º B</Button></div></CardContent></Card> : <>
          <section className="grid gap-4 sm:grid-cols-3"><Stat label="Lições ativas" value={lessons.data?.length ?? 0} icon={<FileText className="h-5 w-5" />} tone="indigo" /><Stat label="Turma" value={currentClass?.class.name ?? "—"} icon={<GraduationCap className="h-5 w-5" />} tone="violet" /><Stat label="Acesso" value={currentClass?.member.role === "admin" ? "Administrador" : "Membro"} icon={<ShieldCheck className="h-5 w-5" />} tone="emerald" /></section>
          {showForm && <Card className="border-0 bg-white shadow-xl shadow-slate-200/60"><CardHeader className="border-b border-slate-100"><div className="flex items-center justify-between"><div><CardTitle className="font-serif text-2xl">{editingId ? "Editar lição" : "Registrar nova lição"}</CardTitle><p className="mt-1 text-sm text-slate-500">Ela ficará disponível por 10 dias a partir da data da aula.</p></div><Button variant="ghost" onClick={closeForm}>Fechar</Button></div></CardHeader><CardContent><form className="grid gap-5 pt-2 md:grid-cols-2" onSubmit={submitLesson}><div><Label htmlFor="lesson-subject">Matéria</Label><Select value={form.subject} onValueChange={value => setForm({ ...form, subject: value })} required><SelectTrigger id="lesson-subject" className="mt-2 h-11 rounded-xl"><SelectValue placeholder="Escolha uma matéria" /></SelectTrigger><SelectContent>{LESSON_SUBJECTS.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent></Select></div><Field label="Título" value={form.title} onChange={value => setForm({ ...form, title: value })} placeholder="Ex.: Exercícios da página 42" required /><Field label="Data da aula" type="date" value={form.lessonDate} onChange={value => setForm({ ...form, lessonDate: value })} required /><Field label="Prazo (opcional)" type="date" value={form.dueDate} onChange={value => setForm({ ...form, dueDate: value })} /><Field label="Professor (opcional)" value={form.teacherName} onChange={value => setForm({ ...form, teacherName: value })} placeholder="Nome do professor" /><div className="md:col-span-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Anote os detalhes importantes da lição..." className="mt-2 min-h-28 rounded-xl" /></div><div className="flex justify-end gap-3 md:col-span-2"><Button type="button" variant="outline" className="rounded-xl" onClick={closeForm}>Cancelar</Button><Button type="submit" className="rounded-xl bg-indigo-600 hover:bg-indigo-700" disabled={createLesson.isPending || updateLesson.isPending}>{(createLesson.isPending || updateLesson.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Salvar alterações" : "Registrar lição"}</Button></div></form></CardContent></Card>}
          <section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Select value={subjectFilter} onValueChange={setSubjectFilter}><SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white"><SelectValue placeholder="Escolha uma matéria" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as matérias</SelectItem>{LESSON_SUBJECTS.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent></Select><Select value={periodFilter} onValueChange={setPeriodFilter}><SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white"><SelectValue placeholder="Escolha o período" /></SelectTrigger><SelectContent><SelectItem value="active">Lições ativas</SelectItem><SelectItem value="week">Última semana</SelectItem><SelectItem value="all">Todas as lições</SelectItem><SelectItem value="expired">Lições expiradas</SelectItem></SelectContent></Select></div>{lessons.isLoading ? <div className="grid place-items-center rounded-2xl bg-white py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div> : lessons.data?.length ? <div className="grid gap-4 lg:grid-cols-2">{lessons.data.map(lesson => <LessonCard key={lesson.id} lesson={lesson} onEdit={() => openEdit(lesson)} onRemove={() => { if (confirm("Excluir esta lição?")) removeLesson.mutate({ classId: activeClassId!, id: lesson.id }); }} onUpload={event => upload(event, lesson.id)} onSelect={() => setSelectedLesson(selectedLesson === lesson.id ? null : lesson.id)} selected={selectedLesson === lesson.id} classId={activeClassId!} />)}</div> : <Card className="border-dashed border-slate-300 bg-white/60 shadow-none"><CardContent className="py-16 text-center"><FileText className="mx-auto h-10 w-10 text-slate-300" /><h3 className="mt-4 font-serif text-2xl font-semibold">Nenhuma lição por aqui</h3><p className="mt-2 text-slate-500">Registre a primeira lição da turma para começar.</p><Button className="mt-5 rounded-xl bg-indigo-600" onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Registrar lição</Button></CardContent></Card>}</section>
        </>}
      </div>
    </main>
  </DashboardLayout>;
}

function NameGate({ onSubmit, pending }: { onSubmit: (name: string) => void; pending: boolean }) {
  const [name, setName] = useState("");
  return <div className="min-h-screen bg-[#f4f1ea] px-6 py-10 text-slate-900"><div className="mx-auto grid min-h-[80vh] max-w-xl items-center"><Card className="border border-[#d8d2c8] bg-[#fffdf8] shadow-none"><CardContent className="p-8 sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a4b2a]">Cadastro do 8º B</p><h1 className="mt-3 font-serif text-4xl font-semibold">Como devemos chamar você?</h1><p className="mt-3 leading-7 text-slate-500">Informe seu nome para que os registros da sala identifiquem corretamente quem cadastrou cada lição.</p><form className="mt-8 space-y-4" onSubmit={event => { event.preventDefault(); if (name.trim()) onSubmit(name); }}><Label htmlFor="profile-name">Seu nome completo</Label><Input id="profile-name" autoFocus required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Ana Silva" className="h-12 rounded-lg" /><Button type="submit" disabled={pending} style={{ color: "#fffdf8" }} className="h-12 w-full rounded-lg bg-[#16324f] hover:bg-[#0f253c]">{pending ? "Salvando…" : "Continuar para o 8º B"}</Button></form></CardContent></Card></div></div>;
}

function Landing() { const [accountName, setAccountName] = useState(""); const register = trpc.auth.register.useMutation({ onSuccess: () => window.location.reload(), onError: error => toast.error(error.message) }); return <div className="min-h-screen bg-[#f4f1ea] px-6 py-10 text-slate-900"><div className="mx-auto grid min-h-[80vh] max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]"><div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-b-2 border-[#9e6341] bg-transparent px-0 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b2a]"><GraduationCap className="h-4 w-4" /> 8º B · Caderno de lições</div><h1 className="max-w-2xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">A rotina da sala, mais leve.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">Um espaço privado para registrar o que foi passado, compartilhar com a turma e nunca perder uma tarefa importante.</p><form className="mt-8 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={event => { event.preventDefault(); if (accountName.trim()) register.mutate({ name: accountName }); }}><Input required minLength={2} maxLength={80} value={accountName} onChange={event => setAccountName(event.target.value)} placeholder="Seu nome completo" className="h-14 rounded-lg bg-[#fffdf8]" /><Button size="lg" type="submit" disabled={register.isPending} style={{ color: "#fffdf8" }} className="h-14 rounded-lg bg-[#16324f] px-7 shadow-none hover:bg-[#0f253c]">{register.isPending ? "Criando…" : "Criar minha conta"}</Button></form><p className="mt-4 text-xs text-slate-400">Conta local do caderno do 8º B. Sem login externo.</p></div><div className="relative"><div className="absolute -inset-6 rounded-[2.5rem] bg-[#e9e3d8]" /><Card className="relative overflow-hidden rounded-lg border-[#d8d2c8] bg-[#fffdf8] shadow-none"><CardContent className="p-7 sm:p-10"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Página de registros</p><h2 className="mt-2 font-serif text-3xl font-semibold">O que foi passado, registrado.</h2></div><div className="rounded-2xl bg-[#efe5d3] p-3 text-[#8a4b2a]"><FileText /></div></div><div className="mt-8 space-y-3"><PreviewRow subject="Matemática" title="Lista de exercícios · Funções" days="9 dias" tone="bg-emerald-100 text-emerald-700" /><PreviewRow subject="História" title="Leitura sobre a República" days="3 dias" tone="bg-amber-100 text-amber-700" /><PreviewRow subject="Biologia" title="Resumo do capítulo 6" days="1 dia" tone="bg-rose-100 text-rose-700" /></div><div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-50 p-4"><Users className="h-5 w-5 text-indigo-600" /><p className="text-sm text-slate-600">Compartilhado somente com quem tem o convite.</p></div></CardContent></Card></div></div></div> }

function PreviewRow({ subject, title, days, tone }: { subject: string; title: string; days: string; tone: string }) { return <div className="flex items-center gap-3 border-b border-[#d8d2c8] p-4"><div className="h-2 w-2 rounded-full bg-indigo-500" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-indigo-600">{subject}</p><p className="truncate text-sm font-medium text-slate-800">{title}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{days}</span></div> }

function Stat({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: string }) { return <Card className="border-0 bg-white shadow-sm shadow-slate-200/60"><CardContent className="flex items-center gap-4 p-5"><div className={`rounded-2xl p-3 ${tone === "indigo" ? "bg-indigo-50 text-indigo-600" : tone === "violet" ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"}`}>{icon}</div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-semibold text-slate-900">{value}</p></div></CardContent></Card> }

function Field({ label, value, onChange, placeholder, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) { return <div><Label>{label}</Label><Input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 rounded-xl" /></div> }

function LessonCard({ lesson, onEdit, onRemove, onUpload, onSelect, selected, classId }: { lesson: any; onEdit: () => void; onRemove: () => void; onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void; onSelect: () => void; selected: boolean; classId: number }) {
  const fileList = trpc.lessons.get.useQuery({ classId, id: lesson.id }, { enabled: selected });
  const download = trpc.lessons.downloadPdf.useQuery({ classId, lessonId: lesson.id, attachmentId: fileList.data?.attachments?.[0]?.id ?? 0 }, { enabled: Boolean(selected && fileList.data?.attachments?.[0]?.id) });
  const remaining = daysLeft(lesson.expiresAt);
  const urgent = remaining <= 2;
  return <Card className="group border-0 bg-white shadow-sm shadow-slate-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70"><CardContent className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{lesson.subject}</span><Badge className={urgent ? "bg-rose-100 text-rose-700 hover:bg-rose-100" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"}>{remaining} {remaining === 1 ? "dia" : "dias"}</Badge></div><h3 className="mt-2 text-xl font-semibold text-slate-950">{lesson.title}</h3></div><div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"><Button variant="ghost" size="icon" aria-label="Editar lição" onClick={onEdit}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Excluir lição" className="text-rose-600 hover:text-rose-700" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button></div></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{lesson.description || "Sem descrição adicional."}</p><p className="mt-3 text-xs font-medium text-slate-400">Registrada por {lesson.authorName || "Aluno da turma"}</p><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500"><div><span className="block font-semibold uppercase tracking-wide text-slate-400">Aula</span><span className="mt-1 block font-medium text-slate-700">{formatDate(lesson.lessonDate)}</span></div><div><span className="block font-semibold uppercase tracking-wide text-slate-400">Prazo</span><span className="mt-1 block font-medium text-slate-700">{formatDate(lesson.dueDate)}</span></div></div><div className="mt-5 flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="rounded-xl border-slate-200" onClick={onSelect}>{selected ? "Ocultar anexos" : "Ver anexos"}</Button><label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Upload className="mr-2 h-3.5 w-3.5" /> PDF<input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onUpload} /></label></div>{selected && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{fileList.isLoading ? "Carregando anexos..." : fileList.data?.attachments?.length ? <div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2 truncate text-slate-700"><FileText className="h-4 w-4 shrink-0 text-indigo-600" />{fileList.data.attachments[0].originalName}</span>{download.data?.url ? <a className="font-semibold text-indigo-600 hover:underline" href={download.data.url} target="_blank" rel="noreferrer">Baixar</a> : <span className="text-xs text-slate-400">Gerando link...</span>}</div> : <span className="text-slate-500">Nenhum PDF anexado.</span>}</div>}</CardContent></Card>;
}

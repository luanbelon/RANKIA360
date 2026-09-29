import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, LoaderCircle, LockKeyhole, LogOut, Mail, MessageCircle, RefreshCw, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { trpc } from "@/lib/trpc";

type Tab = "leads" | "audits";
type LeadFilter = "all" | "submitted" | "incomplete" | "consultation";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const formatDate = (value: string) => (value ? dateFormat.format(new Date(value)) : "—");
const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString();
const digits = (value: string) => value.replace(/\D/g, "");

function whatsappLink(phone: string) {
  const number = digits(phone);
  if (number.length < 10) return null;
  return `https://wa.me/${number.length <= 11 ? `55${number}` : number}`;
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const body = [header, ...rows].map(row => row.map(escape).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Login({ configured, onDone }: { configured: boolean; onDone: () => void }) {
  const login = trpc.admin.login.useMutation({ onSuccess: onDone });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    login.mutate({ user: String(data.get("user") ?? ""), password: String(data.get("password") ?? "") });
  }

  return (
    <main className="admin-login">
      <form className="admin-login__card" onSubmit={submit}>
        <BrandMark />
        <h1>Painel de contatos</h1>
        <p>Entre para ver os sites analisados e os formulários preenchidos.</p>
        {!configured && (
          <p className="form-error" role="alert">Defina ADMIN_USER e ADMIN_PASSWORD nas variáveis de ambiente do servidor para liberar o acesso.</p>
        )}
        <label className="lead-field"><span className="lead-field__label">Usuário</span><input name="user" autoComplete="username" required maxLength={100} /></label>
        <label className="lead-field"><span className="lead-field__label">Senha</span><input name="password" type="password" autoComplete="current-password" required maxLength={200} /></label>
        {login.error && <p className="form-error" role="alert">{login.error.message}</p>}
        <button className="button button--primary" type="submit" disabled={login.isPending || !configured}>
          {login.isPending ? <LoaderCircle size={17} className="spin" /> : <LockKeyhole size={16} />}
          {login.isPending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const data = trpc.admin.data.useQuery(undefined, { refetchInterval: 60_000 });
  const logout = trpc.admin.logout.useMutation({ onSuccess: onLogout });
  const reportStatus = trpc.admin.reportStatus.useQuery();
  const sendReport = trpc.admin.sendReportNow.useMutation({
    onSuccess: () => toast.success("Relatório enviado para o seu WhatsApp."),
    onError: error => toast.error(error.message),
  });
  const [tab, setTab] = useState<Tab>("leads");
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [query, setQuery] = useState("");

  const leads = data.data?.leads ?? [];
  const audits = data.data?.audits ?? [];
  const term = query.trim().toLowerCase();

  const stats = useMemo(() => {
    const submitted = leads.filter(item => item.submitted).length;
    return {
      audits: audits.length,
      auditsToday: audits.filter(item => isToday(item.createdAt)).length,
      domains: new Set(audits.map(item => item.domain)).size,
      leads: leads.length,
      submitted,
      incomplete: leads.length - submitted,
      consultation: leads.filter(item => item.wantsConsultation).length,
    };
  }, [leads, audits]);

  const visibleLeads = leads.filter(item => {
    if (filter === "submitted" && !item.submitted) return false;
    if (filter === "incomplete" && item.submitted) return false;
    if (filter === "consultation" && !item.wantsConsultation) return false;
    if (!term) return true;
    return [item.name, item.company, item.email, item.whatsapp, item.domain].some(value => value.toLowerCase().includes(term));
  });

  const visibleAudits = audits.filter(item => !term || item.domain.toLowerCase().includes(term));

  function exportCurrent() {
    const stamp = new Date().toISOString().slice(0, 10);
    if (tab === "leads") {
      downloadCsv(`rankia360-formularios-${stamp}.csv`,
        ["Atualizado em", "Situação", "Nome", "Empresa", "E-mail", "WhatsApp", "Quer conversar", "Site"],
        visibleLeads.map(item => [formatDate(item.updatedAt), item.submitted ? "Enviado" : "Não enviado", item.name, item.company, item.email, item.whatsapp, item.wantsConsultation ? "Sim" : "Não", item.domain]));
    } else {
      downloadCsv(`rankia360-sites-${stamp}.csv`,
        ["Data", "Site", "Resultado", "Nota", "Erro", "Visitante"],
        visibleAudits.map(item => [formatDate(item.createdAt), item.domain, item.status === "ok" ? "Analisado" : "Falhou", item.score ?? "", item.errorMessage ?? "", item.visitor]));
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <BrandMark />
        <div className="admin-header__actions">
          <button className="admin-button" type="button" onClick={() => data.refetch()} disabled={data.isFetching}>
            <RefreshCw size={15} className={data.isFetching ? "spin" : undefined} /> Atualizar
          </button>
          {reportStatus.data?.configured && (
            <button className="admin-button" type="button" onClick={() => sendReport.mutate()} disabled={sendReport.isPending}>
              <Send size={15} /> {sendReport.isPending ? "Enviando..." : "Enviar resumo"}
            </button>
          )}
          <button className="admin-button" type="button" onClick={() => logout.mutate()}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </header>

      <section className="admin-stats" aria-label="Resumo">
        <article><span>Sites analisados</span><strong>{stats.audits}</strong><small>{stats.auditsToday} hoje · {stats.domains} sites diferentes</small></article>
        <article><span>Formulários iniciados</span><strong>{stats.leads}</strong><small>pessoas que começaram a preencher</small></article>
        <article className="admin-stats__good"><span>Enviados</span><strong>{stats.submitted}</strong><small>{stats.leads ? Math.round((stats.submitted / stats.leads) * 100) : 0}% dos iniciados</small></article>
        <article className="admin-stats__warn"><span>Não enviados</span><strong>{stats.incomplete}</strong><small>desistiram no meio: vale contatar</small></article>
        <article><span>Querem conversar</span><strong>{stats.consultation}</strong><small>marcaram a conversa com especialista</small></article>
      </section>

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "leads"} className={tab === "leads" ? "is-active" : ""} onClick={() => setTab("leads")}>Formulários ({leads.length})</button>
            <button role="tab" aria-selected={tab === "audits"} className={tab === "audits" ? "is-active" : ""} onClick={() => setTab("audits")}>Sites testados ({audits.length})</button>
          </div>
          <div className="admin-toolbar__right">
            {tab === "leads" && (
              <select className="admin-select" value={filter} onChange={event => setFilter(event.target.value as LeadFilter)} aria-label="Filtrar formulários">
                <option value="all">Todos</option>
                <option value="submitted">Enviados</option>
                <option value="incomplete">Não enviados</option>
                <option value="consultation">Querem conversar</option>
              </select>
            )}
            <label className="admin-search">
              <Search size={15} />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder={tab === "leads" ? "Buscar nome, e-mail, site..." : "Buscar site..."} aria-label="Buscar" />
            </label>
            <button className="admin-button" type="button" onClick={exportCurrent}><Download size={15} /> Exportar CSV</button>
          </div>
        </div>

        {data.isLoading && <p className="admin-empty"><LoaderCircle size={18} className="spin" /> Carregando dados...</p>}
        {data.error && <p className="form-error" role="alert">{data.error.message}</p>}
        {data.data?.source === "local" && (
          <p className="admin-note">Nenhum banco conectado: estes dados estão só num arquivo no servidor e podem sumir num novo deploy. Configure SUPABASE_URL e SUPABASE_API_KEY.</p>
        )}

        {tab === "leads" && data.data && (
          visibleLeads.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Situação</th><th>Contato</th><th>Empresa</th><th>Site analisado</th><th>Conversa</th><th>Atualizado</th></tr></thead>
                <tbody>
                  {visibleLeads.map(item => {
                    const whatsapp = whatsappLink(item.whatsapp);
                    return (
                      <tr key={item.id}>
                        <td><span className={`admin-badge ${item.submitted ? "admin-badge--good" : "admin-badge--warn"}`}>{item.submitted ? "Enviado" : "Não enviado"}</span></td>
                        <td>
                          <strong>{item.name || "Sem nome"}</strong>
                          <div className="admin-contact">
                            {item.email && <a href={`mailto:${item.email}`}><Mail size={13} /> {item.email}</a>}
                            {item.whatsapp && (whatsapp
                              ? <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={13} /> {item.whatsapp}</a>
                              : <span>{item.whatsapp}</span>)}
                          </div>
                        </td>
                        <td>{item.company || "—"}</td>
                        <td><a href={`https://${item.domain}`} target="_blank" rel="noreferrer">{item.domain}</a></td>
                        <td>{item.wantsConsultation ? "Sim" : "—"}</td>
                        <td>{formatDate(item.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="admin-empty">Nenhum formulário encontrado.</p>
        )}

        {tab === "audits" && data.data && (
          visibleAudits.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Data</th><th>Site</th><th>Resultado</th><th>Nota</th><th>Visitante</th></tr></thead>
                <tbody>
                  {visibleAudits.map(item => (
                    <tr key={item.id}>
                      <td>{formatDate(item.createdAt)}</td>
                      <td><a href={`https://${item.domain}`} target="_blank" rel="noreferrer">{item.domain}</a></td>
                      <td>
                        {item.status === "ok"
                          ? <span className="admin-badge admin-badge--good">Analisado</span>
                          : <span className="admin-badge admin-badge--bad" title={item.errorMessage ?? ""}>Falhou</span>}
                        {item.errorMessage && <small className="admin-error-text">{item.errorMessage}</small>}
                      </td>
                      <td>{item.score ?? "—"}</td>
                      <td><code>{item.visitor}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="admin-empty">Nenhum site encontrado.</p>
        )}
      </section>
    </main>
  );
}

export default function Admin() {
  const session = trpc.admin.session.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = "Painel | RankIA 360";
    return () => { meta.remove(); document.title = previousTitle; };
  }, []);

  const refresh = () => { void utils.admin.invalidate(); };

  if (session.isLoading) return <main className="admin-login"><LoaderCircle size={22} className="spin" /></main>;
  if (!session.data?.authenticated) return <Login configured={session.data?.configured ?? false} onDone={refresh} />;
  return <Dashboard onLogout={refresh} />;
}

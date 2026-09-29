import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Ban, Globe2, ShieldCheck, UserCheck } from "lucide-react";
import { brand } from "@shared/brand";
import { Header } from "@/sections/Header";
import { Footer } from "@/sections/Footer";

const UPDATED_AT = "29 de setembro de 2026";

const summary = [
  { icon: Globe2, text: "Para analisar um site, usamos só o endereço dele e as informações que já são públicas." },
  { icon: UserCheck, text: "Seus dados de contato servem apenas para falarmos com você sobre o relatório." },
  { icon: Ban, text: "Não vendemos seus dados e não usamos cookies de publicidade ou rastreamento." },
  { icon: ShieldCheck, text: "Você pode pedir para ver, corrigir ou apagar seus dados quando quiser." },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function Privacidade() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Política de Privacidade | ${brand.name}`;
    return () => { document.title = previousTitle; };
  }, []);

  const email = <a href={`mailto:${brand.privacyEmail}`}>{brand.privacyEmail}</a>;

  return (
    <div className="app-shell" style={{ "--brand-accent": brand.accent } as CSSProperties}>
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header />
      <main id="main-content" className="legal-page section-shell">
        <header className="legal-hero">
          <span className="eyebrow"><span className="eyebrow-mark" /> PRIVACIDADE</span>
          <h1>Seus dados, <span>com transparência.</span></h1>
          <p>
            Explicamos aqui, sem juridiquês, quais informações o {brand.name} usa, para quê e como você mantém o
            controle sobre elas, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).
          </p>
          <small>Atualizada em {UPDATED_AT}</small>
        </header>

        <section className="legal-summary" aria-label="Resumo">
          <h2>O resumo</h2>
          <ul>
            {summary.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="legal-summary__icon"><Icon size={18} aria-hidden="true" /></span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="legal-body">
          <Section title="Quem cuida dos seus dados">
            <p>
              O {brand.name} é o responsável (controlador) pelos dados tratados neste site. Para qualquer assunto sobre
              privacidade, fale com a gente pelo e-mail {email}.
            </p>
          </Section>

          <Section title="O que coletamos">
            <h3>Quando você analisa um site</h3>
            <ul>
              <li>O endereço do site informado, a data da análise e o resultado.</li>
              <li>
                Uma versão embaralhada, de forma irreversível, do endereço de internet (IP) de quem fez a análise. Ela não
                permite saber quem você é: serve só para evitar abusos, como alguém disparar centenas de análises seguidas.
              </li>
            </ul>
            <h3>Quando você preenche o formulário do relatório</h3>
            <ul>
              <li>Nome, empresa, e-mail, WhatsApp e se você quer conversar com um especialista.</li>
              <li>
                Salvamos o que você digita enquanto preenche. Assim, se a conexão cair ou você fechar a janela antes de
                enviar, ainda conseguimos retomar o contato sobre o seu relatório. Se preferir que a gente apague, é só
                pedir.
              </li>
            </ul>
            <p>Não pedimos senhas, dados bancários nem documentos, e não acessamos nenhuma área restrita do seu site.</p>
          </Section>

          <Section title="Para que usamos">
            <ul>
              <li>Fazer a análise e mostrar o resultado para você.</li>
              <li>Entrar em contato sobre o relatório e, se você pedir, apresentar nossos serviços.</li>
              <li>Manter o site seguro e funcionando bem.</li>
              <li>Entender, em números gerais, quantas análises e contatos recebemos.</li>
            </ul>
            <p>
              Fazemos isso com base no seu pedido de contato e em etapas que antecedem um possível contrato (art. 7º, V, da
              LGPD) e no nosso legítimo interesse em atender quem nos procura e proteger o serviço (art. 7º, IX), sempre
              dentro do que você esperaria ao usar o site.
            </p>
          </Section>

          <Section title="Com quem compartilhamos">
            <p>Não vendemos nem alugamos seus dados. Contamos apenas com parceiros que fazem o serviço funcionar:</p>
            <ul>
              <li><strong>Hospedagem e banco de dados</strong> (Hostinger e Supabase), onde o site e as informações ficam guardados com segurança.</li>
              <li>
                <strong>Serviços de inteligência artificial</strong>, que recebem só o endereço e as informações públicas do
                site analisado. Seus dados de contato nunca são enviados às IAs.
              </li>
              <li><strong>Ferramentas de mensagem</strong>, usadas para avisar a nossa equipe sobre novos contatos.</li>
            </ul>
            <p>
              Alguns desses parceiros podem armazenar dados em servidores fora do Brasil. Nesses casos, escolhemos empresas
              que adotam padrões de proteção compatíveis com a LGPD.
            </p>
          </Section>

          <Section title="Por quanto tempo guardamos">
            <p>
              Mantemos os dados pelo tempo necessário para atender você: em geral, até 2 anos após o último contato. Depois
              disso, eles são apagados ou ficam anônimos. Se você pedir a exclusão antes, apagamos assim que possível, exceto
              o que a lei nos obrigar a manter.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Não usamos cookies de publicidade nem ferramentas que acompanham você por outros sites. O site só usa o
              armazenamento do navegador para funcionar, como lembrar preferências de exibição.
            </p>
          </Section>

          <Section title="Seus direitos">
            <p>A qualquer momento, você pode pedir para:</p>
            <ul>
              <li>Confirmar se temos dados seus e ver quais são.</li>
              <li>Corrigir dados incompletos ou desatualizados.</li>
              <li>Apagar seus dados ou deixar de receber contato.</li>
              <li>Receber uma cópia dos seus dados.</li>
              <li>Saber com quem os compartilhamos.</li>
            </ul>
            <p>
              É só escrever para {email}. Respondemos em até 15 dias. Se achar que não resolvemos, você também pode procurar
              a Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </Section>

          <Section title="Segurança">
            <p>
              Os dados trafegam de forma criptografada, ficam em servidores protegidos e só a nossa equipe tem acesso, com
              login e senha. Nenhum sistema é 100% imune, mas trabalhamos para reduzir os riscos e, se algo acontecer,
              avisaremos você e as autoridades como a lei determina.
            </p>
          </Section>

          <Section title="Mudanças nesta política">
            <p>
              Se mudarmos algo importante, atualizaremos esta página e a data no topo. Dúvidas? Fale com a gente em {email}.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

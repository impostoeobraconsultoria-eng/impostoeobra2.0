import type { Metadata } from "next";
import {
  FinalCta,
  InstitutionalPage,
} from "@/components/public/institutional-page";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { getSiteConfig } from "@/lib/site-config";
const description =
  "Conheça o Aviso de Privacidade da Imposto & Obra Consultoria e saiba como tratamos e protegemos seus dados pessoais.";
export const metadata: Metadata = {
  title: "Aviso de Privacidade",
  description,
  alternates: { canonical: "/politica/aviso-de-privacidade" },
  openGraph: {
    title: "Aviso de Privacidade | Imposto & Obra Consultoria",
    description,
    url: "/politica/aviso-de-privacidade",
  },
};

export default async function PrivacyPage() {
  const config = await getSiteConfig();
  const email = config.empresa_email_privacidade || config.empresa_email;
  return (
    <InstitutionalPage
      eyebrow="Privacidade · Atualizado em 28 de maio de 2026"
      title="Aviso de Privacidade"
    >
      <p className="lead">
        Este Aviso explica como a <strong>Imposto & Obra Consultoria</strong>{" "}
        coleta, utiliza e protege dados pessoais de clientes e usuários, em
        conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD).
      </p>
      <h2>1. Controlador e Encarregado de Dados (DPO)</h2>
      <p>Os dados são tratados sob a responsabilidade de:</p>
      <ul>
        <li>
          <strong>Controlador:</strong> {config.empresa_razao_social} · CNPJ nº{" "}
          {config.empresa_cnpj}
        </li>
        <li>
          <strong>Sede:</strong> {config.empresa_endereco_completo}
        </li>
        <li>
          <strong>Encarregado:</strong> {config.dpo_nome}
        </li>
        <li>
          <strong>E-mail:</strong> <a href={`mailto:${email}`}>{email}</a>
        </li>
      </ul>
      <h2>2. Dados pessoais coletados</h2>
      <h3>2.1 Na Calculadora de INSS da Obra</h3>
      <ul>
        <li>
          <strong>Dados técnicos:</strong> estado, área, tipo, padrão
          construtivo e custo estimado;
        </li>
        <li>
          <strong>Dados de contato:</strong> nome, e-mail e WhatsApp.
        </li>
      </ul>
      <h3>2.2 Durante o atendimento e contratação</h3>
      <ul>
        <li>Dados cadastrais, como nome, CPF, endereço, e-mail e telefone;</li>
        <li>
          Dados profissionais e da obra, como CNPJ, CEI/CNO, documentos e
          alvarás;
        </li>
        <li>
          Informações necessárias à execução contratual e às obrigações legais.
        </li>
      </ul>
      <h2>3. Finalidades do tratamento</h2>
      <ul>
        <li>Realizar simulações e estimativas de redução tributária;</li>
        <li>Entrar em contato e enviar relatórios e propostas;</li>
        <li>Celebrar e executar contratos;</li>
        <li>Cumprir obrigações legais e fiscais;</li>
        <li>Emitir documentos fiscais e registrar interações.</li>
      </ul>
      <h2>4. Bases legais para o tratamento</h2>
      <p>
        O tratamento fundamenta-se na execução de contrato ou procedimentos
        preliminares (art. 7º, V), cumprimento de obrigação legal (art. 7º, II),
        consentimento (art. 7º, I) e legítimo interesse (art. 7º, IX) da LGPD,
        conforme aplicável.
      </p>
      <h2>5. Compartilhamento de dados</h2>
      <p>
        <strong>
          Não vendemos, alugamos ou comercializamos dados pessoais.
        </strong>{" "}
        O compartilhamento ocorre somente quando necessário, com profissionais
        parceiros sujeitos à confidencialidade, autoridades quando exigido por
        lei e provedores tecnológicos contratados.
      </p>
      <h2>6. Armazenamento e segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger os dados
        contra perda, acesso indevido, destruição ou divulgação não autorizada.
        O acesso interno é restrito a profissionais autorizados.
      </p>
      <h2>7. Retenção e eliminação de dados</h2>
      <p>
        Os dados são mantidos pelo tempo necessário à execução do contrato, ao
        cumprimento de obrigações legais e ao exercício regular de direitos.
        Depois, poderão ser anonimizados ou eliminados com segurança, salvo
        retenção exigida por lei.
      </p>
      <h2>8. Direitos do titular</h2>
      <p>O titular pode solicitar:</p>
      <ul>
        <li>Confirmação e acesso aos dados;</li>
        <li>Correção de dados incompletos ou inexatos;</li>
        <li>Anonimização ou eliminação de dados desnecessários;</li>
        <li>Portabilidade, quando aplicável;</li>
        <li>
          Informações sobre compartilhamento e revogação do consentimento;
        </li>
        <li>Oposição ao tratamento, quando cabível.</li>
      </ul>
      <p>
        Solicitações podem ser enviadas para{" "}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
      <h2>9. Cookies e tecnologias de rastreamento</h2>
      <p>
        O site utiliza cookies essenciais e analíticos. Cookies opcionais de
        marketing poderão avaliar campanhas. Você pode gerenciá-los nas
        configurações do navegador.
      </p>
      <h2>10. Comunicação e marketing</h2>
      <p>
        Podemos enviar comunicações sobre simulações, propostas e legislação
        tributária. O cancelamento pode ser solicitado a qualquer momento pelo
        canal indicado ou pelo e-mail do Encarregado.
      </p>
      <h2>11. Atualizações deste aviso</h2>
      <p>
        Este Aviso poderá ser atualizado quando necessário. A versão mais
        recente e sua data permanecerão disponíveis nesta página.
      </p>
      <h2>12. Foro e legislação aplicável</h2>
      <p>
        Este Aviso é regido pelas leis brasileiras, especialmente a Lei nº
        13.709/2018. Fica eleito o foro da Comarca de Brasília/DF, observadas as
        regras legais aplicáveis.
      </p>
      <FinalCta
        title="Precisa falar com a nossa equipe?"
        highlight="Estamos à disposição para atender solicitações de privacidade."
        description="Fale conosco diretamente pelo WhatsApp."
        href={getWhatsAppUrl()}
        label="Fale conosco"
        external
      />
    </InstitutionalPage>
  );
}

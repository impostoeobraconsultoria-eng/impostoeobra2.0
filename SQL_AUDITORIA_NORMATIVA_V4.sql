-- Auditoria editorial normativa V4.8 + artigo Manual do SERO 2026.
update public.artigos
set conteudo_html = replace(replace(replace(replace(replace(conteudo_html,
  'pode ser reduzida em 60% a 73% com o <strong>Fator de Ajuste</strong>, somado a notas de materiais industrializados',
  'pode ser reduzida conforme os fatores, as remunerações declaradas e as deduções admitidas pela legislação'),
  'Como punição, utiliza aferição indireta.',
  'Nessa hipótese, aplica-se a aferição indireta prevista na legislação.'),
  'Cada erro isolado costuma representar entre <strong>R$ 1.500 e R$ 8.000 a mais</strong> no DARF final.',
  'O impacto de cada erro depende da área, do período e dos documentos da obra.'),
  'Combinados, podem facilmente dobrar o valor pago.',
  'Combinados, podem aumentar significativamente o valor apurado.'),
  'alguns descuidos no cadastro e na documentação podem inflar a contribuição previdenciária em até 70&nbsp;%.',
  'alguns descuidos no cadastro e na documentação podem aumentar indevidamente a contribuição previdenciária.')
where publicado = true;

update public.artigos
set meta_description = 'Recebeu aviso para regularização de obra da Receita Federal? Entenda o ARO, confira o prazo do documento e saiba como regularizar CNO e SERO.',
    conteudo_html = replace(replace(replace(replace(replace(conteudo_html,
      'O ARO tem prazo de resposta entre 30 e 60 dias a partir da data da ciência.',
      'O prazo para resposta é o indicado no próprio aviso e deve ser conferido a partir da ciência.'),
      'abre prazo de 30 a 60 dias para resposta e interrompe a decadência.',
      'informa prazo específico para regularização, que deve ser conferido no próprio documento.'),
      'o ARO é o início formal de um procedimento fiscal: ele <strong>interrompe a decadência</strong> (o prazo que a Receita tem para cobrar tributos passados), abre prazos administrativos para resposta',
      'o aviso comunica a necessidade de regularização e informa o prazo aplicável ao caso'),
      'O prazo é definido na própria notificação e costuma variar entre <strong>30 e 60 dias corridos</strong> a partir da data da ciência (quando vc abriu no e-CAC ou assinou o aviso de recebimento da carta).',
      'O prazo é definido no próprio aviso e deve ser contado conforme a forma e a data de ciência nele registradas.'),
      'Mas atenção: a Receita pode considerar ciência tácita após 15 dias do envio digital — então é arriscado contar com isso pra "ganhar tempo".',
      'Consulte o documento e o processo digital para confirmar a ciência e o vencimento.')
where slug = 'artigo-notificacao-inss-obra';

update public.artigos
set conteudo_html = replace(conteudo_html,
  'Aplicar todos esses mecanismos costuma reduzir o valor cobrado em <strong>40% a 70%</strong> em casos típicos. Em casos com decadência parcial reconhecida, a redução pode chegar a 90%.',
  'Nos casos analisados pela Imposto &amp; Obra, esses mecanismos podem reduzir o valor apurado, mas o percentual depende dos documentos, das remunerações declaradas, das características e do período da obra.')
where slug = 'artigo-notificacao-inss-obra';

insert into public.artigos (
  slug,titulo,subtitulo,meta_description,conteudo_html,faq,schema_type,
  prioridade_seo,categoria,cluster,tags,publicado,data_publicacao
) values (
  'manual-do-sero-2026',
  'Manual do SERO 2026: guia prático para entender e usar o sistema da Receita Federal',
  'Entenda quando usar o SERO, como acessar a aferição da obra, quais dados revisar e o que acontece até a DCTFWeb, o DARF e a certidão.',
  'Manual do SERO 2026 explicado: acesso, aferição da obra, CNO, DCTFWeb, DARF, certidão, retificação e erros comuns no sistema da Receita.',
  $html$
<p>O <strong>SERO (Serviço Eletrônico para Aferição de Obras)</strong> é o sistema da Receita Federal usado para calcular as contribuições sociais devidas na regularização de uma obra. Este guia explica o fluxo em linguagem prática e complementa — sem substituir — o <a href="https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/manuais/manual-do-sero/manual-do-sero.pdf/view" target="_blank" rel="noopener noreferrer">Manual oficial do SERO, versão 3.0</a>.</p>
<aside><div>Resumo rápido</div><ul><li>O <strong>CNO</strong> cadastra e identifica a obra; o <strong>SERO</strong> realiza a aferição. São etapas diferentes.</li><li>A aferição reúne dados da obra, áreas, período, responsabilidade, contabilidade e remunerações já declaradas.</li><li>Ao concluir, o SERO transmite a DCTFWeb Aferição de Obras; o pagamento é feito por DARF e a certidão depende da regularidade fiscal.</li></ul></aside>
<h2>O que é o SERO e quando ele deve ser usado</h2>
<p>A Receita define aferição como o procedimento de avaliação das contribuições sociais devidas em razão do uso de mão de obra na construção, reforma ou demolição. A obra precisa estar inscrita no CNO antes de ser selecionada no SERO. Pessoa física utiliza aferição indireta; pessoa jurídica pode ter aferição por contabilidade regular quando cumpre os requisitos legais.</p>
<h2>Como acessar o SERO em 2026</h2>
<ol><li>Acesse o Portal e-CAC com a identidade digital autorizada.</li><li>Localize o SERO na área de declarações e demonstrativos.</li><li>Escolha <strong>Aferir obra</strong> e selecione a inscrição no CNO.</li><li>Antes de avançar, confira responsável, endereço, datas e situação cadastral.</li></ol>
<p>Se a obra não aparecer ou os dados estiverem incorretos, corrija o CNO antes de continuar. Consulte <a href="/artigos/erro-cno-receita">o que é CNO e como corrigir erros</a>.</p>
<h2>Etapas da aferição no sistema</h2>
<h3>Identificação e período</h3><p>Confirme a obra, a responsabilidade e o período efetivamente aferido. Obras parciais, inacabadas, adquiridas ou com períodos antigos exigem atenção às orientações específicas da Receita.</p>
<h3>Características e áreas</h3><p>Informe destinação, categoria, tipo construtivo e áreas com base em documentos oficiais, como alvará, habite-se, certidão municipal, projeto aprovado ou laudo admitido. Áreas cobertas e descobertas podem receber tratamento diferente.</p>
<h3>Contabilidade e remunerações</h3><p>O sistema considera a forma de aferição e as remunerações declaradas em sistemas oficiais. Componentes pré-fabricados ou pré-moldados e concreto preparado em usina seguem condições próprias da IN RFB nº 2.021/2021; não é correto tratar toda nota de material como crédito automático.</p>
<h3>Memória de cálculo</h3><p>Revise a memória antes da conclusão. Confira área, VAU, remuneração de mão de obra, fatores aplicáveis e créditos de remuneração. Uma informação errada pode exigir retificação posterior.</p>
<h2>DCTFWeb Aferição de Obras, DARF e certidão</h2>
<p>Ao concluir e transmitir, é gerada uma DCTFWeb específica para a aferição. O DARF é emitido a partir da declaração. Depois da regularização dos débitos, a certidão da obra deve ser solicitada no serviço próprio da Receita; conforme a situação fiscal, poderá ser emitida certidão negativa ou positiva com efeitos de negativa.</p>
<h2>É possível retificar ou cancelar uma aferição?</h2>
<p>A Receita mantém orientações próprias para retificação e cancelamento. Se já houve transmissão ou pagamento, não refaça o processo sem verificar como o valor anterior será tratado. Consulte as perguntas frequentes oficiais ou atendimento de construção civil.</p>
<h2>Erros comuns no SERO</h2>
<ul><li>Iniciar a aferição com dados divergentes no CNO;</li><li>usar área diferente do documento oficial sem justificativa;</li><li>confundir nota de material com remuneração dedutível;</li><li>ignorar remunerações já declaradas em sistemas oficiais;</li><li>concluir sem revisar a memória de cálculo;</li><li>presumir que parcelamento sempre produz CND.</li></ul>
<p>Se o sistema não avançar, consulte <a href="/artigos/erro-sero">SERO não finaliza ou apresenta erro</a>. Para uma visão completa do processo, leia o <a href="/guia-inss-de-obra">Guia do INSS de obra</a>.</p>
<h2>Fontes oficiais e vigência</h2>
<ul><li><a href="https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=116968" target="_blank" rel="noopener noreferrer">IN RFB nº 2.021/2021 — aferição de obras</a></li><li><a href="https://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=122299" target="_blank" rel="noopener noreferrer">IN RFB nº 2.061/2021 — Cadastro Nacional de Obras</a></li><li><a href="https://www.gov.br/receitafederal/pt-br/assuntos/construcao-civil/sero/sero" target="_blank" rel="noopener noreferrer">Aferição de Obras (SERO) — Receita Federal</a></li></ul>
<p><strong>Revisão normativa:</strong> agosto de 2026. As regras podem mudar; confirme sempre a versão vigente das normas e orientações oficiais.</p>
<p><a href="/calculadora-inss-de-obra">Simule uma estimativa do INSS da sua obra</a> e, para o valor definitivo, faça uma análise documental.</p>
$html$,
  '[{"pergunta":"CNO e SERO são a mesma coisa?","resposta":"Não. O CNO é o cadastro que identifica a obra. O SERO é o serviço usado para realizar a aferição das contribuições da obra."},{"pergunta":"Concluir o SERO gera a certidão automaticamente?","resposta":"A conclusão gera a DCTFWeb Aferição de Obras. A certidão é emitida em serviço próprio e depende da situação fiscal da obra."},{"pergunta":"Toda nota de material reduz o INSS da obra?","resposta":"Não. A norma prevê tratamentos específicos e condições próprias. Materiais em geral não devem ser tratados como crédito automático."}]'::jsonb,
  'Article',0.9,'Documentação e cadastro','Sistemas RFB',
  array['SERO','Manual do SERO','DCTFWeb','CNO','Receita Federal'],
  true,now()
)
on conflict (slug) do update set
  titulo=excluded.titulo,subtitulo=excluded.subtitulo,
  meta_description=excluded.meta_description,conteudo_html=excluded.conteudo_html,
  faq=excluded.faq,categoria=excluded.categoria,cluster=excluded.cluster,
  tags=excluded.tags,publicado=true,updated_at=now();

update public.artigos
set conteudo_html = conteudo_html || '<p>Veja também: <a href="/artigos/manual-do-sero-2026">Manual do SERO 2026 explicado passo a passo</a>.</p>',
    updated_at = now()
where slug = 'erro-sero' and conteudo_html not like '%/artigos/manual-do-sero-2026%';

update public.artigos
set conteudo_html = replace(
      conteudo_html,
      '40% a 70%',
      'percentuais que variam conforme a documentação e o enquadramento nos casos analisados pela Imposto &amp; Obra'
    ),
    updated_at = now()
where publicado = true and conteudo_html like '%40% a 70%%';

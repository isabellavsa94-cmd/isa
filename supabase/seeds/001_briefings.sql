-- Seed: 4 briefings iniciais importados do Flux
-- Rodar no SQL Editor do Supabase após a migration 0003_briefings.sql

insert into briefings (id, nome_demanda, canal, etapa_funil, format, accent_color, conceito, data_publicacao, referencia_arte, descricao_peca, legenda, hashtags, responsavel, image)
values (
  'br-004',
  '6 novidades em abril',
  'Instagram',
  'Meio',
  'Carrossel',
  'oklch(0.72 0.18 155)',
  'Mostrar as novidades de Flux que aconteceram em abril.',
  '20/05/2026 - 09h00',
  null,
  'SLIDE 1
6 novidades em abril
Vocês pediram, nós entregamos

SLIDE 2
Menções de usuários no feed do Instagram

Agora dá pra marcar perfil direto no Flux.

SLIDE 3
Grupos de hashtags e assinaturas

Pare de copiar e colar a mesma coisa todo dia.

SLIDE 4
Reels no Feed do Instagram

Seus reels agora saem no feed também. Você escolhe.

SLIDE 5
Expandir as mídias no link de aprovação

Seus clientes agora veem de verdade o que tá sendo aprovado.

SLIDE 6
Texto alternativo nos posts

Seus posts têm descrição agora. Todo mundo consegue ver.

SLIDE 7
Página de novidades do Flux

Tem um lugar pra gente contar o que tá chegando.

SLIDE 8 — CTA
Tá na hora de atualizar seu Flux
Todas essas tão lá esperando você usar.',
  'Todas essas features estão lá no Flux esperando você descobrir.

O que você ainda tá aguardando?',
  '{}',
  null,
  null
) on conflict (id) do nothing;

insert into briefings (id, nome_demanda, canal, etapa_funil, format, accent_color, conceito, data_publicacao, referencia_arte, descricao_peca, legenda, hashtags, responsavel, image)
values (
  'br-001',
  'Stitch Mosseri — "Agendar não prejudica alcance"',
  'Instagram',
  'Meio',
  'Reels',
  'oklch(0.68 0.18 340)',
  'React da declaração do Adam Mosseri de que agendar Reels não prejudica alcance. Renan usa a prova social pra desmontar o medo e encaminhar pro Reportei Flux como solução operacional.',
  '08/05/2026 · 19h00',
  'Vídeo do Mosseri nos primeiros 7s. Renan em PiP circular no canto inferior. Textos de overlay grandes, sans geométrica peso 700. Destaque na palavra "CATEGORICAMENTE". Legendas automáticas sempre visíveis.',
  'Duração 30-38s

[0s–7s: Mosseri fala no vídeo original]
"One of the most common questions I get is does scheduling a reel hurt your reach? And the answer is categorically no."

[7s: Renan assume]

Pronto. Acabou o debate.

O próprio chefe do Instagram veio aqui dizer que agendar reel não prejudica o seu alcance. Categoricamente não. Sem ressalvas.

Então se você ainda tava com medo de perder alcance por agendar seus posts — esse medo acabou agora.

E se você ainda tá agendando na mão, anotando em planilha, mandando print pro cliente aprovar no WhatsApp...

Existe uma forma melhor de fazer isso.

O Reportei Flux é feito pra você agendar, aprovar e organizar tudo num lugar só — sem medo de alcance, sem caos de processo.

Link na bio.

─── CTA ───
Comenta aqui embaixo: você ainda acreditava que agendar prejudicava o alcance?

═══════════════════════════════════════
TEXTOS NA TELA (OVERLAY)
═══════════════════════════════════════
[00:00–00:07] "O chefe do Instagram respondeu"
[00:07–00:09] "CATEGORICAMENTE NÃO."
[00:10–00:13] "Acabou o debate."
[00:14–00:20] "Medo de perder alcance agendando?"
[00:21–00:28] "Reportei Flux — agenda, aprova e organiza tudo num lugar."
[00:28–00:35] "Link na bio 👇"

═══════════════════════════════════════
NOTAS DE PRODUÇÃO
═══════════════════════════════════════
- Duração: 30–38 segundos
- Tom: casual, confiante, leve deboche
- Renan em PiP circular, ~20% da tela, canto inferior
- Gatilhos: prova social, dor nomeada, contraste dor/alívio, CTA de opinião',
  'Você agendava mas sempre ficava pensando se isso estava prejudicando a conta.

O Mosseri acabou de matar essa dúvida de vez.

Agenda sem culpa e sem medo. Use o Flux.',
  '{"#instagram","#reels","#socialmedia","#agendamento","#mosseri","#marketingdigital"}',
  '{"nome": "Renan Caixeiro", "foto": "uploads/pasted-1777003256892-0.png"}',
  'uploads/freepik_colocar-a-pessoa-da-foto-_2854843073.png'
) on conflict (id) do nothing;

insert into briefings (id, nome_demanda, canal, etapa_funil, format, accent_color, conceito, data_publicacao, referencia_arte, descricao_peca, legenda, hashtags, responsavel, image)
values (
  'br-002',
  'Gerador de contrato gratuito pra social media',
  'Instagram',
  'Topo',
  'Feed',
  'oklch(0.68 0.17 250)',
  'Post estático mostrando o gerador de contrato gratuito do Reportei. Foco na dor de não ter contrato assinado e na solução rápida (menos de 2 minutos).',
  '14/05/2026 · 09h00',
  'Feed estático 1:1 ou 4:5. Fundo escuro, tipografia dominante. Destaque visual no título e no disclaimer.',
  '[Título:] Gerador de contrato gratuito pra social media em menos de 2 minutos

[Disclaimer:] Anticalote!',
  'Você passou o mês inteiro entregando e quando chegou a hora de receber o cliente simplesmente sumiu.

Quem nunca passou por isso conhece alguém que passou e quase sempre a história é a mesma: não tinha nada assinado.

O @reportei criou um gerador de contrato gratuito pra social media que não demora nem 2 minutos pra preencher mas te protege por muito tempo.

Comenta CONTRATO e a gente te envia o link!

⚠️ O contrato não garante que o cliente vai pagar, garante que você tem onde cobrar. Fique esperto!',
  '{"#socialmedia","#freela","#contrato","#reportei","#marketingdigital"}',
  null,
  null
) on conflict (id) do nothing;

insert into briefings (id, nome_demanda, canal, etapa_funil, format, accent_color, conceito, data_publicacao, referencia_arte, descricao_peca, legenda, hashtags, responsavel, image)
values (
  'br-003',
  'O social media 2026 não é só executor',
  'Instagram',
  'Topo',
  'Carrossel',
  'oklch(0.72 0.18 155)',
  'Carrossel posicionando o social media moderno como estrategista, não só executor — e apresentando o Flux como solução operacional.',
  '18/05/2026 - 18h00',
  null,
  'SLIDE 1
Você não consegue nem almoçar porque tá respondendo aprovação de post no WhatsApp

SLIDE 2
O social media de 2026 não é só executor

Ele é estrategista, diretor de conteúdo, analista de performance e gestor de relacionamento ao mesmo tempo.

Mas a maioria ainda gasta horas do dia em coisa que devia ser automática.

SLIDE 3
Aprovação por WhatsApp
Planilha de calendário que ninguém abre
Print de post mandado no grupo errado
Rotina não. Confusão que se repete todo dia.

SLIDE 4
O mercado inteiro já foi numa direção
Menos produção travada. Mais agilidade, mais criatividade, mais estratégia.
Quem ainda tá no operacional fica pra trás.

SLIDE 5
A conta que cresce não é a que posta mais, é a que tem processo.

Aprovação rápida, calendário organizado, time na mesma página.

Isso libera tempo pro que realmente importa.

SLIDE 6
O Flux resolve isso

Agendamento, aprovação e organização.

Tudo centralizado, nada de WhatsApp, nada de planilha.

SLIDE 7 — CTA do evento
Se você quiser ver isso funcionando ao vivo, a gente vai estar no Conexão Social Media
29, 30 e 31 de maio em São Paulo.
Passa no estande do Flux. Vale mais do que qualquer post.',
  'O social media não faz ideia do próprio valor. Tá tão ocupado resolvendo confusão operacional que não consegue fazer o trabalho que importa.

Bora conversar sobre isso no Conexão Social Media?
Passa lá no estande do Flux. Dias 29, 30 e 31 de maio em São Paulo.',
  '{}',
  null,
  null
) on conflict (id) do nothing;

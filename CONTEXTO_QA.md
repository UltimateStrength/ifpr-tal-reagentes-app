# Contexto — Rodada de QA (v0.0.2 → sugestão v0.3.0-alpha)

Este documento é complementar ao `CONTEXTO.md` já existente no projeto (que
cobre o schema, as regras de negócio e o histórico de implementação das
etapas 1-14). Aqui está o resultado de uma sessão de testes manuais do
usuário no app rodando, com bugs reais, pedidos de UX e novas ideias.

Peça ao Claude Code para ler os dois arquivos juntos antes de trabalhar.
Aqui há liberdade de implementação em vários itens — as decisões de UX
finas (nomes de botão, exato onde clicar) ficam a critério de quem
implementa, desde que sigam os padrões visuais já estabelecidos no projeto
(paleta `#2f9e3f`/`#ca191f`/`#f0efe8`, componentes `.card`, `.modal-overlay`,
`.btn-primary`/`.btn-secondary`/`.btn-danger`).

## Prioridade alta — bugs

### 1. Apagar reagente: só funciona uma vez por visita à aba

**Repro:** abrir a aba Reagentes, apagar uma embalagem (avulsa ou "deletar
tudo"). Funciona. Tentar apagar uma segunda embalagem (do mesmo grupo ou de
outro) **sem sair da aba**: a ação não tem efeito. Só volta a funcionar
saindo da aba Reagentes e entrando de novo.

**Diagnóstico já feito:** `dataManager.removePackage` já casa a embalagem
por `_id` (UUID) quando existe, então não é mais o problema antigo de
colisão por `expiry`+`quantity`. O bug parece estar no **frontend**:
suspeita é estado (`window.__substancesData`, ou o `group`/`selected`
capturado em closure dentro de `openDeleteModal`/`openEditPkgModal`) ficando
desatualizado depois da primeira operação bem-sucedida, e a segunda
tentativa operando sobre dado stale (ex: um `subIndex` que já não existe
mais depois da renumeração de sub-índices dentro do grupo). Precisa
investigar com o código real na mão — não tentar corrigir só por inspeção,
reproduzir localmente e depurar o fluxo de re-render depois do primeiro
delete. Times de dados após decrementar: os `subIndex` de todas as
embalagens restantes do grupo são recalculados a cada `getAll()` (são
`${groupNumber}.${posição na ordenação por validade}`), então qualquer
referência guardada de `subIndex` antes da primeira exclusão pode não bater
mais depois dela — esse é o candidato mais forte pra causa raiz.

### 2. Saudação "Bom dia/Boa tarde/Boa noite" perde o nome do usuário

**Repro:** entra, vê "Bom dia, Marcos!". Depois de um tempo (ou quando outro
usuário faz qualquer ação), vira "Bom dia, Visitante!" — como se tivesse
logado com token de visitante, mesmo sem ter feito nada.

**Causa raiz confirmada:** em `public/assets/js/substances.js`, a função
`onDataUpdate(data)` (chamada toda vez que o polling de 5s recebe uma
atualização de qualquer usuário) chama `renderHome()` **sem argumento**:

```javascript
function onDataUpdate(data) {
  window.__substancesData = data;
  const isHome = !!document.getElementById('page-home');
  const isSubs = !!document.getElementById('page-substances');
  if (isHome) renderHome();          // <- sem ctx!
  ...
}
```

E `renderHome(ctx)` usa `ctx?.displayName || 'Visitante'` — como `ctx` vem
`undefined` aqui, sempre cai no fallback "Visitante". Isso explica por que
piora com mais gente usando (mais eventos de polling disparando o
sobrescrever). **Correção:** guardar o `ctx`/`displayName` da sessão em
algum lugar acessível globalmente (ex: `window.__userCtx` setado uma vez em
`init(pageName, ctx)`) e usar essa referência dentro de `onDataUpdate`, em
vez de depender de receber `ctx` de novo a cada chamada.

## Prioridade alta — funcionalidade prometida mas ausente na UI

### 3. Numeração travável/destravável — não existe no formulário

Foi projetado (`dataManager.setGroupNumber` com `force`, endpoint
`PATCH /:nameLower/number` já existe no backend), mas **não há campo de
número, nem checkbox de destravar, em nenhum formulário do frontend**.
Falta: no formulário de criação (e/ou edição), um input de número
pré-preenchido com o próximo disponível, desabilitado por padrão, com um
checkbox "editar número manualmente" que o destrava; ao salvar com número
alterado, se vier conflito (resposta 409 do endpoint) mostrar a mensagem de
confirmação ("Reagente X ocupa esse número, mover ele pro nº Y?") antes de
reenviar com `force: true`.

### 4. Campo "Controlado PF" — virou checkbox quebrado visualmente

Pedido original era um "sim/não" claro. Hoje é um checkbox que quebra linha
(rótulo "PF" numa linha, o checkbox sozinho embaixo). Trocar para um layout
horizontal alinhado (label e controle lado a lado, `display:flex;
align-items:center`) — pode continuar sendo checkbox estilizado, ou virar
um toggle/par de botões "Sim"/"Não", o que fizer mais sentido junto dos
outros campos do formulário.

### 5. "Editar" vs "Editar substância" — nomes confusos

Do item 14 do CONTEXTO.md: o modal de embalagem (quantidade, validade,
armário, situação, local, marca) e o modal de dados da substância (CAS, PF,
tags, observações, incompatibilidades) têm nomes parecidos demais. Precisa
de nomes mais didáticos que deixem claro que um edita **um frasco
específico** e o outro edita **o reagente como um todo**. Sugestões pra
avaliar (não é obrigatório usar exatamente): "Editar embalagem" /
"Editar informações gerais", ou "Editar frasco" / "Editar reagente".

### 6. Modal de "Registrar uso" — falta o botão de confirmar

Só existe "Cancelar". Precisa do botão de submeter o consumo (chama
`POST /api/substances/:sub/consumption` com quantidade + observação +
checkbox "quase acabando" já implementados).

## Prioridade média — UX visual

### 7. Modal de "Editar" sem scroll — conteúdo cortado

Com os campos novos (CAS, PF, armário, situação, local, marca, tags,
observações), o modal ficou mais alto que a viewport em telas menores e não
tem barra de rolagem. Precisa `overflow-y: auto` e um `max-height`
(relativo à viewport, ex: `max-height: 85vh`) no container do modal/painel.

### 8. Aba Armários — layout feio, desalinhado

Comparar com a aba Usuários (print em anexo, referência de como o app já
resolve isso bem: cards centralizados, alinhados, com botões "editar"/"❌"
no mesmo padrão visual). Refazer o CSS da lista de armários pra seguir o
mesmo padrão de card da aba Usuários.

### 9. `confirm()`/`alert()` nativos do navegador — trocar por modal HTML

Hoje várias ações usam `confirm()`/`alert()` do JavaScript (ex: apagar
armário, apagar embalagem). Problema duplo: (a) incerto se renderiza bem
dentro do WebView do MIT App Inventor quando empacotado como APK — mesmo
que funcione, foge do visual do app; (b) já existe um padrão de modal HTML
no sistema (`.modal-overlay` / `.modal-box`, usado em `remove-modal` etc.) —
usar esse componente pra todas as confirmações, em vez do `confirm()`
nativo do navegador.

### 10. Fila de Solicitações — falta botão de voltar ao menu

A tela em si está boa (ver print em anexo), só falta um jeito de voltar
pro menu sem usar o botão "voltar" do navegador/sistema. Adicionar um botão
de voltar consistente com o resto do app (provavelmente já existe um
padrão de header com seta "←" em outras páginas — replicar).

### 11. Datas — mudar exibição visual, sem tocar no banco

Hoje aparece `AAAA-MM-DD` em todo lugar que mostra data (cards, histórico,
listas). Pedido: mostrar de forma amigável, ex. `18 SET 2026`. **Importante:**
isso é só de **exibição** — o banco continua salvando ISO
(`YYYY-MM-DD`), e os `<input type="date">` dos formulários continuam
recebendo/enviando ISO (é o formato que o próprio input HTML exige). Criar
uma função utilitária de formatação (ex: `formatDateBR(iso)`) e aplicar só
nos lugares que **exibem texto**, não nos inputs de formulário.

## Prioridade média — busca e tags

### 12. Campo de busca — botão de limpar (X)

Adicionar um "x" clicável dentro da caixa de busca de reagentes, alinhado à
direita, que limpa o campo e reseta a lista (equivalente a apagar o texto
manualmente, que já dispara `renderSubstances('')`).

### 13. Tags visíveis no card do reagente

Hoje o card mostra nome, CAS e badge PF, mas não mostra as tags. Adicionar
as tags como badges/chips pequenos no card.

### 14. Busca por tag

A busca de texto hoje considera nome, CAS e número. Estender para também
casar contra as tags do reagente (se o termo buscado bater com qualquer
tag, o reagente aparece no resultado).

### 15. Autocomplete de tags também no campo de busca

O formulário de criação já tem autopreenchimento de tags existentes
(`c-tags-suggestions`). Replicar esse mesmo comportamento no campo de busca
da lista de reagentes — sugerir tags já cadastradas conforme o usuário
digita.

## Prioridade média — histórico

### 16. Enriquecer o histórico de ações

O histórico (`utils/history.js` / aba Histórico) hoje registra
adição/remoção com os campos básicos antigos. Com os campos novos
(consumo, armário, situação, tags, etc.) e as novas ações (registrar uso,
mudança de fila de solicitações, edição pós-criação), o histórico deveria
capturar isso também — quem fez o quê, quando, e com que detalhe. Dada
liberdade aqui: avaliar o que faz sentido logar de cada ação nova
(ex: "Prof. Tal registrou uso de 12mg em Ácido Sulfúrico 3.2", "Rute moveu
Etanol 1.1 para Armário 2") e estender o formato de entrada do histórico
sem quebrar as entradas antigas já salvas no banco.

## Prioridade baixa — ideia nova (dashboard inicial)

### 17. Home mais interativa

A tela inicial hoje mostra só números estáticos (total, "quase vencendo",
"vencidos") e uma lista de recentes. Pedido: tornar mais interativo/visual —
por exemplo, clicar no indicador "2 pra vencer" abrir mais detalhes sobre
quais são esses 2 (lista ou um gráfico simples). Fica a critério de quem
implementar decidir o formato (modal, nova seção expansível, ou uma aba
própria) e se vale a pena usar algum gráfico simples (ex: pizza/barra de
status: OK / vence em breve / vencido). Não é uma correção, é uma
melhoria — pode ficar para depois das prioridades acima.

## Notas de processo

- **A importação real dos 417 registros da planilha oficial continua
  aguardando sinal explícito do usuário** — nenhum item acima autoriza
  rodar isso.
- Ao corrigir o bug de exclusão (item 1), rodar teste manual explícito do
  cenário completo antes de dar como resolvido: cadastrar 1 substância com
  2+ embalagens, apagar uma, apagar outra na sequência, sem recarregar a
  página.
- Prints anexados pelo usuário como referência visual: tela de Usuários
  (bom exemplo de card/lista a seguir), tela de Armários atual (o que está
  feio, a corrigir), tela de Fila de Solicitações atual (boa, só falta o
  botão de voltar).

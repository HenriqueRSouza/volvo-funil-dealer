# volvo-funil-dealer

Aplicação frontend em React + TypeScript para tratamento e visualização do funil de vendas da rede Volvo.

## Tecnologias
- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn-ui
- Autenticação: Entra ID (Azure AD) via Azure Static Web Apps

## Pré-requisitos
- Node.js (recomendado via nvm)
- npm ou yarn
- Conta/serviço para hospedar APIs que a UI consome (Logic Apps / Azure Functions / APIs REST)

## Variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as variáveis abaixo (no Vite todas as variáveis públicas devem começar com `VITE_`):

```env
VITE_SHEET1_URL=https://seu-logic-app-ou-api/api/sheet1
VITE_SHEET2_URL=https://seu-logic-app-ou-api/api/sheet2
VITE_SHEET3_URL=https://seu-logic-app-ou-api/api/sheet3
VITE_SHEET4_URL=https://seu-logic-app-ou-api/api/sheet4
```

Substitua as URLs pelas endpoints reais das suas APIs.

## Autenticação
A aplicação integra-se à autenticação do Azure Static Web Apps com Entra ID (Azure AD). Endpoints úteis:
- Login: `/.auth/login/aad`
- Logout: `/.auth/logout`
- Verificar usuário: `/.auth/me`

As roles e informações do usuário são retornadas pela API de roles do Azure Static Web Apps.

## Instalação e execução local
1. Clonar o repositório:
   git clone <REPO_URL>
2. Entrar no diretório:
   cd volvo-funil-dealer
3. Instalar dependências:
   npm install
4. Rodar em modo de desenvolvimento:
   npm run dev

Build de produção:
- Gerar build: `npm run build`
- Pré-visualizar build: `npm run preview`

(obs.: adapte para `yarn` se preferir)

## Estrutura do projeto (resumo)
- src/ — código fonte React/TS
- public/ — assets públicos
- index.html — entrada do Vite
- vite.config.ts — configuração do Vite
- tailwind.config.cjs — configuração do Tailwind
- package.json — scripts e dependências

## Scripts comuns
- npm run dev — servidor de desenvolvimento
- npm run build — gera produção
- npm run preview — serve o build localmente
- npm run lint — (se configurado) linting
- npm run test — (se configurado) executar testes

Verifique `package.json` para scripts específicos do projeto.

## Deploy
Recomendado usar Azure Static Web Apps (compatível com autenticação Entra ID) ou qualquer host estático que sirva o build gerado por Vite.
- Criar workflow de CI que execute `npm ci` e `npm run build` e publique a pasta `dist`.
- Configurar as variáveis de ambiente no provedor de hospedagem/CI.

## Integração com APIs
- Garanta que as APIs permitam CORS para a origem do frontend.
- Use as variáveis `VITE_SHEET*_URL` para apontar para as endpoints reais.

## Fluxos de Dados

Segue uma visão dos principais fluxos de dados: de onde vêm os dados, como são processados e para onde vão.

### Visão geral

```mermaid
flowchart LR
   subgraph Sources
      CRM[Dealer CRM / DMS]
      Forms[Lead forms / Landing pages]
      Integrations[3rd-party APIs]
   end
   LogicApp[Logic App / Azure Function]
   Storage[(Storage / Database / Google Sheets)]
   Frontend[Frontend (React)]
   Analytics[Analytics / Power BI]
   Notification[Email / Teams notifications]

   CRM --> LogicApp
   Forms --> LogicApp
   Integrations --> LogicApp
   LogicApp --> Storage
   LogicApp --> Frontend
   Frontend --> Analytics
   LogicApp --> Notification
```

### Fluxos por endpoint (variáveis `VITE_SHEETn_URL`)

- `VITE_SHEET1_URL`: Origem: Dealer CRM / formulários; Processamento: Logic App transforma e normaliza; Destino: Planilha/Storage (Sheet1) e consumidor: frontend consulta para exibir dashboard.
- `VITE_SHEET2_URL`: Origem: Lead aggregator / campanhas; Processamento: enrichment e dedup; Destino: Storage (Sheet2) e serviços analíticos; Consumidor: frontend e relatórios.
- `VITE_SHEET3_URL`: Origem: Pós-venda / histórico de atendimento; Processamento: agregação por concessionária; Destino: Storage (Sheet3) e BI; Consumidor: frontend.
- `VITE_SHEET4_URL`: Origem: Conversões / vendas confirmadas; Processamento: validação e sincronização com ERP; Destino: Storage (Sheet4) e notificações para equipes.

### Observações operacionais
- As Logic Apps/Functions expõem as URLs consumidas pelo frontend via variáveis `VITE_SHEET*_URL`.
- O frontend realiza apenas leitura para exibir o funil; operações de escrita (se houver) devem passar por APIs autenticadas.
- Garantir logs e monitoramento nas Logic Apps para rastrear origem/destino de registros e erros.

## Segurança
- Nunca comitar segredos ou chaves no repositório.
- Variáveis sensíveis devem ser definidas no ambiente do host/CI.
- Revisar permissões do app Entra ID e roles.

## Testes e QA
- Adicionar testes unitários com Jest/Testing Library conforme necessidade.
- Automatizar checks via CI (lint, build e testes).

## Contribuição
- Criar branches nomeadas por feature/bugfix.
- Abrir PR com descrição clara e checklist de testes.
- Seguir convenções de commit do time.

## Resolução de problemas
- Erro CORS ao consumir API: confirmar origem e cabeçalhos no backend.
- Variáveis Vite não carregam: confirmar prefixo `VITE_` e reiniciar dev server.
- Problemas de autenticação: verificar configuração do Azure Static Web Apps e redirect URIs.

## Licença
Adicionar o arquivo LICENSE conforme política do repositório (por exemplo MIT).

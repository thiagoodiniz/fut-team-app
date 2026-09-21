# Changelog - FutTeam App

Todas as modificações relevantes deste projeto são documentadas neste arquivo.

## [Unreleased]

### Modificado
- **Refatoração da Home Page (Dashboard):**
  - Quebra do endpoint monolítico `getDashboardStats` em 4 endpoints granulares e paralelos (`/summary`, `/last-matches`, `/top-scorers`, `/attendance`) na API autenticada e pública.
  - Correção de bug no cache manual antigo do controller (que nunca era invalidado). O cache da dashboard agora delega 100% para o `cacheMiddleware` automático na rota.

- **Otimização de Performance (Jogos e Clube):**
  - Redução drástica do payload do endpoint de listagem de jogos (`listMatches`): os objetos aninhados de presenças e gols agora retornam apenas os campos essenciais do jogador (`id`, `name`, `nickname`), economizando banda de rede e acelerando o carregamento da tela de Jogos e do modal de "Resumo do Mês".
  - Otimização do banco de dados na tela do Clube (`getTeamStats`): removida a inclusão (include) duplicada e desnecessária de todos os gols do time no carregamento das partidas base, diminuindo o uso de memória do Prisma e tempo de query.

- **Refatoração do Sistema de Cache:**
  - Transição de um modelo de cache dependente de TTL (5 min) para um modelo baseado primariamente em invalidação por eventos, com TTL de 1h (3600s) atuando apenas como rede de segurança de memória.
  - Criação de middlewares distintos (`logoCacheMiddleware`, `photoCacheMiddleware`) resolvendo o bug onde rotas não-autenticadas (escudos e fotos) nunca eram cacheadas devido à ausência do `teamId` no JWT.
  - Limpeza de dead-code na invalidação de cache (remoção de `delStartWith('dashboard:')` inoperante).
  - Remoção de todos os imports dinâmicos (`require`) de cache injetados nos controllers, que poderiam falhar silenciosamente. Utilização de imports estáticos.
  - Correção de vazamento de cache stale no controller de `replaceSeasonPlayers`, que não realizava invalidação após a modificação da lista de jogadores da temporada.
  - Invalidação específica de foto do jogador (`invalidatePlayerPhoto`) adicionada à rota de atualização de jogador, garantindo consistência com o TTL estendido.

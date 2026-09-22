# Changelog - FutTeam App

Todas as modificações relevantes deste projeto são documentadas neste arquivo.

## [Unreleased]

## [1.2.0] - 2026-09-22

### Adicionado
- **Ranking e Lógica de Assistências:** 
  - Adicionado suporte completo à contagem de assistências, incluindo média de assistências por jogo no Dashboard e rotas para obter partidas com assistência do jogador.
- **Competição em Gols:** 
  - Adicionado envio de `competition` e `competitionPhase` no endpoint de gols por jogador.
- **Painel Admin:** Adicionadas rotas seguras para listagem (`getAllTeams`), edição (`updateTeamAdmin`) e soft delete (`softDeleteTeam`) global de times. O criador de um time agora recebe a permissão de dono `OWNER` imediatamente na resposta da criação.
- **Gols Contra:** Exibição estruturada de gols contra nos detalhamentos e histórico de partidas.

### Corrigido
- **Jogos sem Placar:** Correção de bug no Dashboard e nos rankings (Artilharia, Assistência, Frequência) que listavam jogos com placar nulo como finalizados. Agora apenas jogos com `ourScore` e `theirScore` preenchidos são contabilizados nas estatísticas.

## [1.1.0] - Anterior

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

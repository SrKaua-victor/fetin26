# BusTrack — contexto do projeto

Rastreio de ônibus em tempo real. Projeto de feira tecnológica (FETIN), em
produção num domínio próprio e usado por pessoas reais em rede móvel.

> Este arquivo é carregado automaticamente em toda sessão. O `README.md` explica
> **como usar**; aqui ficam as decisões e as armadilhas — o que não se descobre
> lendo o código.

---

## Onde roda

| | |
|---|---|
| Site do passageiro | https://bustrack.app.br |
| Painel admin | https://bustrack.app.br/admin |
| App do motorista (PWA) | https://bustrack.app.br/motorista |
| APK | `github.com/SrKaua-victor/fetin26/releases/latest/download/bustrack-motorista.apk` |

O servidor é a **máquina Windows do autor**, publicada por um túnel nomeado do
Cloudflare. Backend e túnel sobem junto com o Windows (atalhos na pasta
*Inicializar*, apontando para `backend/start-backend.cmd` e `start-tunnel.cmd`);
os dois se religam sozinhos se caírem.

**Credenciais ficam no `.env`**, que está fora do Git. Nunca escreva senha,
`AUTH_SECRET` ou token em arquivo versionado — o repositório é público.

---

## Arquitetura em uma frase

O backend (porta 3001) serve os três frontends e a API no mesmo processo: `/`,
`/admin`, `/motorista`. Como os frontends caem em **same-origin** quando
`VITE_SERVER_URL` está vazio, não há CORS e nenhum deles carrega o endereço do
servidor embutido — trocar o domínio não obriga a recompilar nada.

A exceção é o **APK**: ele não tem servidor próprio, então recebe o endereço no
build (`VITE_SERVER_URL`) e tem a tela *Servidor* para corrigir à mão.

Banco: **SQLite via `node:sqlite`** (nativo do Node 22.5+, sem dependência
externa). Tabelas: `drivers`, `vehicles`, `routes`, `trips`, `locations`,
`trip_stops`, `settings`.

---

## Armadilhas que já custaram horas

Cada uma destas apareceu como "não funciona" e levou muito tempo para ser
diagnosticada. Se um sintoma parecido voltar, comece por aqui.

**`.ts.net` não resolve em alguns aparelhos.** O Tailscale Funnel foi a primeira
escolha — HTTPS e endereço fixo de graça. Mas o domínio é obscuro e aparece em
listas de bloqueio de DNS: houve celular que não resolvia em nenhuma rede, nem
Wi-Fi nem dados móveis. Foi o que motivou o domínio próprio.

**Túnel gratuito responde HTML no lugar da API.** O ngrok grátis intercepta
requisições com cara de navegador e devolve uma página de aviso. Como ela não tem
cabeçalhos CORS, o `fetch` lança e o app relata "não foi possível falar com o
servidor" — com o servidor no ar e o endereço correto. O app manda
`ngrok-skip-browser-warning` por isso; o cabeçalho é inofensivo em outros
servidores.

**Endereço salvo no app vencia o do build.** O que o motorista digita em
*Servidor* fica no armazenamento do app e sobrevive a reinstalação, então um APK
novo apontando para outro lugar não tinha efeito. Hoje o app guarda também qual
era o endereço embutido na época e descarta o salvo quando o build muda.

**Deploy não é só `git push`.** O backend serve os frontends a partir do `dist/`.
Publicar exige `npm run build:all` **na máquina que hospeda** — e vale conferir se
o hash do bundle servido bate com o do disco, senão você está olhando cache.

**Testar de dentro do tailnet não prova nada.** `curl` da máquina do servidor
resolve pelo MagicDNS e nunca sai para a internet. Verificação externa de verdade
precisa de outro ponto de rede.

**Daemon do Gradle trava.** O build do APK ficou 21 minutos parado gastando 2,5 s
de CPU. `gradlew --stop` e depois `--no-daemon` resolveu — o script
`scripts/build-apk.mjs` já usa `--no-daemon` por isso.

**`gradlew` não resolve no Git Bash.** O Git Bash exporta
`NoDefaultCurrentDirectoryInExePath`, que faz o `cmd.exe` parar de procurar
executável no diretório atual. Nem `gradlew` nem `gradlew.bat` são encontrados,
mesmo com o `cwd` certo — por isso o script usa caminho absoluto entre aspas.

**CARTO passou a exigir chave.** Os tiles do mapa vinham com "API KEY REQUIRED"
carimbado, respondendo `200 OK`. Hoje usamos os tiles do OpenStreetMap. Não
reintroduza filtro `grayscale` no tema claro: ele foi feito para os tiles
dessaturados do CARTO e, sobre o OSM, apaga a leitura do mapa.

**O `build:apk` sobrescreve o `dist` da web.** Ele roda o `vite build` com
`VITE_SERVER_URL` preenchido, e esse `dist` é o mesmo que o backend serve em
`/motorista`. Depois de gerar APK, rode `npm run build` sem a variável para o
site voltar a ser same-origin, senão a versão web passa a carregar o endereço
embutido e o `getServerUrl()` descarta o endereço salvo dos motoristas.

**Migração de banco precisa de `ALTER` à parte.** `CREATE TABLE IF NOT EXISTS`
só cria do zero. Colunas novas em tabela existente usam o helper
`addColumnIfMissing` em `db.js`.

---

## Decisões com motivo

**Detecção de desvio mede distância ao segmento, não aos vértices.** As rotas têm
pontos esparsos; um ônibus parado no meio de uma reta longa fica a centenas de
metros do vértice mais próximo sem ter saído do caminho.

**Chegada em parada roda fora do throttle de gravação.** O throttle descarta
posições próximas entre si, e é justamente parado na parada que o ônibus gera
posições assim.

**`trip_stops` tem chave composta `(trip_id, stop_id)`.** O ônibus fica minutos
dentro do raio mandando posição a cada segundo; a chave torna o registro
idempotente.

**Ocorrências do motorista são códigos fixos, não texto livre.** Quem dirige toca
um botão; o rótulo fica com quem exibe, então dá para reescrever sem migrar o
banco.

**`trust proxy` limitado ao loopback.** Atrás do túnel o `req.ip` de todo mundo
seria `127.0.0.1` e o limite de login viraria global — um motorista bloquearia os
outros. Confiar só no loopback impede forjar `X-Forwarded-For` de fora
(verificado: o Cloudflare sobrescreve o cabeçalho).

**Viagens órfãs são fechadas com janela de 15 minutos.** Fechar todas as viagens
abertas no boot encerraria a de quem está rodando naquele instante, e o ônibus
sumiria do mapa.

---

## Fluxos

```bash
# Desenvolvimento (portas separadas, hot reload)
npm run dev

# Deploy: build + o backend passa a servir o novo
npm run build:all

# APK (funciona no cmd e no Git Bash)
cd frontend-driver
VITE_SERVER_URL=https://bustrack.app.br npm run build:apk
npm run build   # refaz o dist da web sem o endereço embutido

# Publicar o APK
gh release delete-asset v1.0.0 bustrack-motorista.apk --yes
gh release upload v1.0.0 <caminho>/bustrack-motorista.apk
```

**Depois de gerar um APK, confira o que ficou embutido** — abrir o zip e procurar
a URL no bundle já pegou APK publicado apontando para servidor antigo.

`LOG_API=1` no `.env` liga o log de cada chamada com status, IP e User-Agent.
É a forma mais rápida de saber se a requisição de um app **chegou** ao servidor —
separa falha de rede de falha de resposta. Sai uma linha por posição de GPS,
então deixe em `0` fora de diagnóstico.

---

## Pendências conhecidas

- **Senhas dos motoristas são `1234`** (matrículas `1001` e `1002`), publicadas no
  README, num servidor aberto na internet. Dá para abrir viagem e injetar GPS
  falso. Trocar na aba *Frota* do admin.
- **Token do motorista expira em 12 h** — um motorista pode ser deslogado no meio
  do turno. Não há renovação automática.
- **`node_modules` e `dist` estão versionados** de commits antigos; o
  `.gitignore` não os solta retroativamente. Limpar com `git rm -r --cached`.
- **Sem backup do banco.** `backend/data/bustrack.db` é ponto único de falha para
  motoristas, frota, linhas e histórico.
- **CORS aberto** (`origin: "*"` no Socket.IO).
- **Painel do VLibras não foi verificado abrindo** — o botão renderiza e o plugin
  inicializa, mas o avatar usa Unity WebGL e não sobe em headless com
  `--disable-gpu`. Precisa de teste em navegador real.
- Pasta vazia `{backend` na raiz, resíduo de um comando mal formado. Fora do Git,
  inofensiva, mas pode ser apagada.

---

## Como verificar mudanças

Build passando não prova comportamento. O que tem valor aqui:

1. `npm --prefix backend run check` e `npm --prefix backend test`
2. Build dos três frontends
3. **Exercitar o fluxo real** por socket — registrar um motorista de teste, mandar
   posição, conferir os eventos que voltam
4. **Olhar a tela** — Chrome headless com `--remote-debugging-port` e o DevTools
   Protocol. `Emulation.setEmulatedMedia` força o tema (a flag de linha de comando
   não afeta o `matchMedia`), `Emulation.setDeviceMetricsOverride` simula celular,
   e `Browser.grantPermissions` libera o GPS, sem o qual o app não inicia viagem.
   Marcador do Leaflet só abre popup com `Input.dispatchMouseEvent` — `.click()`
   sintético não funciona.
5. Repetir contra `https://bustrack.app.br`, não só `localhost`

# 🚌 BusTrack — Rastreio de Ônibus em Tempo Real

Sistema completo de rastreio de ônibus em tempo real, com tema claro estilo Uber/Moovit e suporte a dark mode:

- **Backend** (Node.js + Express + Socket.IO + SQLite) — API REST + WebSocket + persistência
- **Frontend Usuário** (React + Leaflet) — visualização do ônibus no mapa, ETA, próxima parada, timeline
- **Frontend Admin** (React + Leaflet) — cadastro de rotas com snap-to-roads (OSRM), horários, frota, ações rápidas
- **App do Motorista** (React + Capacitor) — **APK Android** com login, seleção da placa e GPS em segundo plano;
  o mesmo código também roda como PWA no navegador
- **Simulador de motorista** — HTML standalone que faz o ônibus se mover sem precisar de celular

---

## 📁 Estrutura

```
bustrack/
├── backend/              # Servidor Node.js (porta 3001) + banco SQLite
│   └── data/bustrack.db  # Criado sozinho na primeira execução
├── frontend-user/        # Site do usuário (porta 5173)
├── frontend-admin/       # Painel admin (porta 5174)
├── frontend-driver/      # App do motorista (porta 5175 na web)
│   └── android/          # Projeto Android nativo (Capacitor) → gera o APK
└── driver-simulator.html # Simula o app do motorista
```

> **Requisito**: Node 22.5 ou superior. O banco usa o módulo `node:sqlite`, que já vem
> junto com o Node — não precisa instalar nem compilar nada.

---

## 🚀 Subindo o sistema

Você vai precisar de **um terminal por serviço**.

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Servidor sobe em `http://localhost:3001`.

### 2. Frontend do Usuário

```bash
cd frontend-user
npm install
npm run dev
```

Abra `http://localhost:5173`.

### 3. Painel Admin

```bash
cd frontend-admin
npm install
npm run dev
```

Abra `http://localhost:5174`.

### 4. App do Motorista

```bash
cd frontend-driver
npm install
npm run dev
```

Abra `http://localhost:5175`.

---

## 📱 App do Motorista

App Android nativo (APK), feito com Capacitor em cima do código React. O motorista faz login,
escolhe a placa do ônibus e a linha, e o app passa a enviar o GPS para o servidor, que grava
tudo no banco. **O rastreamento continua com a tela apagada e o app em segundo plano.**

O mesmo código também roda no navegador como PWA — útil para testar rápido no computador,
mas nessa forma o GPS só funciona com o app aberto na frente.

### Fluxo

1. **Login** — matrícula e senha cadastradas no banco
2. **Seleção** — placa do ônibus (vem da tabela `vehicles`) e linha
3. **Viagem** — velocímetro, tempo de viagem, precisão do GPS e contador de posições enviadas
4. **Encerrar viagem** — fecha a viagem no banco e tira o ônibus do mapa

### Logins de exemplo

Criados sozinhos na primeira execução do backend:

| Matrícula | Senha | Motorista       |
|-----------|-------|-----------------|
| `1001`    | `1234`| João Silva      |
| `1002`    | `1234`| Maria Oliveira  |

Placas de exemplo: `ABC1D23`, `BUS2A45`, `XYZ7K89`. Para cadastrar as suas, use a aba
**Frota** do painel admin.

### Instalando o APK no celular

O APK pronto fica em:

```
frontend-driver/android/app/build/outputs/apk/debug/app-debug.apk
```

Passe para o celular (cabo, Google Drive, WhatsApp) e abra o arquivo. O Android vai pedir
para permitir a instalação de fontes desconhecidas — é normal para APK fora da Play Store.
Com o celular ligado por USB e a depuração ativada, dá para instalar direto:

```bash
adb install -r frontend-driver/android/app/build/outputs/apk/debug/app-debug.apk
```

Na primeira tela o app pergunta o **endereço do servidor** (ex: `192.168.0.10:3001`). O valor
que vem preenchido é o IP da máquina em que o APK foi gerado; se o backend mudar de IP, toque
em *Servidor* embaixo do botão Entrar e corrija. Celular e servidor precisam estar na mesma rede.

### Permissões que o app pede

| Permissão | Para quê |
|-----------|----------|
| Localização (**Permitir o tempo todo**) | Rastrear o ônibus durante a viagem |
| Notificações | Mostrar o aviso fixo "Viagem em andamento" |

A notificação fixa não é enfeite: o Android **exige** essa notificação para deixar o GPS rodando
em segundo plano. Enquanto ela estiver na barra, o rastreamento está ativo.

### Recompilando o APK

Depois de mexer no código do app:

```bash
cd frontend-driver
npm run build:apk
```

Isso roda o build do React, sincroniza com o projeto Android e gera o APK. Para embutir outro
endereço de servidor como padrão:

```bash
VITE_SERVER_URL=http://192.168.0.10:3001 npm run build:apk
```

Requisitos para compilar: **Java 17+** e o **Android SDK**. O caminho do SDK fica em
`frontend-driver/android/local.properties`, que não vai para o Git por ser específico de cada
máquina. Se o arquivo não existir, crie com uma linha (barras normais, não invertidas):

```properties
sdk.dir=C:/Users/SEU-USUARIO/AppData/Local/Android/Sdk
```

Abrir a pasta `frontend-driver/android` no Android Studio (`npm run open:android`) também
gera esse arquivo sozinho.

### Testando no emulador

```bash
# com um AVD já criado no Android Studio
emulator -avd NOME_DO_AVD
adb install -r frontend-driver/android/app/build/outputs/apk/debug/app-debug.apk
adb emu geo fix -45.3860 -22.8535     # simula a posição do GPS
```

Dentro do emulador, o backend da sua máquina fica em **`10.0.2.2:3001`** (não `localhost`,
que ali aponta para o próprio emulador). Ajuste em *Servidor*, na tela de login.

### Rodando como PWA no navegador

Para testar rápido no computador, sem gerar APK:

```bash
cd frontend-driver && npm run dev     # http://localhost:5175
```

No celular pelo navegador, o GPS **só funciona em HTTPS**. Use `npm run dev:https`, abra
`https://SEU-IP:5175` e aceite o certificado autoassinado. Mas para uso real prefira o APK:
no navegador o rastreamento para quando a tela apaga.

---

## 🗄️ Banco de dados

SQLite, em `backend/data/bustrack.db`. Criado e populado sozinho na primeira execução.

| Tabela      | O que guarda                                                              |
|-------------|---------------------------------------------------------------------------|
| `drivers`   | Motoristas: nome, matrícula, senha (hash scrypt), telefone, ativo         |
| `vehicles`  | Frota: placa, modelo, lotação, ativo                                      |
| `trips`     | Viagens: motorista, placa, linha, início, fim, nº de pontos, distância    |
| `locations` | Cada posição do GPS: lat, lng, velocidade, direção, precisão, horário     |
| `settings`  | Configuração interna (segredo usado para assinar os tokens de login)      |

**Gravação com throttle**: a posição é transmitida ao vivo a cada leitura do GPS, mas só vai
para o banco quando o ônibus anda 15 m (respeitando 2 s entre gravações), mais um registro a
cada 30 s com o ônibus parado. Isso evita encher a tabela com milhares de pontos repetidos.

Para zerar o banco, apague a pasta `backend/data/` e reinicie o backend.

**As rotas continuam em memória** — só o cadastro da frota, os motoristas e o histórico de
posições são persistidos. Reiniciar o backend volta as rotas para o exemplo padrão.

---

## 🧪 Testando com ônibus simulados

Para testar várias linhas ao mesmo tempo sem precisar de vários celulares, use o
`driver-simulator.html`. Ele se comporta como um motorista enviando GPS em tempo real para o
backend via Socket.IO — e as posições também são gravadas no banco, como as do app real.
A diferença é que o simulador não faz login nem escolhe placa: a viagem fica sem motorista
e sem veículo vinculados.

### Passo a passo

1. **Certifique-se que o backend está rodando** (porta 3001). O simulador conecta direto nele.
2. **No painel admin** (5174), tenha pelo menos uma rota com traçado e ativa. Se for primeira execução, já existe a *“Linha 01 - Centro / Terminal”* de exemplo.
3. **Abra o arquivo `bustrack/driver-simulator.html`** dando duplo clique nele (ou arrastando pro navegador). Não precisa servidor: ele abre como `file://`.
4. **Preencha no simulador**:
   - **Nome do motorista** — qualquer texto, ex: `João`
   - **Rota** — selecione a linha que você quer simular
5. **Clique em “Iniciar percurso”**. O simulador começa a interpolar a posição do ônibus seguindo os waypoints da rota e envia atualizações a cada segundo.
6. **Abra `http://localhost:5173`** (frontend-user) — você verá o ônibus se movendo no mapa em tempo real, com ETA atualizando e a próxima parada destacada na timeline.
7. **No admin (5174)**, na aba *Rotas* → selecione a mesma linha → veja o card flutuante do ônibus com velocidade, lotação estimada e ETA na parte de baixo do mapa.

### Múltiplos ônibus simultâneos

Quer ver várias linhas com vários ônibus rodando ao mesmo tempo?

- Abra o `driver-simulator.html` em **várias abas/janelas do navegador**.
- Em cada uma, escolha uma rota diferente (ou a mesma) e dê um nome distinto ao motorista.
- Cada aba conta como um motorista independente. Você verá todos no mapa ao mesmo tempo.

### Parando a simulação

- Botão **“Parar”** no simulador → marca o ônibus como offline.
- Fechar a aba → mesma coisa (desconecta o socket).
- Reiniciar o backend → todos os ônibus somem (estado em memória).

### Dicas de teste

- O simulador interpola suavemente entre waypoints, então o ônibus desliza pela rota como se fosse real.
- Velocidade aleatória entre ~20 e ~50 km/h — boa pra ver a lotação muda no card do admin.
- Se você desenhar uma rota nova no admin (com snap-to-roads), ela aparece no select do simulador depois de um *refresh* da página.

---

## 🛠️ Funcionalidades do Admin

- **Frota** (aba nova): cadastro de **veículos** (placa, modelo, lotação) e **motoristas**
  (nome, matrícula, senha, telefone). É daqui que sai o select de placa do app do motorista.
  Dá para desativar um veículo/motorista sem apagar, trocar a senha de um motorista e ver
  quem está em viagem no momento.
- **Snap-to-roads**: ao clicar no mapa em modo *Traçado*, o segmento segue as ruas via OSRM (`router.project-osrm.org`).
- **Editar geometria**: arraste âncoras (modo Traçado) e paradas (modo Paradas) para reposicionar. Paradas grudam automaticamente no traçado e se reordenam.
- **Renomear parada**: clique no marcador da parada em modo *Paradas* → botão *Renomear*.
- **Desfazer (Ctrl+Z)**: pilha de até 60 ações por rota (adicionar/remover/mover âncora ou parada, mudar cor, ativar/desativar).
- **Horários**: aba *Horários* tem editor de janela operacional (início/fim/intervalo) e partidas extras, para Seg-Sex, Sábado e Domingo separadamente.
- **Ações rápidas** (painel direito):
  - **Exportar rota** → baixa `.geojson` (LineString + paradas como Points)
  - **Duplicar rota** → cria cópia inativa pronta pra editar
  - **Relatório** → abre janela imprimível com stats e tabela de paradas
  - **Compartilhar** → tenta `navigator.share` (mobile) ou copia resumo pro clipboard

---

## 🛠️ Stack

| Camada        | Tecnologia                                              |
|---------------|---------------------------------------------------------|
| Backend       | Node.js, Express, Socket.IO                             |
| Frontend      | React 18, Vite, React-Leaflet                           |
| App motorista | React 18 + Vite + **Capacitor 7** (APK Android) — também roda como PWA |
| GPS do app    | `@capacitor-community/background-geolocation` (foreground service) |
| Mapa          | OpenStreetMap (tiles CARTO light_all / dark)            |
| Snap-roads    | OSRM público (`router.project-osrm.org`)                |
| Tempo real    | Socket.IO (WebSocket)                                   |
| Banco         | SQLite via `node:sqlite` (nativo do Node, sem depender de instalação) |
| Autenticação  | Senha com scrypt + token HMAC-SHA256 (só `node:crypto`) |

---

## 📡 API

### REST — rotas e ônibus

- `GET /api/routes` — lista rotas
- `POST /api/routes` — cria rota (aceita `name`, `color`, `stops`, `path`, `anchors`, `schedule`, `active`)
- `PUT /api/routes/:id` — atualiza rota
- `DELETE /api/routes/:id` — remove rota
- `GET /api/buses` — lista ônibus ativos (agora com `plate`, `driverId` e `tripId`)

### REST — motorista

- `POST /api/driver/login` — `{ registration, password }` → `{ token, driver }`
- `GET /api/driver/me` — dados do motorista logado (header `Authorization: Bearer <token>`)
- `POST /api/driver/locations` — `{ tripId, points[] }` → `{ ok, received, saved }`
  Usada pelo app Android quando está em segundo plano. Depois de alguns minutos com a tela
  apagada o Android estrangula as requisições que saem da WebView, e o socket para de
  entregar; por isso o app troca para HTTP nativo, que não sofre esse limite. O servidor
  grava as posições e continua emitindo `bus:moved`, então o mapa não percebe diferença.

### REST — frota

- `GET /api/vehicles` — lista veículos (`?active=1` traz só os ativos)
- `POST /api/vehicles` — cria veículo `{ plate, model?, capacity?, active? }`
- `PUT /api/vehicles/:id` · `DELETE /api/vehicles/:id`
- `GET /api/drivers` — lista motoristas (sem a senha)
- `POST /api/drivers` — cria motorista `{ name, registration, password, phone? }`
- `PUT /api/drivers/:id` · `DELETE /api/drivers/:id`

### REST — histórico

- `GET /api/trips` — viagens (`?limit=`, `?driverId=`, `?vehicleId=`, `?routeId=`)
- `GET /api/trips/:id` — uma viagem
- `GET /api/trips/:id/locations` — todos os pontos de GPS gravados da viagem

### Socket.IO

**Servidor → cliente:**
- `init` — `{ routes, buses }` inicial
- `routes:updated` — rotas mudaram
- `buses:updated` — lista de ônibus mudou (conectou/desconectou)
- `bus:moved` — `{ busId, routeId, plate, lat, lng, speed, heading, lastUpdate }`

**Motorista → servidor** (todos respondem por ack):
- `driver:register` — `{ token, vehicleId, routeId, tripId? }` → `{ ok, bus, tripId }`
  Mandando `tripId` o servidor **retoma** a viagem em vez de abrir outra (usado na reconexão).
  O formato antigo `{ driverName, routeId }` continua valendo — é o que o simulador usa.
- `driver:location` — `{ lat, lng, speed, heading, accuracy?, recordedAt? }`
- `driver:location:batch` — array de posições guardadas offline → `{ ok, saved }`
- `driver:stop` — encerra a viagem no banco → `{ ok }`

Se a conexão cair, a viagem fica aberta por 90 s esperando o app voltar. Passado esse tempo,
ela é encerrada sozinha.

---

## 🔜 Próximos passos

1. **Persistir as rotas** — hoje só a frota, os motoristas e as posições ficam no banco
2. **Login do admin** — o painel ainda é aberto; só o app do motorista tem autenticação
3. **Assinar o APK para release** — o build atual é `debug`, bom para testes e instalação manual;
   para distribuir de verdade (ou publicar na Play Store) falta gerar a keystore e usar `assembleRelease`
4. **Migrar para PostgreSQL + PostGIS** — rotas como `LINESTRING`, paradas como `POINT`
5. **ETA por parada** — projeção sobre a polilinha em vez de haversine para a parada mais próxima
6. **Relatórios de viagem** — usar `trips` e `locations` para pontualidade e quilometragem
7. **PWA no site do usuário** — instalável no celular, com notificações push
8. **OSRM próprio** — hospedar instância dedicada para não depender do servidor demo público

---

## 💡 Observações de projeto

- **Rotas em memória**: reiniciar o backend volta ao exemplo padrão. Frota, motoristas e posições ficam no SQLite.
- **Viagens órfãs**: se o backend cair no meio de um percurso, na próxima inicialização essas viagens são fechadas com o horário do último ponto registrado.
- **CORS aberto**: configure o `origin` do Socket.IO em produção.
- **Senha do motorista**: guardada como hash scrypt, nunca em texto puro. O token de login vale 12 h e sobrevive a reinícios do backend (o segredo fica na tabela `settings`).
- **OSRM público**: o servidor demo tem rate limit (~1 req/s) e não deve ser usado em produção. O frontend tem fallback automático para linha reta se o OSRM falhar.
- **Suavização do movimento**: o simulador interpola entre waypoints para parecer natural. Um app real teria posições reais do GPS.

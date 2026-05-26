# 🚌 BusTrack — Rastreio de Ônibus em Tempo Real

Sistema completo de rastreio de ônibus em tempo real, com tema claro estilo Uber/Moovit e suporte a dark mode:

- **Backend** (Node.js + Express + Socket.IO) — API REST + WebSocket
- **Frontend Usuário** (React + Leaflet) — visualização do ônibus no mapa, ETA, próxima parada, timeline
- **Frontend Admin** (React + Leaflet) — cadastro de rotas com snap-to-roads (OSRM), horários, ações rápidas
- **Simulador de motorista** — HTML standalone que faz o ônibus se mover sem precisar de app real

---

## 📁 Estrutura

```
bustrack/
├── backend/              # Servidor Node.js (porta 3001)
├── frontend-user/        # Site do usuário (porta 5173)
├── frontend-admin/       # Painel admin (porta 5174)
└── driver-simulator.html # Simula o app do motorista
```

---

## 🚀 Subindo o sistema

Você vai precisar de **três terminais abertos** (um para cada serviço).

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

---

## 🧪 Testando com ônibus simulados

Como ainda não existe app real do motorista, o ônibus é simulado pelo arquivo `driver-simulator.html`. Ele se comporta como se fosse um motorista enviando GPS em tempo real para o backend via Socket.IO.

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

| Camada      | Tecnologia                                    |
|-------------|-----------------------------------------------|
| Backend     | Node.js, Express, Socket.IO                   |
| Frontend    | React 18, Vite, React-Leaflet                 |
| Mapa        | OpenStreetMap (tiles CARTO light_all / dark)  |
| Snap-roads  | OSRM público (`router.project-osrm.org`)      |
| Tempo real  | Socket.IO (WebSocket)                         |
| Armazenamento | Em memória (Map) — migrável para PostgreSQL + PostGIS |

---

## 📡 API

### REST

- `GET /api/routes` — lista rotas
- `POST /api/routes` — cria rota (aceita `name`, `color`, `stops`, `path`, `anchors`, `schedule`, `active`)
- `PUT /api/routes/:id` — atualiza rota
- `DELETE /api/routes/:id` — remove rota
- `GET /api/buses` — lista ônibus ativos

### Socket.IO

**Servidor → cliente:**
- `init` — `{ routes, buses }` inicial
- `routes:updated` — rotas mudaram
- `buses:updated` — lista de ônibus mudou (conectou/desconectou)
- `bus:moved` — `{ busId, routeId, lat, lng, speed, heading, lastUpdate }`

**Motorista (ou simulador) → servidor:**
- `driver:register` — `{ driverName, routeId, busId? }`
- `driver:location` — `{ lat, lng, speed, heading }`

---

## 🔜 Próximos passos

1. **App do motorista real** — React Native ou PWA com `navigator.geolocation.watchPosition` em background
2. **Persistência** — PostgreSQL + PostGIS (rotas como `LINESTRING`, paradas como `POINT`)
3. **Autenticação** — JWT para motoristas e admins
4. **ETA por parada** — projeção sobre a polilinha em vez de haversine para a parada mais próxima
5. **Histórico** — gravar trajetos completos para relatórios e análise de pontualidade
6. **PWA no site do usuário** — instalável no celular, com notificações push
7. **OSRM próprio** — hospedar instância dedicada para não depender do servidor demo público

---

## 💡 Observações de projeto

- **Estado em memória**: simples e rápido. Reiniciar o backend volta ao exemplo padrão. Para produção, plugue PostgreSQL.
- **CORS aberto**: configure o `origin` do Socket.IO em produção.
- **OSRM público**: o servidor demo tem rate limit (~1 req/s) e não deve ser usado em produção. O frontend tem fallback automático para linha reta se o OSRM falhar.
- **Suavização do movimento**: o simulador interpola entre waypoints para parecer natural. Um app real teria posições reais do GPS.

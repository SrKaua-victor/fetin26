// Gera o APK de debug em um passo só, funcionando tanto no cmd quanto no Git Bash.
//
// O script antigo terminava em `cd android && gradlew assembleDebug`. Sem extensão,
// `gradlew` só resolve no cmd.exe (que consulta o PATHEXT e o diretório atual), então
// no Git Bash o build morria logo depois do `cap sync`. Aqui o binário certo é
// escolhido pela plataforma.
//
// Para embutir outro endereço de servidor como padrão do app:
//   VITE_SERVER_URL=https://meu-servidor npm run build:apk

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "android");
const isWindows = process.platform === "win32";

function run(command, args, cwd) {
  const line = [command, ...args].join(" ");
  console.log(`\n▶ ${line}`);

  // No Windows o shell é obrigatório: o Node se recusa a executar .bat/.cmd direto.
  // Mas mandar `args` separado junto de shell:true dispara DEP0190 — o Node concatena
  // sem escapar. Então monta-se a linha inteira aqui (todos os argumentos são nossos,
  // e o único com espaços em potencial, o caminho do gradlew, já vai entre aspas).
  const { status } = isWindows
    ? spawnSync(line, { cwd, stdio: "inherit", shell: true })
    : spawnSync(command, args, { cwd, stdio: "inherit" });

  if (status !== 0) {
    console.error(`\n✖ falhou (código ${status}): ${line}`);
    process.exit(status ?? 1);
  }
}

run("npx", ["vite", "build"], root);
run("npx", ["cap", "sync", "android"], root);

// Caminho absoluto e entre aspas: chamado a partir do Git Bash, o cmd.exe herda
// NoDefaultCurrentDirectoryInExePath e deixa de procurar no diretório atual, então
// um "gradlew.bat" solto não é encontrado mesmo com o cwd certo.
const gradlew = isWindows ? `"${join(androidDir, "gradlew.bat")}"` : "./gradlew";

// --no-daemon de propósito: um daemon do Gradle em estado ruim já segurou este build
// por 21 minutos sem gastar CPU. Compilando assim leva ~30 s — não vale correr o risco.
run(gradlew, ["assembleDebug", "--no-daemon"], androidDir);

const apk = join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
if (!existsSync(apk)) {
  console.error(`\n✖ o build passou mas o APK não apareceu em ${apk}`);
  process.exit(1);
}

const mb = (statSync(apk).size / 1024 / 1024).toFixed(1);
console.log(`\n✔ APK gerado (${mb} MB): ${apk}`);
console.log("  Com o backend rodando, ele fica disponível em /bustrack.apk");

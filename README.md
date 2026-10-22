# NEXO Lab — Arena Red × Blue

Laboratório local de segurança ofensiva e defensiva. Dois perfis agênticos em confronto: o **VERMELHO** opera no máximo (injeção de prompt, jailbreak, exfiltração, flood, fuzzing, estresse de memória) e o **AZUL** aprende a cada derrota (detecção, contenção, endurecimento, auditoria SHA-256).

## Recursos

- **Arena de confronto** — rodadas de 60s com integridade do sistema, placar, banner de fim de rodada
- **Dois modos** — Teste de Prompt (ataques a LLM) e Estresse Extremo (carga, fuzzing, exaustão)
- **Terminal duplo** — console do Azul (defesa) e do Vermelho (ofensiva), com doutrinas separadas
- **Comandos reais no Termux** — servidor Node zero-dependência (`server/servidor.mjs`) com whitelist de 36+ comandos (scan, ping, nmap, mem, ps, pkg, dpkg…) e gate determinístico anti-injeção
- **Chat com os perfis** — personas que leem o estado da simulação; o vermelho em postura ofensiva ataca de verdade a partir da conversa
- **System prompts editáveis** por agente, criação de novos agentes, exportar/importar configuração
- **Sandbox isolada** + explicador de comandos (anatomia, flags, selo de risco)
- **Catálogo NEXO** — 620 comandos reais pesquisáveis
- **Instalador de Kali Linux** no Termux via proot-distro (`install-kali-termux.sh`)

## Rodando

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # build de produção em dist/
npm run serve      # dashboard + API LLM em http://localhost:8080
npm run mcp        # servidor MCP stdio do NEXO Lab
```

Durante o desenvolvimento, rode `npm run api` e `npm run dev` em terminais separados. O Vite encaminha `/api` para a porta 8080.

## Gateway de LLMs

O chat aceita provedores locais e remotos por uma interface única:

- **Codex CLI** — `codex exec` efêmero, JSONL e sandbox somente leitura.
- **Hermes CLI** — consulta one-shot em modo silencioso.
- **Ollama** — API nativa em `127.0.0.1:11434`, com descoberta dos modelos instalados.
- **llama.cpp** — API OpenAI-compatible; padrão `127.0.0.1:8081/v1`.
- **Gemini CLI** — modo headless, sem aprovação automática de ferramentas.
- **Antigravity CLI** — comando `agy` em modo headless e sandbox.
- **9Router** — API OpenAI-compatible local em `127.0.0.1:20128/v1`.
- **NVIDIA API/NIM** — `https://integrate.api.nvidia.com/v1`.

Copie `.env.example` para `.env` apenas se precisar alterar URLs, modelos padrão ou fornecer chaves. `.env` está ignorado pelo Git e as chaves nunca são enviadas ao frontend.

### API HTTP

| Rota | Função |
|---|---|
| `GET /api/llm/providers` | Estado e configuração de todos os provedores |
| `GET /api/llm/models?provider=ollama` | Descoberta de modelos |
| `POST /api/llm/chat` | Chat com streaming SSE e cancelamento ao desconectar |
| `GET /api/skills` | Lista skills instaladas no projeto |
| `POST /api/skills/search` | Busca skills no catálogo skills.sh |
| `POST /api/skills/install` | Instala `owner/repo@skill` para Codex |
| `POST /api/skills/uninstall` | Remove uma skill instalada |

Corpo mínimo de chat:

```json
{
  "provider": "ollama",
  "model": "qwen3.5:4b",
  "messages": [{ "role": "user", "content": "Olá" }]
}
```

### MCP

O servidor MCP expõe as ferramentas `nexo_providers`, `nexo_models` e `nexo_chat`. Use `mcp.json.example` como configuração de cliente ou execute `npm run mcp`. O transporte é stdio e os logs do servidor web nunca são misturados ao protocolo.

## Skills no chat

O comando `/skills` abre a ajuda. Use `/skills buscar react`, `/skills lista`, `/skills instalar owner/repo@skill` e `/skills desinstalar nome`. A busca usa a CLI `skills` via `npx`; confira a origem e as permissões antes de instalar uma skill. A skill `find-skills` está incluída em `.agents/skills` para uso no projeto. É necessário ter Node.js e npm instalados para pesquisar e gerenciar skills.

## Versão desktop (Electron)

A edição desktop fica separada da versão web em `electron/`, com seu próprio `package.json` e lockfile. No Windows, gere o instalador depois do build web:

```powershell
npm install
npm run build
npm --prefix electron install
npm --prefix electron run dist
```

O arquivo gerado é `electron/release/NEXO-Lab-Desktop-Setup-1.5.0.exe`. O instalador NSIS cria atalhos na Área de Trabalho e no menu Iniciar. O desinstalador acompanha a instalação e aparece em **Configurações > Aplicativos > Aplicativos instalados** do Windows. Os dados das skills instaladas pela edição desktop ficam na pasta do aplicativo em `%APPDATA%`, separada do repositório. Para usar `/skills` no desktop, Node.js e npm precisam estar no PATH.

O ícone próprio está em `electron/assets/nexo-icon.png` e `.ico`; os tamanhos para navegador/PWA estão em `public/`.

No Android (Termux):

```bash
node server/servidor.mjs 8080   # serve dist/ + API real /api/exec
bash install-kali-termux.sh     # instala o Kali (arena do vermelho)
```

## Regras de engajamento

Simulação 100% local. Ataques SOMENTE contra alvos do laboratório (DVWA, nexo-mcp, containers da arena). O vermelho é forte, mas joga dentro da arena autorizada.

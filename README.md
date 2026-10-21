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
```

No Android (Termux):

```bash
node server/servidor.mjs 8080   # serve dist/ + API real /api/exec
bash install-kali-termux.sh     # instala o Kali (arena do vermelho)
```

## Regras de engajamento

Simulação 100% local. Ataques SOMENTE contra alvos do laboratório (DVWA, nexo-mcp, containers da arena). O vermelho é forte, mas joga dentro da arena autorizada.

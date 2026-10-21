#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# NEXO Lab — Instalador do Kali Linux no Termux (Android)
#
# Método: proot-distro (oficial, SEM ROOT)
# O Kali roda em container proot dentro do Termux — isolado,
# sem tocar no sistema Android. Ideal para o laboratório.
#
# Uso:
#   bash install-kali-termux.sh            # instalação completa
#   bash install-kali-termux.sh --min      # só o sistema base
#   bash install-kali-termux.sh --login    # entra no Kali
#   bash install-kali-termux.sh --remove   # remove o Kali
# ============================================================
set -e

RED='\033[0;31m'; BLU='\033[0;34m'; GRN='\033[0;32m'; YEL='\033[1;33m'; NC='\033[0m'
say()  { echo -e "${GRN}[NEXO]${NC} $*"; }
warn() { echo -e "${YEL}[!]${NC} $*"; }
err()  { echo -e "${RED}[ERRO]${NC} $*"; }

banner() {
cat <<'EOF'
╔══════════════════════════════════════════════════╗
║   NEXO Lab :: KALI LINUX no Termux (proot)       ║
║   vermelho forte · azul aprende · sem root       ║
╚══════════════════════════════════════════════════╝
EOF
}

# ---------- checagens ----------
check_env() {
  if [ ! -d "/data/data/com.termux" ]; then
    err "Este script roda DENTRO do Termux no Android."
    err "No PC: instale o Termux (F-Droid) e rode lá dentro."
    exit 1
  fi
  if ! command -v pkg >/dev/null 2>&1; then
    err "pkg não encontrado — ambiente Termux inválido."
    exit 1
  fi
  # espaço livre: Kali base ~1.2 GB, com tools ~3 GB
  FREE=$(df -m "$HOME" | awk 'NR==2{print $4}')
  if [ "${FREE:-0}" -lt 2500 ]; then
    warn "Espaço livre: ${FREE} MB — recomendado ≥ 2.5 GB. Continuando por sua conta."
  else
    say "Espaço livre: ${FREE} MB — ok"
  fi
}

# ---------- etapas ----------
install_base() {
  say "Atualizando pacotes do Termux…"
  pkg update -y && pkg upgrade -y
  say "Instalando proot-distro e utilitários…"
  pkg install -y proot-distro wget curl nano
}

install_kali() {
  if proot-distro list 2>/dev/null | grep -q 'kali.*installed\|Installed.*kali' || \
     proot-distro list 2>/dev/null | grep -qi 'kali'; then
    if [ -d "$PREFIX/var/lib/proot-distro/installed-rootfs/kali" ] || \
       [ -d "$PREFIX/var/lib/proot-distro/installed-rootfs/kali-minimal" ]; then
      warn "Kali já instalado. Use: bash $0 --login"
      return
    fi
  fi
  say "Baixando e instalando o Kali (rootfs oficial, ~1 GB)…"
  warn "Isso pode levar vários minutos dependendo da rede."
  proot-distro install kali || proot-distro install kali-minimal
  say "Kali instalado."
}

configure_kali() {
  say "Configurando o Kali (primeira execução)…"
  proot-distro login kali -- bash -c '
    set -e
    apt update -y
    apt install -y kali-linux-headless --fix-missing || apt install -y nmap netcat-traditional curl wget python3 git --fix-missing
    # ferramentas essenciais do laboratório (perfil vermelho)
    apt install -y nmap hydra sqlmap john hashcat dirb gobuster metasploit-framework --fix-missing || true
    echo "kali-nexo" > /etc/hostname
  ' || warn "Alguns pacotes falharam — rode de novo com: proot-distro login kali"
  say "Configuração concluída."
}

make_launcher() {
  say "Criando atalho 'kali' no Termux…"
  cat > "$PREFIX/bin/kali" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# entra no Kali com pastas do Termux montadas (storage incluso)
exec proot-distro login kali --shared-tmp -- bash -l
EOF
  chmod +x "$PREFIX/bin/kali"
  say "Atalho pronto: digite 'kali' no Termux para entrar."
}

usage_hint() {
cat <<EOF

${GRN}════════════════ KALI PRONTO ════════════════${NC}
  Entrar no Kali:     ${YEL}kali${NC}
  Sair do Kali:       ${YEL}exit${NC}

  Dentro do Kali (arena do VERMELHO):
    nmap -F <alvo-lab>        recon
    hydra -l admin -P wl ...  brute force
    sqlmap -u <url-lab>       SQLi
    msfconsole                Metasploit

${BLU}Regras de engajamento NEXO Lab:${NC}
  · Ataques SOMENTE contra alvos do laboratório
    (DVWA, nexo-mcp, containers da arena Docker)
  · Nada de alvos externos — o vermelho é forte,
    mas joga dentro da arena autorizada.
${GRN}═════════════════════════════════════════════${NC}
EOF
}

# ---------- main ----------
banner
case "${1:-}" in
  --login)
    exec proot-distro login kali --shared-tmp -- bash -l
    ;;
  --remove)
    warn "Removendo o Kali…"
    proot-distro reset kali 2>/dev/null || true
    proot-distro remove kali 2>/dev/null || true
    say "Kali removido."
    ;;
  --min)
    check_env; install_base; install_kali; make_launcher; usage_hint
    ;;
  *)
    check_env; install_base; install_kali; configure_kali; make_launcher; usage_hint
    ;;
esac

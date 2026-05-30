# MURUS Backend 🛡️

O **MURUS** é um ecossistema de galeria virtual em nuvem privada focado em autonomia, privacidade total (self-hosted) e velocidade, projetado como uma alternativa própria e segura ao Google Photos ou iCloud.

Esta API gerencia o upload estruturado e a listagem de mídias salvos diretamente no armazenamento físico do servidor doméstico.

---

## 🏗️ Arquitetura e Infraestrutura

A API opera de forma integrada sob uma infraestrutura de rede sobreposta, garantindo que nenhum tráfego fique exposto à internet pública:

* **SO:** Ubuntu Server 24.04 LTS (Dedicated Headless Host).
* **Rede VPN Mesh:** Baseada em **Tailscale (WireGuard)**, permitindo o endereçamento fixo via IP `100.x.x.x` e contornando barreiras de CGNAT/IP dinâmico sem abertura de portas no roteador (*port-forwarding*).
* **Armazenamento:** Volume de massa dedicado em um cartão SD de 1TB formatado em **EXT4**, montado permanentemente.
* **Hardening de Segurança:** Firewall (UFW) restritivo aceitando conexões SSH e tráfego estritamente via interface virtual `tailscale0`, login direto do usuário `root` desativado e atualizações de segurança autônomas em segundo plano.

---

## 🛠️ Funcionalidades Atuais (MVP)

* **Gerenciador de Upload:** Endpoint do tipo `POST /media/upload` que intercepta arquivos via Multer, valida e os organiza de forma automatizada em subpastas baseadas na data atual (`ANO/MÊS/`) com hash exclusivo UUID para evitar duplicidades.
* **Serviço de Varredura (Scanner):** Endpoint do tipo `GET /media/list` que realiza uma varredura profunda e recursiva no sistema de arquivos do disco, ignorando resíduos ocultos de sistema (como *Thumbs.db*) e devolvendo um payload JSON estruturado contendo os metadados necessários para renderizar a grade no aplicativo móvel.

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
* Node.js (v24 ou superior)
* NPM

### Instalação de Dependências
```bash
$ npm install
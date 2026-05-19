# ADA Lovelace - Master Context & Memory

## 📌 Estado Atual do Projeto
Bot Node.js integrado via `whatsapp-web.js` e `Linear SDK`, utilizando `Gemini 2.5 Flash` para inteligência multimodal.

## 🚀 Funcionalidades Implementadas
- [x] **Criação Multimodal:** Cria Issues e Projetos a partir de texto, áudio e imagem.
- [x] **Decomposição de Projetos:** Cria um projeto e gera automaticamente 3-5 sub-tarefas iniciais.
- [x] **Gestão de Projetos:** Listagem de projetos ativos e arquivamento (cancelamento) via chat.
- [x] **Personalidade ADA:** Respostas profissionais, início com "ADA:" e tom prestativo.
- [x] **Filtro de Lixo:** Não cria tarefas para agradecimentos, testes ou mensagens vagas.
- [x] **Segurança:** Apenas chats privados (DMs).

## 🛠️ Infraestrutura
- **VM:** Google Cloud (`n8n-az-acessorios`)
- **Processo:** PM2 (`linear-whatsapp-bot`)
- **Repositório:** `https://github.com/marcospr3421/linear-whatsapp-bot`

## 🧠 Próximos Passos (Roadmap de Evolução)
1. **Busca Avançada:** Consultar status de issues e buscar por palavras-chave.
2. **Edição via Chat:** Mudar prioridade, status (Done/In Progress) e atribuir responsáveis.
3. **Webhooks (Notificações):** Fazer o Linear avisar no WhatsApp quando algo mudar.
4. **Relatórios:** Resumos semanais de produtividade.

## 🔑 Configurações Críticas
- Usa o modelo `gemini-2.5-flash`.
- Memória de curto prazo de 10 mensagens por sessão.
- Ignora grupos para evitar spam.

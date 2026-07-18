# 🍔 LASSE Food

O **LASSE Food** é um sistema web responsivo e moderno desenvolvido para facilitar os pedidos de comida na padaria para os membros do laboratório **LASSE**. 

Como não há opções de comida muito próximas, o sistema resolve o problema clássico: um aluno vai até a padaria, tira uma foto da vitrine/balcão, os outros membros montam seus carrinhos e o sistema consolida tudo em um único pedido para quem está lá comprar, mostrando os valores individuais e a chave PIX para acerto (baseado em confiança).

---

## 🎨 Design & Estilo
O site foi construído sob uma identidade **Premium Dark Gourmet/Tech fusion**:
* Fundo escuro profundo com efeitos de vidro (glassmorphism) e bordas translúcidas.
* Acentos em gradiente âmbar/laranja e elementos dinâmicos.
* Layout 100% responsivo (otimizado para celulares dos estudantes e desktops para o administrador).

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
Certifique-se de ter o **Node.js** instalado na máquina que servirá como servidor do laboratório.

### Instalação
1. Instale as dependências do projeto:
   ```bash
   npm install
   ```

### Executando em Desenvolvimento
Para rodar com hot-reload local:
```bash
npm run dev
```
O site estará acessível localmente em `http://localhost:3000`.

### Executando em Produção (Recomendado)
Para melhor desempenho e otimização dos recursos:
```bash
npm run build
npm start
```

---

## 🌐 Acesso na Rede Local (LAB)
Como o app roda em um único servidor no laboratório, qualquer pessoa na mesma rede Wi-Fi/cabo pode acessar pelo celular ou computador:
1. No computador servidor, descubra o endereço IP local (exemplo no Linux):
   ```bash
   hostname -I
   # Exemplo de saída: 192.168.1.50
   ```
2. Compartilhe o link com a galera do laboratório:
   ```text
   http://<IP_DO_SERVIDOR>:3000
   # Exemplo: http://192.168.1.50:3000
   ```

---

## ⚙️ Configurações Iniciais & Credenciais
* **PIN de Administrador Padrão**: `1234`
* **Chave PIX Padrão**: `lasse@ufpa.br`

> [!NOTE]
> Você pode alterar tanto o **PIN de Administrador** quanto a **Chave PIX** diretamente pela interface na aba de **Configurações** do Painel Admin. As configurações são salvas localmente no banco de dados SQLite (`database.sqlite`).

---

## 📋 Funcionalidades

### 👤 Para o Usuário (Alunos)
1. **Ver a Vitrine**: Visualiza a foto real do balcão da padaria que o administrador postou.
2. **Montar Carrinho**: Adiciona produtos cadastrados, ajusta quantidades e vê o valor parcial acumulado.
3. **Enviar Pedido**: Insere o próprio nome (sem precisar criar conta) e envia o pedido.
4. **Instruções de Pagamento**: O sistema mostra o resumo do pedido com o valor exato a ser transferido e a chave PIX do administrador (com botão de cópia rápida).

### 🔑 Para o Administrador (Quem vai à padaria)
1. **Login Rápido**: Acesso protegido por PIN na barra superior (ícone de engrenagem ⚙️).
2. **Atualização da Vitrine**: Faz upload direto de fotos tiradas com o celular, que são salvas no servidor local.
3. **Gestão de Cardápio**: Cadastro dinâmico e remoção rápida de itens e preços.
4. **Geração de Pedido Consolidado**:
   * **Consolidação Automática**: Um clique junta os pedidos de todos os alunos em uma lista somada (ex: `5x Coxinha`, `3x Pão de Queijo`).
   * **Cópia Rápida**: Botão para copiar o texto formatado e enviar diretamente no WhatsApp da padaria ou de quem for comprar.
   * **Acerto Individual**: Tabela com os nomes dos alunos que pediram, os itens de cada um e o subtotal para conferência do PIX.
5. **Reiniciar Rodada**: Botão para arquivar a rodada atual e limpar a lista para os pedidos do dia seguinte.

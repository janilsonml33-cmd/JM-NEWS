# JM NEWS no Netlify — portal + editor

Portal público: `/`  ·  Editor (só você, com senha): `/admin`

## Como colocar no ar (precisa de GitHub; arrastar pasta NÃO roda as funções)
1. Crie um repositório no GitHub e envie TODOS estes arquivos, mantendo as pastas.
2. No Netlify: Add new site > Import an existing project > escolha o repositório.
   (Build command: vazio. Publish directory e funções já vêm do netlify.toml.)
3. Em Site configuration > Environment variables, crie:
   - ADMIN_PASSWORD = a senha que você vai usar para entrar no editor
   - SESSION_SECRET = texto aleatório longo (40+ caracteres), diferente da senha
4. Faça o deploy. Abra https://SEU-SITE.netlify.app/admin, entre com a senha.
5. Na primeira vez, clique em "Carregar matérias iniciais" e depois em "Salvar tudo".

## Uso diário
No /admin: crie/edite a matéria, envie a imagem, escolha Estado = Publicado e clique em "Salvar tudo".
A matéria aparece no portal na hora. Rascunhos nunca aparecem para o público.

## Segurança
- Só quem tem a senha grava (verificação no servidor). Sessão expira em 8 horas.
- O público só recebe matérias publicadas. Rascunhos ficam no servidor.
- Imagens: apenas jpeg/png/webp até 4 MB. Textos são escapados na exibição.
- Troque a senha em Environment variables quando quiser (e faça novo deploy).

## Limites e avisos
- Não foi possível testar o deploy no Netlify a partir daqui; a lógica da API foi testada com armazenamento simulado.
- Dados e imagens ficam no Netlify Blobs: confira os limites do seu plano no Netlify.
- O site antigo (criado por arrastar arquivo) não aceita Git: crie um site novo e, depois, mude o nome/domínio se quiser manter jmnews.netlify.app.

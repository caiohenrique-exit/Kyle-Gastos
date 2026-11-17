# Controle de Gastos - versão nativa para iPhone (Expo)

Este projeto é um app nativo que abre a versão publicada do Controle de Gastos dentro de uma janela própria, sem a barra do navegador. Os dados continuam salvos no próprio iPhone.

## O que já está pronto

- `App.js`: abre o endereço do app e mostra um carregamento enquanto a página carrega.
- `app.json`: nome, ícone e identificador do app (`com.caio.controlegastos`).
- `eas.json`: configuração para gerar o arquivo de instalação na nuvem do Expo.
- `assets/icon.png`: ícone do app, a partir da sua logo.

## O que ainda falta para gerar o arquivo

Este código não foi compilado nem testado no iPhone. Para gerar o arquivo de instalação, você precisa:

1. Ter Node.js instalado no computador.
2. Criar uma conta gratuita no Expo (expo.dev).
3. Ter a conta paga de desenvolvedor da Apple (US$ 99 por ano), porque o build para aparelho real exige essa conta.

## Passos (no PowerShell, dentro da pasta do projeto)

```powershell
npm install
npx eas login
npx eas build -p ios --profile preview
```

Quando o build terminar, o Expo mostra um link para instalar no iPhone pelo próprio celular. Para instalar no iPhone da sua esposa, o aparelho dela precisa ser cadastrado na sua conta de desenvolvedor da Apple antes do build.

## Atualizações

Como o app abre o endereço publicado, quando eu atualizar o site, o app mostra a versão nova sem precisar gerar outro arquivo. Só é preciso gerar um novo build se mudar algo nativo (ícone, nome ou permissões).

## Gerar o arquivo pelo GitHub (sem Mac e sem pagar a Apple)

O projeto tem um workflow em `.github/workflows/build-ios.yml` que compila o app num computador macOS do GitHub e gera um arquivo `.ipa` sem assinatura. Esse arquivo depois é instalado no iPhone com o AltStore ou o Sideloadly, usando o seu Apple ID comum.

1. Crie um repositório novo no GitHub (github.com/new), por exemplo `controle-gastos-expo`.
2. Extraia o zip e envie todos os arquivos para o repositório, incluindo a pasta `.github`. Pode arrastar a pasta pelo navegador na página do repositório.
3. Abra a aba **Actions**, escolha **Build iOS (IPA sem assinatura)** e clique em **Run workflow**.
4. Espere terminar (costuma levar 15 a 30 minutos). Se der erro, copie o log e me envie.
5. Quando terminar, abra a execução e baixe o arquivo **ControleGastos-ipa** na parte de Artifacts. Ele vem em zip, com o `.ipa` dentro.
6. Instale no iPhone com o AltStore ou o Sideloadly, usando seu Apple ID comum.

Limitações:
- O app instalado com Apple ID comum expira a cada 7 dias e precisa ser reinstalado.
- Cada Apple ID mantém no máximo 3 apps desse tipo.
- Repositórios públicos usam os minutos do GitHub Actions sem custo. Em repositórios privados, o uso de macOS consome minutos do plano gratuito mais rápido, então o público é mais simples.

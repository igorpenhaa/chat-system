# Testes de Performance - gRPC vs JSON

Scripts para testar e comparar a performance entre as versões gRPC e JSON da aplicação de chat.

## Pré-requisitos

```bash
cd performanceTests
npm install
```

## Como Executar os Testes

### 1. Teste da Versão gRPC (Original)

Siga as instruções do README principal para rodar a versão gRPC, após isso:

```bash
cd performanceTests
npm run test:grpc
```

### 2. Teste da Versão JSON

```bash
# Parar todos os serviços da versão gRPC (Ctrl+C em todos os terminais)

# Rodar versão JSON
cd comparisonJSON
docker compose up -d

# Executar teste
cd ../performanceTests
npm run test:json
```

### 3. Gerar Relatório Comparativo

```bash
npm run generate-report
```

## Cenários de Teste

### Cenário A - Single User
- 1 usuário
- 100 mensagens sequenciais
- Intervalo de 100ms entre mensagens

### Cenário B - Multiple Users
- Testes com 10, 25, 50, 100 usuários simultâneos
- 20 mensagens por usuário
- Intervalo de 50ms entre mensagens

## Arquivos Gerados

- `results/grpc-results.json` - Resultados detalhados do gRPC
- `results/json-results.json` - Resultados detalhados do JSON
- `results/comparison.csv` - Dados em formato CSV
- `results/performance-report.md` - Relatório final com análise

## Configuração

Edite `config.js` para ajustar:
- Número de mensagens por cenário
- Intervalo entre requisições
- Timeout das requisições
- Mensagens de teste (permitidas/bloqueadas)

## Observações

- Execute os testes em uma máquina sem outras cargas pesadas
- Aguarde alguns segundos entre trocar versões para estabilizar
- Os testes fazem warm-up automático
- Resultados podem variar entre execuções - execute múltiplas vezes para maior precisão

## Troubleshooting

**Erro "ECONNREFUSED":**
- Verifique se a aplicação está rodando em http://localhost:8080
- Aguarde alguns segundos após iniciar os serviços

**Timeout errors:**
- Aumente o valor `TIMEOUT` em config.js
- Verifique se não há sobrecarga no sistema

**Resultados inconsistentes:**
- Execute os testes múltiplas vezes
- Feche outros programas pesados
- Use a média de várias execuções
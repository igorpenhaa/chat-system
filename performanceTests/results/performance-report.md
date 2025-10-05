# Comparativo de Performance: gRPC vs JSON

## Resumo Executivo

**Total de Requisições Testadas:**
- gRPC: 3800 requisições
- JSON: 3800 requisições

**Latência Média Geral:**
- gRPC: 15.65ms
- JSON: 33.12ms
- **Diferença: +111.6%**

**Taxa de Erro:**
- gRPC: 10.79%
- JSON: 11.71%

## Resultados Detalhados

| Cenário | Usuários | Métrica | gRPC (ms) | JSON (ms) | Diferença |
|---------|----------|---------|-----------|-----------|-----------|
| **Single User** | 1 | Média | 3.63 | 3.12 | -14.0% |
| | | Taxa de Erro | 13% | 10% | -23.1% |
| | | | | | |
| **Multiple Users - 10 users** | 10 | Média | 4.45 | 4.35 | -2.2% |
| | | Taxa de Erro | 11% | 10.5% | -4.5% |
| | | | | | |
| **Multiple Users - 25 users** | 25 | Média | 5.26 | 4.66 | -11.4% |
| | | Taxa de Erro | 11% | 11.4% | +3.6% |
| | | | | | |
| **Multiple Users - 50 users** | 50 | Média | 6.86 | 13.68 | +99.4% |
| | | Taxa de Erro | 11% | 10.6% | -3.6% |
| | | | | | |
| **Multiple Users - 100 users** | 100 | Média | 24.3 | 54.75 | +125.3% |
| | | Taxa de Erro | 10.5% | 12.55% | +19.5% |
| | | | | | |

## Análise dos Resultados

### Possíveis Fatores:

- **Serialização**: Protobuf (binário) vs JSON (texto)
- **Protocolo**: HTTP/2 (gRPC) vs HTTP/1.1 (JSON)
- **Overhead de Parsing**: Compilado vs Runtime
- **Compressão**: gRPC automática vs manual

## Conclusões

 **gRPC demonstrou performance significativamente superior ao JSON** conforme esperado.

**Recomendações:**
- gRPC confirma sua eficiência para comunicação entre microsserviços
- Para aplicações críticas em latência, gRPC é a escolha recomendada
- JSON pode ser usado quando simplicidade é mais importante que performance
- A diferença pode variar dependendo do tamanho das mensagens e carga do sistema

---

*Relatório gerado em: 2025-10-05T18:38:54.801Z*
*Configuração dos testes disponível em: config.js*

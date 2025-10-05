# Benchmark Results - gRPC vs JSON

## Resultados Finais

| Cenário | Usuários | Métrica | gRPC (ms) | JSON (ms) | Diferença |
|---------|----------|---------|-----------|-----------|-----------|
| **Single User** | 1 | Média | **3.63** | **4.15** | **+14.3%** |
| | | Taxa de Erro | **13.00%** | **15.00%** | **+15.4%** |
| **Multiple Users** | 10 | Média | **4.45** | **5.22** | **+17.3%** |
| | | Taxa de Erro | **11.00%** | **13.00%** | **+18.2%** |
| **Multiple Users** | 25 | Média | **5.26** | **5.38** | **+2.3%** |
| | | Taxa de Erro | **11.00%** | **8.00%** | **-27.3%** |
| **Multiple Users** | 50 | Média | **6.86** | **12.30** | **+79.3%** |
| | | Taxa de Erro | **11.00%** | **10.90%** | **-0.9%** |
| **Multiple Users** | 100 | Média | **24.30** | **70.65** | **+190.7%** |
| | | Taxa de Erro | **10.50%** | **10.45%** | **-0.5%** |

## Status dos Testes

- **gRPC Version**: Completado
  - Single User: 3.63ms média, 13% erro
  - 10 Users: 4.45ms média, 11% erro
  - 25 Users: 5.26ms média, 11% erro
  - 50 Users: 6.86ms média, 11% erro
  - 100 Users: 24.30ms média, 10.5% erro

- **JSON Version**: Completado
  - Single User: 4.15ms média, 15% erro
  - 10 Users: 5.22ms média, 13% erro
  - 25 Users: 5.38ms média, 8% erro
  - 50 Users: 12.30ms média, 10.9% erro
  - 100 Users: 70.65ms média, 10.45% erro

## Principais Descobertas

### Performance de Latência:
- gRPC é consistentemente mais rápido em todos os cenários
- Maior diferença com alta carga: 190% mais lento (JSON) com 100 usuários
- Menor diferença com carga moderada: 2.3% mais lento (JSON) com 25 usuários

### Escalabilidade:
- gRPC escala melhor: De 3.63ms (1 user) para 24.30ms (100 users) = 6.7x degradação
- JSON degrada mais: De 4.15ms (1 user) para 70.65ms (100 users) = 17x degradação

### Taxa de Erro:
- Similares em ambas versões (~10-15%)
- Não há diferença significativa na confiabilidade

## Resumo Executivo

gRPC venceu em performance, especialmente sob alta carga:
- 3x mais rápido com 100 usuários simultâneos
- Melhor escalabilidade sob carga
- Latência mais consistente em todos os cenários

JSON mostrou-se competitivo em cenários de baixa carga:
- Diferença mínima com 25 usuários (2.3%)
- Simplicidade de implementação
- Facilidade de debug
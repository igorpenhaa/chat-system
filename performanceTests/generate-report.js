const fs = require('fs').promises;
const config = require('./config');

class ReportGenerator {
  constructor() {
    this.grpcResults = null;
    this.jsonResults = null;
  }

  async loadResults() {
    try {
      const grpcData = await fs.readFile(config.RESULTS.grpc, 'utf8');
      this.grpcResults = JSON.parse(grpcData);
      console.log('Resultados gRPC carregados');
    } catch (error) {
      console.log('Não foi possível carregar resultados gRPC:', error.message);
    }

    try {
      const jsonData = await fs.readFile(config.RESULTS.json, 'utf8');
      this.jsonResults = JSON.parse(jsonData);
      console.log('Resultados JSON carregados');
    } catch (error) {
      console.log('Não foi possível carregar resultados JSON:', error.message);
    }

    if (!this.grpcResults || !this.jsonResults) {
      throw new Error('Missing results files. Run tests first.');
    }
  }

  calculateDifference(grpcValue, jsonValue) {
    if (grpcValue === 0) return 'N/A';
    const diff = ((jsonValue - grpcValue) / grpcValue) * 100;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}%`;
  }

  generateMarkdownTable() {
    const table = [];

    // Header
    table.push('| Cenário | Usuários | Métrica | gRPC (ms) | JSON (ms) | Diferença |');
    table.push('|---------|----------|---------|-----------|-----------|-----------|');

    // Process each scenario
    this.grpcResults.results.forEach((grpcScenario, index) => {
      const jsonScenario = this.jsonResults.results[index];

      if (!jsonScenario) return;

      const scenarioName = grpcScenario.name;
      const users = grpcScenario.users;

      // Add rows for different metrics
      const metrics = [
        { name: 'Média', grpcVal: grpcScenario.summary.latency.mean, jsonVal: jsonScenario.summary.latency.mean }
      ];

      metrics.forEach((metric, metricIndex) => {
        const difference = this.calculateDifference(metric.grpcVal, metric.jsonVal);
        const scenarioDisplay = metricIndex === 0 ? `**${scenarioName}**` : '';
        const usersDisplay = metricIndex === 0 ? users : '';

        table.push(`| ${scenarioDisplay} | ${usersDisplay} | ${metric.name} | ${metric.grpcVal} | ${metric.jsonVal} | ${difference} |`);
      });

      // Add error rate comparison
      const grpcErrorRate = parseFloat(grpcScenario.summary.errorRate);
      const jsonErrorRate = parseFloat(jsonScenario.summary.errorRate);
      const errorDiff = this.calculateDifference(grpcErrorRate, jsonErrorRate);

      table.push(`| | | Taxa de Erro | ${grpcErrorRate}% | ${jsonErrorRate}% | ${errorDiff} |`);
      table.push('| | | | | | |'); // Empty row for spacing
    });

    return table.join('\n');
  }

  generateSummaryStats() {
    const summary = {
      grpc: { totalRequests: 0, totalLatency: 0, totalErrors: 0 },
      json: { totalRequests: 0, totalLatency: 0, totalErrors: 0 }
    };

    // Aggregate all scenarios
    this.grpcResults.results.forEach(scenario => {
      summary.grpc.totalRequests += scenario.summary.totalRequests;
      summary.grpc.totalLatency += scenario.summary.latency.mean * scenario.summary.successfulRequests;
      summary.grpc.totalErrors += scenario.summary.errors;
    });

    this.jsonResults.results.forEach(scenario => {
      summary.json.totalRequests += scenario.summary.totalRequests;
      summary.json.totalLatency += scenario.summary.latency.mean * scenario.summary.successfulRequests;
      summary.json.totalErrors += scenario.summary.errors;
    });

    // Calculate averages
    const grpcAvgLatency = summary.grpc.totalLatency / (summary.grpc.totalRequests - summary.grpc.totalErrors);
    const jsonAvgLatency = summary.json.totalLatency / (summary.json.totalRequests - summary.json.totalErrors);

    const grpcErrorRate = (summary.grpc.totalErrors / summary.grpc.totalRequests) * 100;
    const jsonErrorRate = (summary.json.totalErrors / summary.json.totalRequests) * 100;

    return {
      grpc: {
        avgLatency: grpcAvgLatency.toFixed(2),
        errorRate: grpcErrorRate.toFixed(2),
        totalRequests: summary.grpc.totalRequests
      },
      json: {
        avgLatency: jsonAvgLatency.toFixed(2),
        errorRate: jsonErrorRate.toFixed(2),
        totalRequests: summary.json.totalRequests
      },
      improvement: this.calculateDifference(grpcAvgLatency, jsonAvgLatency)
    };
  }

  generateFullReport() {
    const summary = this.generateSummaryStats();
    const table = this.generateMarkdownTable();

    return `# Comparativo de Performance: gRPC vs JSON

## Resumo Executivo

**Total de Requisições Testadas:**
- gRPC: ${summary.grpc.totalRequests} requisições
- JSON: ${summary.json.totalRequests} requisições

**Latência Média Geral:**
- gRPC: ${summary.grpc.avgLatency}ms
- JSON: ${summary.json.avgLatency}ms
- **Diferença: ${summary.improvement}**

**Taxa de Erro:**
- gRPC: ${summary.grpc.errorRate}%
- JSON: ${summary.json.errorRate}%

## Resultados Detalhados

${table}

## Análise dos Resultados

### Possíveis Fatores:

- **Serialização**: Protobuf (binário) vs JSON (texto)
- **Protocolo**: HTTP/2 (gRPC) vs HTTP/1.1 (JSON)
- **Overhead de Parsing**: Compilado vs Runtime
- **Compressão**: gRPC automática vs manual

## Conclusões

${this.generateConclusions(summary)}

---

*Relatório gerado em: ${new Date().toISOString()}*
*Configuração dos testes disponível em: config.js*
`;
  }

  generateConclusions(summary) {
    const latencyDiff = parseFloat(summary.improvement.replace(/[+\-%]/g, ''));
    const isJsonFaster = !summary.improvement.startsWith('+');

    let conclusions = [];

    if (isJsonFaster) {
      if (latencyDiff > 20) {
        conclusions.push(' **JSON demonstrou performance significativamente superior ao gRPC** neste cenário específico.');
      } else if (latencyDiff > 10) {
        conclusions.push(' **JSON apresentou melhor performance que gRPC** com diferença moderada.');
      } else {
        conclusions.push(' **Performance similar entre JSON e gRPC** com leve vantagem para JSON.');
      }
    } else {
      if (latencyDiff > 20) {
        conclusions.push(' **gRPC demonstrou performance significativamente superior ao JSON** conforme esperado.');
      } else if (latencyDiff > 10) {
        conclusions.push(' **gRPC apresentou melhor performance que JSON** com diferença moderada.');
      } else {
        conclusions.push(' **Performance similar entre gRPC e JSON** com leve vantagem para gRPC.');
      }
    }

    conclusions.push('');
    conclusions.push('**Recomendações:**');

    if (isJsonFaster) {
      conclusions.push('- Para este tipo de aplicação, JSON/HTTP pode ser uma alternativa viável ao gRPC');
      conclusions.push('- Considere JSON para prototipagem rápida e debuging mais fácil');
      conclusions.push('- gRPC ainda pode ser preferível para sistemas com alta carga e streaming');
    } else {
      conclusions.push('- gRPC confirma sua eficiência para comunicação entre microsserviços');
      conclusions.push('- Para aplicações críticas em latência, gRPC é a escolha recomendada');
      conclusions.push('- JSON pode ser usado quando simplicidade é mais importante que performance');
    }

    conclusions.push('- A diferença pode variar dependendo do tamanho das mensagens e carga do sistema');

    return conclusions.join('\n');
  }

  async saveCSV() {
    const csvLines = ['Scenario,Users,Metric,gRPC,JSON,Difference'];

    this.grpcResults.results.forEach((grpcScenario, index) => {
      const jsonScenario = this.jsonResults.results[index];
      if (!jsonScenario) return;

      const baseData = `${grpcScenario.name},${grpcScenario.users}`;

      csvLines.push(`${baseData},Mean,${grpcScenario.summary.latency.mean},${jsonScenario.summary.latency.mean},${this.calculateDifference(grpcScenario.summary.latency.mean, jsonScenario.summary.latency.mean)}`);
    });

    await fs.writeFile(config.RESULTS.comparison, csvLines.join('\n'));
    console.log(`CSV salvo em ${config.RESULTS.comparison}`);
  }
}

async function main() {
  console.log('Gerando Relatório Comparativo de Performance...\n');

  const generator = new ReportGenerator();

  try {
    await generator.loadResults();

    const report = generator.generateFullReport();
    await fs.writeFile('./results/performance-report.md', report);
    console.log('Relatório salvo em ./results/performance-report.md');

    await generator.saveCSV();

    console.log('\nGeração de relatório concluída!');

  } catch (error) {
    console.error('Falha na geração do relatório:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ReportGenerator;
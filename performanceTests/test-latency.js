const fetch = require('node-fetch');
const fs = require('fs').promises;
const config = require('./config');

class LatencyTester {
  constructor() {
    this.results = [];
  }

  getRandomMessage() {
    const { allowed, blocked } = config.TEST_MESSAGES;
    const allMessages = [...allowed, ...allowed, ...allowed, ...allowed, ...blocked];
    return allMessages[Math.floor(Math.random() * allMessages.length)];
  }

  async testSingleMessage(username, forumCode) {
    const message = this.getRandomMessage();
    const payload = {
      username,
      forumCode,
      content: message
    };

    const startTime = performance.now();

    try {
      const response = await fetch(`${config.API_BASE_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeout: config.TIMEOUT
      });

      const endTime = performance.now();
      const latency = endTime - startTime;

      return {
        latency,
        success: response.ok,
        status: response.status,
        message: message,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        latency: endTime - startTime,
        success: false,
        error: error.message,
        message: message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async warmup() {
    console.log(`Warmup com ${config.WARMUP_REQUESTS} requisições...`);

    for (let i = 0; i < config.WARMUP_REQUESTS; i++) {
      await this.testSingleMessage('warmup_user', 'warmup_forum');
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('Warmup concluído');
  }

  async runScenarioA() {
    console.log(`\nExecutando Cenário A: Single User (${config.SCENARIO_A.messagesPerUser} mensagens)`);

    const results = [];
    const username = 'test_user_1';
    const forumCode = 'performance_test_forum';

    for (let i = 0; i < config.SCENARIO_A.messagesPerUser; i++) {
      const result = await this.testSingleMessage(username, forumCode);
      results.push(result);

      if (i % 10 === 0) {
        console.log(`  Progresso: ${i + 1}/${config.SCENARIO_A.messagesPerUser}`);
      }

      await new Promise(resolve => setTimeout(resolve, config.SCENARIO_A.delayBetweenMessages));
    }

    return {
      scenario: 'A',
      name: config.SCENARIO_A.name,
      users: 1,
      totalMessages: results.length,
      results: results,
      summary: this.calculateStats(results)
    };
  }

  async runScenarioB(userCount) {
    console.log(`\nExecutando Cenário B: ${userCount} Usuários (${config.SCENARIO_B.messagesPerUser} mensagens cada)`);

    const allResults = [];
    const promises = [];

    for (let userId = 1; userId <= userCount; userId++) {
      const userPromise = this.runUserMessages(userId, config.SCENARIO_B.messagesPerUser);
      promises.push(userPromise);
    }

    const userResults = await Promise.all(promises);
    userResults.forEach(userResult => {
      allResults.push(...userResult);
    });

    return {
      scenario: 'B',
      name: `${config.SCENARIO_B.name} - ${userCount} users`,
      users: userCount,
      totalMessages: allResults.length,
      results: allResults,
      summary: this.calculateStats(allResults)
    };
  }

  async runUserMessages(userId, messageCount) {
    const results = [];
    const username = `test_user_${userId}`;
    const forumCode = 'performance_test_forum';

    for (let i = 0; i < messageCount; i++) {
      const result = await this.testSingleMessage(username, forumCode);
      results.push({
        ...result,
        userId
      });

      await new Promise(resolve => setTimeout(resolve, config.SCENARIO_B.delayBetweenMessages));
    }

    return results;
  }

  calculateStats(results) {
    const latencies = results.filter(r => r.success).map(r => r.latency);
    const errors = results.filter(r => !r.success);

    if (latencies.length === 0) {
      return {
        totalRequests: results.length,
        successfulRequests: 0,
        errorRate: 100,
        errors: errors.length
      };
    }

    latencies.sort((a, b) => a - b);

    const sum = latencies.reduce((a, b) => a + b, 0);
    const mean = sum / latencies.length;
    const median = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const min = latencies[0];
    const max = latencies[latencies.length - 1];

    return {
      totalRequests: results.length,
      successfulRequests: latencies.length,
      errorRate: ((errors.length / results.length) * 100).toFixed(2),
      latency: {
        mean: parseFloat(mean.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        p95: parseFloat(p95.toFixed(2)),
        p99: parseFloat(p99.toFixed(2))
      },
      errors: errors.length
    };
  }

  async runAllTests() {
    console.log('Iniciando Testes de Performance\n');
    const testResults = [];

    await this.warmup();

    const scenarioA = await this.runScenarioA();
    testResults.push(scenarioA);
    console.log(`Cenário A concluído: ${scenarioA.summary.latency.mean}ms latência média`);

    for (const userCount of config.SCENARIO_B.userCounts) {
      const scenarioB = await this.runScenarioB(userCount);
      testResults.push(scenarioB);
      console.log(`Cenário B (${userCount} usuários) concluído: ${scenarioB.summary.latency.mean}ms latência média`);
    }

    return {
      timestamp: new Date().toISOString(),
      config: config,
      results: testResults
    };
  }

  async saveResults(results, filename) {
    await fs.writeFile(filename, JSON.stringify(results, null, 2));
    console.log(`Resultados salvos em ${filename}`);
  }
}

async function main() {
  const version = process.argv[2];

  if (!version || !['grpc', 'json'].includes(version)) {
    console.error('Uso: node test-latency.js [grpc|json]');
    process.exit(1);
  }

  console.log(`\nTestando versão ${version.toUpperCase()}\n`);
  console.log('Certifique-se de que a aplicação está rodando em http://localhost:8080');
  console.log('Pressione Ctrl+C para cancelar, ou aguarde 5 segundos para iniciar...');

  await new Promise(resolve => setTimeout(resolve, 5000));

  const tester = new LatencyTester();

  try {
    const results = await tester.runAllTests();
    const filename = version === 'grpc' ? config.RESULTS.grpc : config.RESULTS.json;
    await tester.saveResults(results, filename);

    console.log('\nTeste de performance concluído com sucesso!');
    console.log(`Resumo para ${version.toUpperCase()}:`);

    results.results.forEach(scenario => {
      console.log(`  ${scenario.name}: ${scenario.summary.latency.mean}ms média, ${scenario.summary.errorRate}% erros`);
    });

  } catch (error) {
    console.error('Teste falhou:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LatencyTester;
// Configuração para testes de performance

module.exports = {
  API_BASE_URL: 'http://localhost:8080/api',
  SCENARIO_A: {
    name: 'Single User',
    users: 1,
    messagesPerUser: 100,
    delayBetweenMessages: 100
  },

  SCENARIO_B: {
    name: 'Multiple Users',
    userCounts: [10, 25, 50, 100],
    messagesPerUser: 20,
    delayBetweenMessages: 50
  },
  TEST_MESSAGES: {
    allowed: [
      'Hello world',
      'Como vai?',
      'Teste de mensagem normal',
      'Bom dia pessoal',
      'Esta é uma mensagem permitida',
      'Oi como estão?',
      'Mensagem de teste',
      'Olá galera'
    ],
    blocked: [
      'spam test message',
      'ofensa aqui',
      'flamengo ganhou',
      'spam spam spam'
    ]
  },

  WARMUP_REQUESTS: 10,
  TEST_RUNS: 3,
  TIMEOUT: 10000,
  RESULTS: {
    grpc: './results/grpc-results.json',
    json: './results/json-results.json',
    comparison: './results/comparison.csv'
  }
};
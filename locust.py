from locust import HttpUser, task, between
import random

BANNED_WORDS = ["spam", "ofensa", "flamengo"]
NORMAL_MESSAGES = [
    "Olá tudo bem?", 
    "Testando sistema", 
    "Alguém online?", 
    "Kubernetes é legal", 
    "C++ é rápido"
]
FORUMS = ["sala-geral", "sala-tech", "sala-ajuda"]


class ChatUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """
        Executado quando o usuário inicia.
        Gera nome e entra em um fórum (POST /api/forum/join)
        """
        self.username = f"user_{random.randint(1000, 9999)}"
        self.forum_code = random.choice(FORUMS)

        # JSON manual em uma linha (compatível com seu servidor C++)
        body = f'{{"username":"{self.username}","forumCode":"{self.forum_code}"}}'

        self.client.post(
            "/api/forum/join",
            headers={"Content-Type": "application/json"},
            data=body,
            name="/api/forum/join"
        )

    @task(3)
    def ler_mensagens(self):
        """
        GET /api/messages (polling)
        """
        self.client.get(
            "/api/messages",
            params={"forumCode": self.forum_code},
            name="/api/messages (Polling)"
        )

    @task(1)
    def enviar_mensagem(self):
        """
        POST /api/messages/send
        20% das mensagens são proibidas para testar o filtro
        """

        # Define conteúdo e status esperado
        if random.random() < 0.2:
            content = f"Eu gosto de {random.choice(BANNED_WORDS)} de propósito."
            expected_status = 400
        else:
            content = random.choice(NORMAL_MESSAGES)
            expected_status = 200

        payload = {
            "username": self.username,
            "forumCode": self.forum_code,
            "content": content,
        }

        # Envio correto, usando JSON puro sem multiline
        with self.client.post(
            "/api/messages/send",
            json=payload,
            name="/api/messages/send",
            catch_response=True
        ) as response:

            code = response.status_code

            # Caso esperado: tudo OK
            if code == expected_status:
                response.success()
                return

            # Erros específicos de validação
            if code == 400 and expected_status == 200:
                response.failure(f"Mensagem normal bloqueada! Conteúdo: {content}")
                return

            if code == 200 and expected_status == 400:
                response.failure(f"FALHA DE SEGURANÇA! Mensagem proibida passou: {content}")
                return

            # Erro genérico
            response.failure(f"Erro inesperado {code}: {response.text}")

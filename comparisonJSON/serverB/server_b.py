from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

BANNED_WORDS = ["spam", "ofensa", "flamengo"]

@app.route('/check', methods=['POST'])
def check_message():
    try:
        data = request.get_json()
        text = (data.get('text', '') or "").lower()

        for w in BANNED_WORDS:
            if w in text:
                print(f"Mensagem bloqueada, contém '{w}'!")
                return jsonify({
                    "allowed": False,
                    "reason": f"Contém '{w}'"
                })

        return jsonify({
            "allowed": True,
            "reason": "OK"
        })

    except Exception as e:
        print(f"Error processing request: {e}")
        return jsonify({
            "allowed": False,
            "reason": "Error processing message"
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    print("Server B (checker) running on port 3002")
    app.run(host='0.0.0.0', port=3002, debug=False)
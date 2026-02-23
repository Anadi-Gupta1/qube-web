from http.server import BaseHTTPRequestHandler
import json
import random

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        # Read request body
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        payload = json.loads(body)

        # Extract data from payload
        alice_bits = payload.get('bits', [])
        alice_bases = payload.get('bases', [])
        eavesdropper_active = payload.get('eavesdropperActive', False)

        # Bob generates random bases
        bob_bases = [random.choice(['X', '+']) for _ in alice_bits]

        # Simulate quantum measurement
        received_states = []
        for i, bit in enumerate(alice_bits):
            if alice_bases[i] == bob_bases[i]:
                # Same basis: Bob gets the correct bit
                if eavesdropper_active and random.random() < 0.25:
                    # Eve's eavesdropping causes errors
                    received_states.append(1 - bit)
                else:
                    received_states.append(bit)
            else:
                # Different basis: Random outcome (marked as -1 for incompatible)
                received_states.append(-1)

        # Send response
        response = {
            'received_states': received_states,
            'bob_bases': bob_bases
        }
        self.wfile.write(json.dumps(response).encode())

    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

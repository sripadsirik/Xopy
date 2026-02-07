import json
import requests

payload = {
    "machine_id": "M-01",
    "type": "L",
    "air_temp_k": 300,
    "process_temp_k": 310,
    "rpm": 1500,
    "torque_nm": 40,
    "tool_wear_min": 120
}

resp = requests.post("http://127.0.0.1:8000/predict", json=payload, timeout=10)
print("status:", resp.status_code)
print(json.dumps(resp.json(), indent=2))

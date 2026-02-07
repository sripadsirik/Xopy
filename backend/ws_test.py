import asyncio
import json
import websockets

async def main():
    uri = "ws://127.0.0.1:8000/ws/live"
    async with websockets.connect(uri) as ws:
        print(" connected to", uri)
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print(" got event:", data["machine_id"], data["prediction"]["failure_prob"], data["decision"]["action"])

asyncio.run(main())

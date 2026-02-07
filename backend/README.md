cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train/train_models.py
uvicorn app.main:app --reload --port 8000

UPDATE: My fault I rotated the key so we chill
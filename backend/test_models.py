import joblib
import pandas as pd

# load model
fail_model = joblib.load("models/fail_model.joblib")
type_model = joblib.load("models/type_model.joblib")

# fake example input
sample = pd.DataFrame([{
    "Type": "L",
    "Air temperature [K]": 300,
    "Process temperature [K]": 310,
    "Rotational speed [rpm]": 1500,
    "Torque [Nm]": 40,
    "Tool wear [min]": 120,
    "Temp delta [K]": 10
}])

p_fail = fail_model.predict_proba(sample)[0][1]
failure_type = type_model.predict(sample)[0]

print("Failure probability:", p_fail)
print("Predicted failure type:", failure_type)

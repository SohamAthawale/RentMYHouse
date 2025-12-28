import joblib
import numpy as np
import pandas as pd
from pathlib import Path
# =================================================
# LOAD MODEL
# =================================================
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "analytics" / "models" / "mumbai_rent_model.joblib"
model = joblib.load(MODEL_PATH)
MAE = 11335  # from training


# =================================================
# LOCALITY UTILITIES
# =================================================

MUMBAI_LOCALITIES = [
    "Andheri", "Bandra", "Borivali", "Malad", "Goregaon",
    "Kandivali", "Juhu", "Santacruz", "Vile Parle",
    "Powai", "Kurla", "Chembur", "Ghatkopar",
    "Dadar", "Matunga", "Worli", "Lower Parel",
    "Colaba", "Byculla", "Mulund", "Thane"
]


def extract_locality(address: str):
    if not address:
        return "Other"

    address = address.lower()

    for loc in MUMBAI_LOCALITIES:
        if loc.lower() in address:
            return loc

    return "Other"


# =================================================
# MAIN PREDICTION FUNCTION
# =================================================

def predict_rent_logic(data: dict):
    """
    Core ML prediction logic.
    Returns (response_dict, status_code)
    """

    required_fields = [
        "bedrooms", "bathrooms", "area_sqft",
        "furnishing", "property_type"
    ]

    for field in required_fields:
        if field not in data:
            return {
                "status": "fail",
                "message": f"Missing field: {field}"
            }, 400

    try:
        bedrooms = int(data["bedrooms"])
        bathrooms = int(data["bathrooms"])
        area_sqft = float(data["area_sqft"])
    except ValueError:
        return {
            "status": "fail",
            "message": "Invalid numeric input"
        }, 400

    if bedrooms < 1:
        return {"status": "fail", "message": "Bedrooms must be ≥ 1"}, 400

    if area_sqft < 450:
        return {"status": "fail", "message": "Area too small for apartment"}, 400

    # -------------------------------------------------
    # LOCALITY
    # -------------------------------------------------

    if "address" in data:
        locality = extract_locality(data.get("address"))
    else:
        locality = data.get("locality", "Other")

    if locality not in MUMBAI_LOCALITIES:
        locality = "Other"

    # -------------------------------------------------
    # MODEL INPUT
    # -------------------------------------------------

    model_input = pd.DataFrame([{
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "area_sqft": area_sqft,
        "furnishing": data["furnishing"],
        "property_type": data["property_type"],
        "locality": locality
    }])

    log_pred = model.predict(model_input)
    predicted_rent = int(np.expm1(log_pred)[0])

    return {
        "status": "success",
        "predicted_rent": predicted_rent,
        "confidence_range": f"₹{predicted_rent - MAE} – ₹{predicted_rent + MAE}",
        "locality_used": locality
    }, 200

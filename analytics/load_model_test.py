import joblib
import numpy as np
import pandas as pd

model = joblib.load("analytics/models/mumbai_rent_model.joblib")

sample = pd.DataFrame([{
    "bedrooms": 2,
    "bathrooms": 2,
    "area_sqft": 750,
    "furnishing": "Semi-Furnished",
    "property_type": "Apartment",
    "locality": "Andheri"
}])

pred_log = model.predict(sample)
pred_rent = int(np.expm1(pred_log)[0])

print("Predicted rent:", pred_rent)

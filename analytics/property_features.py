import pandas as pd
import numpy as np
import re

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error


# =================================================
# 1️⃣ LOAD DATA
# =================================================

df = pd.read_csv("/Users/sohamathawale/Downloads/Mumbai_House_Rent.csv")

print("✅ Raw data loaded")
print(df.head())
print(df.columns)


# =================================================
# 2️⃣ RENAME COLUMNS
# =================================================

df = df.rename(columns={
    "Rent/Month": "rent",
    "Bathrooms": "bathrooms",
    "Furnishing": "furnishing",
    "Carpet_area(sq.ft)": "carpet_area",
    "Build_up_area(sq.ft)": "builtup_area",
    "Type": "type",
    "Locality": "raw_locality"
})


# =================================================
# 3️⃣ NORMALIZE FURNISHING
# =================================================

df["furnishing"] = df["furnishing"].astype(str).str.strip().str.title()

df["furnishing"] = df["furnishing"].replace({
    "Missing": "Unfurnished",
    "Semi Furnished": "Semi-Furnished",
    "Fully Furnished": "Fully-Furnished",
    "Nan": "Unfurnished"
})

df["furnishing"] = df["furnishing"].fillna("Unfurnished")


# =================================================
# 3️⃣.5️⃣ LOCALITY NORMALIZATION + MERGING
# =================================================

def normalize_locality(val):
    if pd.isna(val):
        return "Unknown"

    val = str(val).lower()
    val = re.sub(r"\d+", "", val)
    val = re.sub(r"[^a-z\s]", "", val)
    val = re.sub(r"\s+", " ", val).strip()

    return val.title()


def merge_locality(loc):
    """
    Merge East / West / sub-pockets into parent Mumbai localities
    """
    loc = loc.lower()

    if "andheri" in loc:
        return "Andheri"
    if "goregaon" in loc:
        return "Goregaon"
    if "malad" in loc:
        return "Malad"
    if "jogeshwari" in loc:
        return "Jogeshwari"
    if "kandarpada" in loc or "borivali" in loc:
        return "Borivali"
    if "kurla" in loc:
        return "Kurla"
    if "powai" in loc:
        return "Powai"
    if "bandra" in loc:
        return "Bandra"
    if "khar" in loc:
        return "Khar"
    if "juhu" in loc:
        return "Juhu"
    if "dadar" in loc:
        return "Dadar"
    if "worli" in loc:
        return "Worli"
    if "prabhadevi" in loc:
        return "Prabhadevi"
    if "chembur" in loc:
        return "Chembur"
    if "bhandup" in loc:
        return "Bhandup"

    return loc.title()


df["locality"] = df["raw_locality"].apply(normalize_locality)
df["locality"] = df["locality"].apply(merge_locality)

# Reduce cardinality (ML stability)
top_localities = df["locality"].value_counts()
valid_localities = top_localities[top_localities >= 40].index

df["locality"] = df["locality"].where(
    df["locality"].isin(valid_localities),
    "Other"
)

print("✅ Locality processed")
print(df["locality"].value_counts().head(10))


# =================================================
# 4️⃣ HELPER PARSERS
# =================================================

def parse_int(val):
    if pd.isna(val):
        return np.nan
    digits = re.sub(r"[^\d]", "", str(val))
    return int(digits) if digits else np.nan


def parse_area(val):
    if pd.isna(val):
        return np.nan
    digits = re.sub(r"[^\d]", "", str(val))
    return float(digits) if digits else np.nan


# =================================================
# 5️⃣ FIX NUMERIC COLUMNS
# =================================================

df["rent"] = pd.to_numeric(df["rent"], errors="coerce")
df["bathrooms"] = df["bathrooms"].apply(parse_int)
df["carpet_area"] = df["carpet_area"].apply(parse_area)
df["builtup_area"] = df["builtup_area"].apply(parse_area)


# =================================================
# 6️⃣ BEDROOMS & PROPERTY TYPE
# =================================================

def extract_bedrooms(val):
    match = re.search(r"(\d+)\s*(RK|BHK)", str(val))
    return int(match.group(1)) if match else np.nan


def extract_property_type(val):
    val = str(val)
    if "Villa" in val:
        return "Villa"
    return "Apartment"   # RK / Studio excluded


df["bedrooms"] = df["type"].apply(extract_bedrooms)
df["property_type"] = df["type"].apply(extract_property_type)


# =================================================
# 7️⃣ AREA SELECTION
# =================================================

df["area_sqft"] = df["carpet_area"].fillna(df["builtup_area"])


# =================================================
# 8️⃣ DROP ESSENTIAL NULLS
# =================================================

df = df.dropna(subset=["rent", "bedrooms", "bathrooms", "area_sqft", "locality"])

df = df[df["rent"] > 0]
df = df[df["area_sqft"] > 300]

print("Rows before constraints:", len(df))


# =================================================
# 9️⃣ DOMAIN CONSTRAINTS (MUMBAI)
# =================================================

# Area vs bedrooms
df = df[
    ((df["bedrooms"] == 1) & (df["area_sqft"] >= 450)) |
    ((df["bedrooms"] >= 2) & (df["area_sqft"] >= df["bedrooms"] * 350))
]

# Rent sanity bounds
df = df[df["rent"] >= df["area_sqft"] * 8]
df = df[df["rent"] <= df["area_sqft"] * 150]

# Villa rule
df = df[~((df["property_type"] == "Villa") & (df["bedrooms"] < 2))]

print("Rows after constraints:", len(df))


# =================================================
# 🔟 FEATURE SET
# =================================================

features = df[[
    "rent",
    "bedrooms",
    "bathrooms",
    "area_sqft",
    "furnishing",
    "property_type",
    "locality"
]]

print("✅ Final feature sample")
print(features.head())

if len(features) < 500:
    raise ValueError("❌ Dataset too small after cleaning")


# =================================================
# 1️⃣1️⃣ MODEL TRAINING (LOG RENT)
# =================================================

X = features.drop("rent", axis=1)
y = np.log1p(features["rent"])   # 🔥 LOG TRANSFORM

preprocessor = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"),
     ["furnishing", "property_type", "locality"]),
    ("num", "passthrough",
     ["bedrooms", "bathrooms", "area_sqft"])
])

model = Pipeline([
    ("preprocessor", preprocessor),
    ("regressor", RandomForestRegressor(
        n_estimators=350,
        max_depth=18,
        random_state=42,
        n_jobs=-1
    ))
])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("🚀 Training model...")
model.fit(X_train, y_train)

log_preds = model.predict(X_test)
preds = np.expm1(log_preds)        # 🔥 INVERSE TRANSFORM
actuals = np.expm1(y_test)

mae = mean_absolute_error(actuals, preds)

print(f"✅ Model trained | MAE: ₹{int(mae)}")


# =================================================
# 1️⃣2️⃣ FEATURE IMPORTANCE
# =================================================

rf = model.named_steps["regressor"]
ohe = model.named_steps["preprocessor"].named_transformers_["cat"]

feature_names = (
    list(ohe.get_feature_names_out(
        ["furnishing", "property_type", "locality"]
    )) +
    ["bedrooms", "bathrooms", "area_sqft"]
)

importances = pd.Series(rf.feature_importances_, index=feature_names)

print("\n📊 Top Feature Importances:")
print(importances.sort_values(ascending=False).head(10))

sample = pd.DataFrame([{
    "bedrooms": 2,
    "bathrooms": 2,
    "area_sqft": 750,
    "furnishing": "Semi-Furnished",
    "property_type": "Apartment",
    "locality": "Andheri"
}])

pred_log = model.predict(sample)
pred_rent = np.expm1(pred_log)

print("Predicted rent:", int(pred_rent[0]))

import joblib
joblib.dump(model, "/Users/sohamathawale/Downloads/mumbai_rent_model.joblib")



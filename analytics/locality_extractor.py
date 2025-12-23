MUMBAI_LOCALITIES = [
    "Andheri", "Bandra", "Borivali", "Malad", "Goregaon",
    "Kandivali", "Juhu", "Santacruz", "Vile Parle",
    "Powai", "Kurla", "Chembur", "Ghatkopar",
    "Dadar", "Matunga", "Worli", "Lower Parel",
    "Colaba", "Byculla", "Mulund", "Thane"
]

def extract_locality(address: str):
    if not address:
        return "Unknown"

    address = address.lower()

    for loc in MUMBAI_LOCALITIES:
        if loc.lower() in address:
            return loc

    return "Other"

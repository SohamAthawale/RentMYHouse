import os
import json
import smtplib
import random
from datetime import datetime
from email.mime.text import MIMEText

# ---------- EMAIL CONFIG ----------
SENDER_EMAIL = "rentmyhouseco@gmail.com"  # replace with your Gmail
SENDER_PASSWORD = "tetr smma xirk hfzc"  # generated from Gmail (App Password)

# ---------- OTP AND EMAIL ----------
def generate_otp():
    return str(random.randint(100000, 999999))

def send_assignment_email(tenant_email, tenant_name, flat_info, otp):
    subject = "🏠 Flat Assignment Confirmation - RentMyHouse"
    body = (
        f"Hello {tenant_name},\n\n"
        f"You have been assigned the following flat:\n"
        f"Title: {flat_info['title']}\n"
        f"Address: {flat_info['address']}\n"
        f"Rent: {flat_info['rent']}\n\n"
        f"To confirm this assignment, please enter the following OTP:\n"
        f"OTP: {otp}\n\n"
        f"If this wasn't you, ignore this message.\n\n"
        f"Best,\nRentMyHouse Team"
    )

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL
    msg["To"] = tenant_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"\n❌ Failed to send email: {e}")
        return False

# ---------- FLAT CREATION ----------
def create_flat_listing(user_unique_id):
    listings_dir = os.path.join("users", user_unique_id, "listings")
    os.makedirs(listings_dir, exist_ok=True)

    title = input("Enter flat title: ")
    address = input("Enter flat address: ")
    rent = input("Enter monthly rent: ")

    listing = {
        "title": title,
        "address": address,
        "rent": rent,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "rented_to": None
    }

    listing_num = len(os.listdir(listings_dir)) + 1
    listing_file = os.path.join(listings_dir, f"flat_{listing_num}.json")

    with open(listing_file, "w") as f:
        json.dump(listing, f, indent=4)

    print(f"\n✅ Flat '{title}' listed successfully.")

# ---------- FLAT & TENANT MANAGEMENT ----------
def get_existing_listings(user_unique_id):
    listings_dir = os.path.join("users", user_unique_id, "listings")
    if not os.path.exists(listings_dir):
        return []

    listings = []
    for fname in os.listdir(listings_dir):
        if fname.endswith(".json"):
            with open(os.path.join(listings_dir, fname)) as f:
                data = json.load(f)
                listings.append((fname, data))
    return listings

def load_unrented_tenants():
    path = "tenants_unrented.json"
    if not os.path.exists(path):
        return []

    with open(path, "r") as f:
        tenants = json.load(f)
        return [t for t in tenants if not t.get("currently_rented", False)]

def save_rented_tenant(tenant):
    rented_path = "tenants_rented.json"
    rented = []
    if os.path.exists(rented_path):
        with open(rented_path, "r") as f:
            rented = json.load(f)
    rented.append(tenant)
    with open(rented_path, "w") as f:
        json.dump(rented, f, indent=4)

def update_unrented_list(exclude_email):
    path = "tenants_unrented.json"
    with open(path, "r") as f:
        tenants = json.load(f)
    updated = [t for t in tenants if t["email"] != exclude_email]
    with open(path, "w") as f:
        json.dump(updated, f, indent=4)

# ---------- MAIN FLOW ----------
def rent_out_flat_flow(user_unique_id):
    listings = get_existing_listings(user_unique_id)
    if not listings:
        print("❌ No listings found.")
        return

    print("\nAvailable Flats:")
    for i, (file, listing) in enumerate(listings, start=1):
        rented = f"Rented to: {listing['rented_to']}" if listing.get("rented_to") else "Available"
        print(f"{i}. {listing['title']} - {listing['address']} ({rented})")

    flat_choice = input("Select a flat by number: ").strip()
    if not flat_choice.isdigit() or int(flat_choice) < 1 or int(flat_choice) > len(listings):
        print("❌ Invalid flat selection.")
        return

    flat_idx = int(flat_choice) - 1
    listing_file, listing_data = listings[flat_idx]

    if listing_data.get("rented_to"):
        print("⚠️ This flat is already rented.")
        return

    tenants = load_unrented_tenants()
    if not tenants:
        print("❌ No unrented tenants available.")
        return

    print("\nAvailable Tenants:")
    for i, t in enumerate(tenants, start=1):
        print(f"{i}. {t['username']} - {t['email']}")

    tenant_choice = input("Select a tenant by number: ").strip()
    if not tenant_choice.isdigit() or int(tenant_choice) < 1 or int(tenant_choice) > len(tenants):
        print("❌ Invalid tenant selection.")
        return

    tenant_idx = int(tenant_choice) - 1
    selected_tenant = tenants[tenant_idx]

    # 1. Send OTP
    otp = generate_otp()
    email_sent = send_assignment_email(
        tenant_email=selected_tenant["email"],
        tenant_name=selected_tenant["username"],
        flat_info=listing_data,
        otp=otp
    )

    if not email_sent:
        print("❌ Could not send confirmation email. Assignment cancelled.")
        return

    # 2. Confirm OTP
    print(f"\n📩 An OTP has been sent to {selected_tenant['email']}")
    for attempt in range(3):
        entered = input("Enter OTP to confirm assignment: ").strip()
        if entered == otp:
            selected_tenant["currently_rented"] = True
            listing_data["rented_to"] = selected_tenant["email"]

            # Save updated flat
            listings_dir = os.path.join("users", user_unique_id, "listings")
            with open(os.path.join(listings_dir, listing_file), "w") as f:
                json.dump(listing_data, f, indent=4)

            # Save tenant updates
            save_rented_tenant(selected_tenant)
            update_unrented_list(selected_tenant["email"])

            print(f"\n✅ Flat '{listing_data['title']}' rented to {selected_tenant['username']} ({selected_tenant['email']})")
            return
        else:
            print(f"❌ Incorrect OTP. Attempts left: {2 - attempt}")

    print("❌ OTP verification failed. Assignment not completed.")

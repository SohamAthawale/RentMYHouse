import uuid
import os
import json
import hashlib
import random
import smtplib
from email.mime.text import MIMEText
from ownerreqests import create_flat_listing , rent_out_flat_flow

# -------------------- EMAIL VERIFICATION SETUP --------------------
SENDER_EMAIL = "rentmyhouseco@gmail.com" # Replace with your Gmail address
SENDER_PASSWORD = "tetr smma xirk hfzc"  # Replace with App Password (from Google)

def generate_otp():
    return str(random.randint(100000, 999999))

def send_verification_email(receiver_email, otp):
    app_name = "RentMyHouse"  # ← Change this to your actual app name

    subject = f"[{app_name}] Email Verification OTP"
    body = (
        f"Hello,\n\n"
        f"You are signing up on {app_name}. To verify your email address, please use the OTP below:\n\n"
        f"OTP: {otp}\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"Regards,\n"
        f"{app_name} Team"
    )

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL
    msg["To"] = receiver_email

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        print("Failed to send verification email:", e)
        return False

def verify_email_flow(email):
    otp = generate_otp()
    if send_verification_email(email, otp):
        print(f"An OTP has been sent to {email}")
        for attempt in range(3):
            entered = input("Enter the OTP: ").strip()
            if entered == otp:
                print("Email verified successfully.")
                return True
            else:
                print(f"Incorrect OTP. Attempts left: {2 - attempt}")
    print("Email verification failed.")
    return False

# -------------------- PASSWORD HASHING --------------------

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# -------------------- CHECK IF USER EXISTS --------------------

def user_exists(email):
    users_dir = "users"
    if os.path.exists(users_dir):
        for folder in os.listdir(users_dir):
            info_path = os.path.join(users_dir, folder, "info.json")
            if os.path.exists(info_path):
                with open(info_path, "r") as f:
                    user_data = json.load(f)
                    if user_data.get("email") == email:
                        return folder
    return None

# -------------------- SIGNUP --------------------

def signup(logintype, email):
    folder = user_exists(email)  # <<< FIXED LINE
    if folder:
        print("User already exists. Please login instead.")
        return

    if not verify_email_flow(email):  # <<< FIXED LINE
        print("Email verification failed. Signup cancelled.")
        return

    username = input("Set your username: ").strip()
    while True:
        password = input("Set your password: ").strip()
        confirm_password = input("Confirm your password: ").strip()
        if password == confirm_password:
            break
        print("Passwords do not match. Please try again.")

    unique_id = f"{logintype}-{username}-{uuid.uuid4().hex[:8]}"
    user_dir = os.path.join("users", unique_id)
    os.makedirs(user_dir, exist_ok=True)

    user_data = {
        "account_type": "Owner" if logintype == "0" else "Tenant",
        "email": email,
        "username": username,
        "unique_id": unique_id,
        "password_hash": hash_password(password)
    }

    # -------- TENANT SPECIFIC QUESTION --------
    if logintype == "1":
        rented_status = input("Are you currently renting a flat? (yes/no): ").strip().lower()
        user_data["currently_rented"] = rented_status == "yes"

        # Choose correct file
        tenant_file = "tenants_rented.json" if user_data["currently_rented"] else "tenants_unrented.json"
        if os.path.exists(tenant_file):
            with open(tenant_file, "r") as f:
                tenant_list = json.load(f)
        else:
            tenant_list = []

        tenant_list.append(user_data)
        with open(tenant_file, "w") as f:
            json.dump(tenant_list, f, indent=4)

    # -------- Save user in their own directory --------
    with open(os.path.join(user_dir, "info.json"), "w") as f:
        json.dump(user_data, f, indent=4)

    # -------- Update global users.json --------
    users_json = "users.json"
    if os.path.exists(users_json):
        with open(users_json, "r") as f:
            users = json.load(f)
    else:
        users = []

    users.append(user_data)
    with open(users_json, "w") as f:
        json.dump(users, f, indent=4)

    print(f"Sign up successful! Your unique ID is: {unique_id}")

# -------------------- LOGIN --------------------

def login(logintype, email):
    folder = user_exists(email)
    if not folder:
        print("User does not exist. Please sign up.")
        return None

    password = input("Password: ").strip()
    user_dir = os.path.join("users", folder)
    info_path = os.path.join(user_dir, "info.json")

    if os.path.exists(info_path):
        with open(info_path, "r") as f:
            user_data = json.load(f)
            if user_data.get("account_type") != ("Owner" if logintype == "0" else "Tenant"):
                print("Account type does not match.")
                return None
            if user_data.get("password_hash") == hash_password(password):
                print(f"Welcome back! Your unique ID is: {folder}")
                return folder

    print("Incorrect password or account type.")
    return None

# -------------------- MAIN PROMPT --------------------

def main():
    action = input("Do you want to Login or Sign Up? (login/signup): ").strip().lower()
    logintype = input("Account Type (0 for Owner, 1 for Tenant): ").strip()
    email = input("Email: ").strip()

    if logintype not in ["0", "1"]:
        print("Invalid account type.")
        return

    if action == "signup":
        signup(logintype, email)
    elif action == "login":
        user_unique_id = login(logintype, email)
        if user_unique_id:
            next_action = input("Do you want to add a new listing? (yes/no): ").strip().lower()
            if next_action == "yes":
                create_flat_listing(user_unique_id)
            else:
                rent_out_flat_flow(user_unique_id)

    else:
        print("Invalid action.")

if __name__ == "__main__":
    main()

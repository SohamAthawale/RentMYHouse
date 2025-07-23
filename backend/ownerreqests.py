import os
import json

def create_flat_listing(user_unique_id):
    user_dir = os.path.join("users", user_unique_id)
    if not os.path.exists(user_dir):
        print("User directory not found. Please login first.")
        return

    flat_title = input("Enter flat title: ")
    flat_address = input("Enter flat address: ")
    flat_rent = input("Enter monthly rent: ")
    flat_desc = input("Enter description: ")

    listing = {
        "title": flat_title,
        "address": flat_address,
        "rent": flat_rent,
        "description": flat_desc
    }

    # Save listing in user's folder, filename: flat_<n>.json
    listings_dir = os.path.join(user_dir, "listings")
    os.makedirs(listings_dir, exist_ok=True)
    listing_files = os.listdir(listings_dir)
    listing_num = len(listing_files) + 1
    listing_path = os.path.join(listings_dir, f"flat_{listing_num}.json")
    with open(listing_path, "w") as f:
        json.dump(listing, f, indent=4)

    print(f"Flat listing created: {listing_path}")
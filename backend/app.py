from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://rentadmin:222003@localhost/rentmyhouse'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ---------------------------- MODELS ----------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unique_id = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    username = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(10), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    contact_no = db.Column(db.String(15), nullable=False)
    currently_rented = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    owned_flats = db.relationship('Flat', foreign_keys='Flat.owner_id', backref='owner', lazy=True)
    rented_flats = db.relationship('Flat', foreign_keys='Flat.rented_to_id', backref='tenant', lazy=True)

class Flat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text, nullable=False)
    rent = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    rented_to_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

# ---------------------------- INITIALIZATION ----------------------------
@app.before_first_request
def create_tables():
    db.create_all()

# ---------------------------- ROUTES ----------------------------
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data['email']
    username = data['username']
    password = data['password']
    account_type = data['account_type']
    contact_no = data['contact_no']

    if User.query.filter_by(email=email).first():
        return jsonify({"status": "fail", "message": "User already exists"}), 409

    unique_id = f"{'0' if account_type == 'Owner' else '1'}-{username}-{str(datetime.utcnow().timestamp()).replace('.', '')[-8:]}"
    hashed_password = generate_password_hash(password)

    user = User(
        unique_id=unique_id,
        email=email,
        username=username,
        account_type=account_type,
        password_hash=hashed_password,
        contact_no=contact_no
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"status": "success", "user_id": unique_id})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    password = data['password']

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"status": "fail", "message": "Invalid credentials"}), 401

    return jsonify({"status": "success", "user_id": user.unique_id, "account_type": user.account_type})

@app.route('/create-flat', methods=['POST'])
def create_flat():
    data = request.get_json()
    owner_id = data['owner_id']
    title = data['title']
    address = data['address']
    rent = data['rent']

    owner = User.query.get(owner_id)
    if not owner or owner.account_type != 'Owner':
        return jsonify({"status": "fail", "message": "Invalid owner ID"}), 400

    flat = Flat(
        owner_id=owner.id,
        title=title,
        address=address,
        rent=rent
    )
    db.session.add(flat)
    db.session.commit()

    return jsonify({"status": "success", "flat_id": flat.id})

@app.route('/list-flats', methods=['GET'])
def list_flats():
    flats = Flat.query.all()
    result = []
    for flat in flats:
        result.append({
            "id": flat.id,
            "title": flat.title,
            "address": flat.address,
            "rent": str(flat.rent),
            "owner": flat.owner.username,
            "rented_to": flat.tenant.username if flat.tenant else None
        })
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

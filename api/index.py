import os
import uuid
from flask import Flask, request, jsonify
import pymongo

app = Flask(__name__)

MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "deerash_shop"

client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client[DB_NAME]

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

def verify_token(headers):
    auth_header = headers.get('Authorization', '')
    token = ''
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
    if not token:
        return False
    # Check session in MongoDB
    session = db.sessions.find_one({"token": token})
    return session is not None

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json() or {}
        username = data.get('username', '')
        password = data.get('password', '')
        
        owner_user = os.environ.get("OWNER_USERNAME", "admin")
        owner_pass = os.environ.get("OWNER_PASSWORD", "admin123")
        
        if username == owner_user and password == owner_pass:
            token = uuid.uuid4().hex
            # Store in MongoDB sessions collection
            db.sessions.insert_one({"token": token})
            return jsonify({"status": "success", "token": token}), 200
        else:
            return jsonify({"status": "error", "message": "Invalid username or password"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/state', methods=['GET', 'POST', 'OPTIONS'])
def state():
    if request.method == 'OPTIONS':
        return '', 200
        
    if not verify_token(request.headers):
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    if request.method == 'GET':
        try:
            items = list(db.items.find({}, {'_id': 0}))
            transactions = list(db.transactions.find({}, {'_id': 0}))
            companies = list(db.companies.find({}, {'_id': 0}))
            shop = db.shop.find_one({}, {'_id': 0})
            
            state_data = {
                "items": items,
                "transactions": transactions,
                "companies": companies,
                "shop": shop
            }
            
            is_empty = len(items) == 0 and len(transactions) == 0 and len(companies) == 0 and shop is None
            
            return jsonify({
                "status": "success",
                "state": state_data if not is_empty else None
            }), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
            
    elif request.method == 'POST':
        try:
            data = request.get_json() or {}
            state_data = data.get('state', {})
            
            # Save items
            db.items.delete_many({})
            items = state_data.get('items', [])
            if items:
                db.items.insert_many(items)
            
            # Save transactions
            db.transactions.delete_many({})
            transactions = state_data.get('transactions', [])
            if transactions:
                db.transactions.insert_many(transactions)
            
            # Save companies
            db.companies.delete_many({})
            companies = state_data.get('companies', [])
            if companies:
                db.companies.insert_many(companies)
            
            # Save shop settings
            db.shop.delete_many({})
            shop = state_data.get('shop', {})
            if shop:
                db.shop.insert_one(shop)
                
            return jsonify({"status": "success"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

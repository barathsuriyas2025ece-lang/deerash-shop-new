import os
import json
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import pymongo

PORT = int(os.environ.get("PORT", 5000))
MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "deerash_shop"

# Ensure working directory is the script directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Connect to MongoDB
try:
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    # Ping server to verify connection
    client.server_info()
    db = client[DB_NAME]
    print("Successfully connected to MongoDB.")
except Exception as e:
    print(f"CRITICAL ERROR: Could not connect to MongoDB: {e}")
    print("Please make sure MongoDB service is running and accessible.")
    if not os.environ.get("RENDER"):
        input("Press Enter to exit...")
    sys.exit(1)

# Session storage for authenticated clients (delegated to MongoDB)
def register_session(token):
    try:
        db.sessions.insert_one({"token": token})
    except Exception as e:
        print(f"Error registering session: {e}")

def is_valid_session(token):
    try:
        return db.sessions.find_one({"token": token}) is not None
    except Exception as e:
        print(f"Error validating session: {e}")
        return False

class ShopRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable caching during dev/local usage for immediate feedback
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/state':
            # Verify authorization header
            auth_header = self.headers.get('Authorization', '')
            token = ''
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
            
            if not token or not is_valid_session(token):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Unauthorized"}).encode('utf-8'))
                return

            try:
                # Load collections
                items = list(db.items.find({}, {'_id': 0}))
                transactions = list(db.transactions.find({}, {'_id': 0}))
                companies = list(db.companies.find({}, {'_id': 0}))
                
                # Shop details (single document)
                shop = db.shop.find_one({}, {'_id': 0})
                if not shop:
                    shop = None
                
                state = {
                    "items": items,
                    "transactions": transactions,
                    "companies": companies,
                    "shop": shop
                }
                
                # Check if data is completely uninitialized (new db)
                is_empty = len(items) == 0 and len(transactions) == 0 and len(companies) == 0 and shop is None
                
                response_data = {
                    "status": "success",
                    "state": state if not is_empty else None
                }
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            # Fallback to serving static files from workspace
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/login':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                username = data.get('username', '')
                password = data.get('password', '')
                
                owner_user = os.environ.get("OWNER_USERNAME", "admin")
                owner_pass = os.environ.get("OWNER_PASSWORD", "admin123")
                
                if username == owner_user and password == owner_pass:
                    import uuid
                    token = uuid.uuid4().hex
                    register_session(token)
                    
                    response_data = {"status": "success", "token": token}
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                else:
                    self.send_response(401)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Invalid username or password"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        elif parsed.path == '/api/state':
            # Verify authorization header
            auth_header = self.headers.get('Authorization', '')
            token = ''
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
            
            if not token or not is_valid_session(token):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Unauthorized"}).encode('utf-8'))
                return

            try:
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                state = data.get('state', {})
                
                # Save items
                db.items.delete_many({})
                items = state.get('items', [])
                if items:
                    db.items.insert_many(items)
                
                # Save transactions
                db.transactions.delete_many({})
                transactions = state.get('transactions', [])
                if transactions:
                    db.transactions.insert_many(transactions)
                
                # Save companies
                db.companies.delete_many({})
                companies = state.get('companies', [])
                if companies:
                    db.companies.insert_many(companies)
                
                # Save shop settings
                db.shop.delete_many({})
                shop = state.get('shop', {})
                if shop:
                    db.shop.insert_one(shop)
                
                response_data = {"status": "success"}
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=ShopRequestHandler):
    # Bind to 0.0.0.0 to allow Render/public access
    server_address = ('0.0.0.0', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"\nDeerash Shop Management Backend running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop the server.")
    
    # Automatically open the browser only when running locally (not on Render)
    if not os.environ.get("RENDER"):
        webbrowser.open(f"http://localhost:{PORT}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    finally:
        httpd.server_close()
        print("Server stopped.")

if __name__ == '__main__':
    run()

# backend/app.py - 完整修正版
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv
from utils.database import init_db
from routes.auth import auth_bp
from routes.tasks import tasks_bp
from datetime import datetime

# 載入環境變數
load_dotenv()

app = Flask(__name__)

# 設定
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 604800  # 7天 (秒)
app.config['MONGO_URI'] = os.getenv('MONGO_URI', 'mongodb://localhost:27017/calendar_app')

# 修正 CORS 設定
CORS(app, 
     supports_credentials=True,
     origins=["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# 處理 OPTIONS 請求
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', '*')
        response.headers.add('Access-Control-Allow-Methods', '*')
        return response

# 初始化擴展
jwt = JWTManager(app)

# 初始化資料庫
init_db(app)

# 註冊藍圖
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(tasks_bp, url_prefix='/api/tasks')

# 測試路由
@app.route('/')
def home():
    return jsonify({
        'message': '行事曆 API',
        'version': '1.0.0',
        'status': 'running',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/test', methods=['GET'])
def api_test():
    return jsonify({
        'success': True,
        'message': 'API 連線測試成功',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/health')
def health():
    return jsonify({'status': 'ok'})

# 錯誤處理
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': '路由不存在'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': '伺服器內部錯誤',
        'error': str(error) if app.debug else None
    }), 500

if __name__ == '__main__':
    # 關閉自動重載，避免 Windows 通訊端問題
    print("🚀 啟動行事曆 API 伺服器...")
    print("📡 伺服器網址: http://127.0.0.1:5000")
    print("📡 前端網址: http://localhost:5500")
    app.run(debug=True, host='127.0.0.1', port=5000, use_reloader=False)
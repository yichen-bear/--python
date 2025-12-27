# backend/routes/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from models.user import User
from utils.database import mongo
from bson import ObjectId

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        
        # 驗證輸入
        if not all([username, email, password]):
            return jsonify({
                'success': False,
                'message': '請填寫所有欄位'
            }), 400
        
        # 檢查用戶是否已存在
        if User.find_by_email(mongo.db, email):
            return jsonify({
                'success': False,
                'message': '電子郵件已存在'
            }), 400
        
        if User.find_by_username(mongo.db, username):
            return jsonify({
                'success': False,
                'message': '用戶名已存在'
            }), 400
        
        # 檢查密碼長度
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': '密碼至少需要6個字符'
            }), 400
        
        # 創建新用戶
        user = User(username, email, password)
        user.save(mongo.db)
        
        # 生成 JWT token
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=7)
        )
        
        return jsonify({
            'success': True,
            'message': '註冊成功',
            'token': access_token,
            'user': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email
            }
        }), 201
        
    except Exception as e:
        print(f"註冊錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': '註冊失敗',
            'error': str(e)
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        
        # 驗證輸入
        if not all([email, password]):
            return jsonify({
                'success': False,
                'message': '請填寫所有欄位'
            }), 400
        
        # 查找用戶
        user = User.find_by_email(mongo.db, email)
        print(f"找到用戶: {user is not None}")
        print(f"用戶郵箱: {email}")
        
        if not user:
            return jsonify({
                'success': False,
                'message': '電子郵件或密碼錯誤'
            }), 401
        
        # 檢查密碼
        print(f"檢查密碼: {user.check_password(password)}")
        if not user.check_password(password):
            return jsonify({
                'success': False,
                'message': '電子郵件或密碼錯誤'
            }), 401
        
        # 生成 JWT token
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(days=7)
        )
        
        return jsonify({
            'success': True,
            'message': '登入成功',
            'token': access_token,
            'user': {
                'id': str(user.id),
                'username': user.username,
                'email': user.email
            }
        })
        
    except Exception as e:
        print(f"登入錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': '登入失敗',
            'error': str(e)
        }), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        current_user_id = get_jwt_identity()
        
        user_data = mongo.db.users.find_one({'_id': ObjectId(current_user_id)})
        if not user_data:
            return jsonify({
                'success': False,
                'message': '用戶不存在'
            }), 404
        
        # 移除密碼雜湊
        user_data.pop('password_hash', None)
        user_data.pop('password', None)
        
        return jsonify({
            'success': True,
            'user': {
                'id': str(user_data['_id']),
                'username': user_data['username'],
                'email': user_data['email']
            }
        })
        
    except Exception as e:
        print(f"取得用戶資料錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': '取得用戶資料失敗',
            'error': str(e)
        }), 500
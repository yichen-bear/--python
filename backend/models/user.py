# backend/models/user.py
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from bson import ObjectId

class User:
    def __init__(self, username, email, password, _id=None, created_at=None):
        self.id = _id
        self.username = username
        self.email = email
        if password:  # 如果有提供密碼，才進行雜湊
            self.password_hash = generate_password_hash(password)
        else:
            self.password_hash = None  # 允許從資料庫讀取時不重新雜湊
        self.created_at = created_at or datetime.utcnow()
    
    @staticmethod
    def from_dict(data):
        """從字典創建用戶實例 - 修正版本"""
        # 重要：從資料庫讀取時，password欄位應該叫 password_hash
        password = data.get('password', '')  # 嘗試從password欄位讀取
        password_hash = data.get('password_hash', '')  # 嘗試從password_hash欄位讀取
        
        # 創建用戶時使用正確的欄位
        user = User(
            username=data.get('username'),
            email=data.get('email'),
            password='',  # 不重新設定密碼
            _id=data.get('_id'),
            created_at=data.get('created_at')
        )
        
        # 設定正確的密碼雜湊
        if password_hash:
            user.password_hash = password_hash
        elif password:
            # 如果資料庫存的是password而不是password_hash，就使用它
            user.password_hash = password
        
        return user
    
    def to_dict(self):
        """轉換為字典 - 修正版本"""
        return {
            '_id': str(self.id) if self.id else None,
            'username': self.username,
            'email': self.email,
            'password_hash': self.password_hash,  # 確保欄位名稱正確
            'created_at': self.created_at
        }
    
    def check_password(self, password):
        """檢查密碼 - 修正版本"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    @staticmethod
    def find_by_email(db, email):
        """通過郵箱查找用戶"""
        user_data = db.users.find_one({'email': email})
        if user_data:
            return User.from_dict(user_data)
        return None
    
    @staticmethod
    def find_by_username(db, username):
        """通過用戶名查找用戶"""
        user_data = db.users.find_one({'username': username})
        if user_data:
            return User.from_dict(user_data)
        return None
    
    def save(self, db):
        """保存用戶到資料庫"""
        user_dict = self.to_dict()
        
        # 移除None值的_id
        if user_dict['_id'] is None:
            user_dict.pop('_id', None)
        
        if self.id:
            # 更新
            result = db.users.update_one(
                {'_id': ObjectId(self.id)},
                {'$set': user_dict}
            )
        else:
            # 插入
            result = db.users.insert_one(user_dict)
            self.id = result.inserted_id
        
        return self
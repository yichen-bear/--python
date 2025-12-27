# backend/utils/database.py
from flask_pymongo import PyMongo
from datetime import datetime
import os

mongo = PyMongo()

def init_db(app):
    """初始化資料庫連接"""
    app.config['MONGO_URI'] = os.getenv('MONGO_URI', 'mongodb://localhost:27017/calendar_app')
    mongo.init_app(app)
    
    # 創建索引
    with app.app_context():
        # 用戶集合索引
        mongo.db.users.create_index('email', unique=True)
        mongo.db.users.create_index('username', unique=True)
        
        # 任務集合索引
        mongo.db.tasks.create_index([('userId', 1), ('date', 1)])
        mongo.db.tasks.create_index([('userId', 1), ('createdAt', -1)])
        
    print("✅ 資料庫連接成功")
    return mongo
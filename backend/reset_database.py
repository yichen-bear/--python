#!/usr/bin/env python
# backend/reset_database.py - 資料庫重置工具

import sys
import os

# 添加專案路徑到 Python 路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.database import mongo
from app import app

def reset_database():
    """重置資料庫"""
    print("🔄 正在重置資料庫...")
    
    with app.app_context():
        try:
            # 刪除 collections
            print("🗑️  刪除 tasks 集合...")
            mongo.db.tasks.drop()
            
            print("🗑️  刪除 users 集合...")
            mongo.db.users.drop()
            
            # 重新創建索引
            print("🔧 創建 users 集合索引...")
            mongo.db.users.create_index('email', unique=True)
            mongo.db.users.create_index('username', unique=True)
            
            print("🔧 創建 tasks 集合索引...")
            mongo.db.tasks.create_index([('user_id', 1), ('date', 1)])
            mongo.db.tasks.create_index([('user_id', 1), ('created_at', -1)])
            
            print("✅ 資料庫重置完成！")
            print("📊 現有集合:", mongo.db.list_collection_names())
            
        except Exception as e:
            print(f"❌ 重置資料庫時出錯: {e}")
            import traceback
            traceback.print_exc()

def check_database():
    """檢查資料庫狀態"""
    print("🔍 檢查資料庫狀態...")
    
    with app.app_context():
        try:
            # 測試連接
            db_info = mongo.db.command('ping')
            print(f"✅ MongoDB 連接正常")
            
            # 檢查 collections
            collections = mongo.db.list_collection_names()
            print(f"📊 現有集合: {collections}")
            
            # 檢查每個集合的數據量
            for coll_name in collections:
                count = mongo.db[coll_name].count_documents({})
                print(f"  {coll_name}: {count} 個文檔")
            
            return True
            
        except Exception as e:
            print(f"❌ 資料庫檢查失敗: {e}")
            return False

def create_test_user():
    """創建測試用戶"""
    print("👤 創建測試用戶...")
    
    with app.app_context():
        try:
            from models.user import User
            
            # 檢查用戶是否已存在
            existing_user = mongo.db.users.find_one({'email': 'test@example.com'})
            if existing_user:
                print("📝 測試用戶已存在")
                return
            
            # 創建測試用戶
            user = User(
                username='testuser',
                email='test@example.com',
                password='password123'
            )
            user.save(mongo.db)
            
            print(f"✅ 創建測試用戶成功！")
            print(f"  用戶ID: {user.id}")
            print(f"  用戶名: {user.username}")
            print(f"  郵箱: {user.email}")
            
        except Exception as e:
            print(f"❌ 創建測試用戶失敗: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("資料庫管理工具")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "reset":
            reset_database()
        elif command == "check":
            check_database()
        elif command == "testuser":
            create_test_user()
        elif command == "all":
            reset_database()
            create_test_user()
        else:
            print(f"❓ 未知命令: {command}")
            print("可用命令:")
            print("  reset     - 重置資料庫")
            print("  check     - 檢查資料庫狀態")
            print("  testuser  - 創建測試用戶")
            print("  all       - 重置並創建測試用戶")
    else:
        # 默認執行檢查
        check_database()
        print("\n💡 使用方法:")
        print("  python reset_database.py reset    - 重置資料庫")
        print("  python reset_database.py check    - 檢查資料庫狀態")
        print("  python reset_database.py testuser - 創建測試用戶")
        print("  python reset_database.py all      - 重置並創建測試用戶")
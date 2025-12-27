# backend/models/task.py - 確保用戶ID處理正確
from datetime import datetime
from bson import ObjectId

class Task:
    def __init__(self, user_id, title, date, start_time, end_time, desc='', 
                 _id=None, created_at=None):
        self.id = _id
        self.user_id = str(user_id) if user_id else None  # 確保是字符串
        self.title = title
        self.date = date  # 格式: YYYY-MM-DD
        self.start_time = start_time  # 格式: HH:MM
        self.end_time = end_time      # 格式: HH:MM
        self.desc = desc
        self.created_at = created_at or datetime.utcnow()
    
    @staticmethod
    def from_dict(data):
        """從字典創建任務實例"""
        return Task(
            user_id=data.get('user_id'),
            title=data.get('title'),
            date=data.get('date'),
            start_time=data.get('start_time'),
            end_time=data.get('end_time'),
            desc=data.get('desc', ''),
            _id=data.get('_id'),
            created_at=data.get('created_at')
        )
    
    def to_dict(self):
        """轉換為字典"""
        return {
            'id': str(self.id) if self.id else None,
            'user_id': self.user_id,
            'title': self.title,
            'date': self.date,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'desc': self.desc,
            'created_at': self.created_at
        }
    
    def save(self, db):
        """保存任務到資料庫"""
        task_dict = self.to_dict()
        
        # 移除None值的id
        if task_dict['id'] is None:
            task_dict.pop('id', None)
        
        if self.id:
            # 更新 - 確保使用 ObjectId
            db.tasks.update_one(
                {'_id': ObjectId(self.id), 'user_id': self.user_id},
                {'$set': task_dict}
            )
        else:
            # 插入
            result = db.tasks.insert_one(task_dict)
            self.id = result.inserted_id
        
        return self
    
    def delete(self, db):
        """從資料庫刪除任務"""
        return db.tasks.delete_one(
            {'_id': ObjectId(self.id), 'user_id': self.user_id}
        )
    
    @staticmethod
    def find_by_user(db, user_id, date=None):
        """查找用戶的任務"""
        query = {'user_id': str(user_id)}  # 確保user_id是字符串
        if date:
            query['date'] = date
        
        tasks_cursor = db.tasks.find(query).sort([('date', 1), ('start_time', 1)])
        return [Task.from_dict(task) for task in tasks_cursor]
    
    @staticmethod
    def find_by_id(db, task_id, user_id):
        """通過ID查找任務"""
        try:
            task_data = db.tasks.find_one({
                '_id': ObjectId(task_id), 
                'user_id': str(user_id)  # 確保user_id是字符串
            })
            if task_data:
                return Task.from_dict(task_data)
        except:
            pass
        return None
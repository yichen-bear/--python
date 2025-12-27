# backend/routes/tasks.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from models.task import Task
from utils.database import mongo
from bson import ObjectId
import re
import traceback

# 修正：先定義 Blueprint，再使用裝飾器
tasks_bp = Blueprint('tasks', __name__)

# 驗證函數
def validate_time_format(time_str):
    """驗證時間格式 HH:MM"""
    if not isinstance(time_str, str):
        return False
    return re.match(r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', time_str) is not None

def validate_date_format(date_str):
    """驗證日期格式 YYYY-MM-DD"""
    if not isinstance(date_str, str):
        return False
    return re.match(r'^\d{4}-\d{2}-\d{2}$', date_str) is not None

def validate_task_data(data, user_id):
    """驗證任務數據"""
    errors = []
    
    # 檢查必填欄位
    required_fields = ['title', 'date', 'startTime', 'endTime']
    for field in required_fields:
        if field not in data or not data[field]:
            # 嘗試使用底線格式的欄位名稱
            alt_field = field.replace('Time', '_time')
            if alt_field in data and data[alt_field]:
                data[field] = data[alt_field]
            else:
                errors.append(f'缺少必填欄位: {field}')
    
    if errors:
        return False, errors
    
    # 驗證時間格式
    if not validate_time_format(data['startTime']):
        errors.append('開始時間格式不正確，應為 HH:MM')
    
    if not validate_time_format(data['endTime']):
        errors.append('結束時間格式不正確，應為 HH:MM')
    
    # 驗證日期格式
    if not validate_date_format(data['date']):
        errors.append('日期格式不正確，應為 YYYY-MM-DD')
    
    # 驗證時間邏輯
    if data['startTime'] >= data['endTime']:
        errors.append('結束時間必須晚於開始時間')
    
    return len(errors) == 0, errors

@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    try:
        user_id = get_jwt_identity()
        date = request.args.get('date')
        
        print(f"[GET] 獲取任務 - 用戶ID: {user_id}, 日期: {date}")
        
        # 驗證用戶ID
        if not user_id:
            return jsonify({
                'success': False,
                'message': '用戶未認證'
            }), 401
        
        # 只查找當前用戶的任務
        tasks = Task.find_by_user(mongo.db, user_id, date)
        
        print(f"[GET] 找到 {len(tasks)} 個任務")
        
        return jsonify({
            'success': True,
            'tasks': [task.to_dict() for task in tasks]
        })
        
    except Exception as e:
        print(f"[GET] 取得任務錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': '取得任務失敗',
            'error': str(e)
        }), 500

@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    try:
        print("=" * 60)
        print("[POST] 收到創建任務請求")
        
        # 獲取用戶身份
        user_id = get_jwt_identity()
        print(f"[POST] 當前用戶ID: {user_id}")
        
        if not user_id:
            print("[POST] 錯誤: 用戶ID為空")
            return jsonify({
                'success': False,
                'message': '用戶未認證'
            }), 401
        
        # 獲取請求數據
        if not request.is_json:
            print("[POST] 錯誤: 請求不是JSON格式")
            return jsonify({
                'success': False,
                'message': '請求格式必須為JSON'
            }), 400
        
        data = request.json
        print(f"[POST] 請求數據: {data}")
        
        # 驗證數據
        is_valid, errors = validate_task_data(data, user_id)
        if not is_valid:
            print(f"[POST] 驗證失敗: {errors}")
            return jsonify({
                'success': False,
                'message': '數據驗證失敗',
                'errors': errors
            }), 400
        
        # 提取數據
        title = data.get('title')
        date = data.get('date')
        start_time = data.get('startTime')
        end_time = data.get('endTime')
        desc = data.get('desc', '')
        
        print(f"[POST] 解析後數據: title={title}, date={date}, start_time={start_time}, end_time={end_time}")
        
        # 檢查時間衝突（只檢查當前用戶的任務）
        print(f"[POST] 檢查時間衝突...")
        try:
            conflicting_tasks = mongo.db.tasks.find({
                'user_id': str(user_id),
                'date': date,
                '$or': [
                    {
                        'start_time': {'$lt': end_time},
                        'end_time': {'$gt': start_time}
                    }
                ]
            })
            
            conflict_count = conflicting_tasks.count()
            print(f"[POST] 衝突任務數量: {conflict_count}")
            
            if conflict_count > 0:
                conflict = list(conflicting_tasks)[0]
                print(f"[POST] 發現衝突任務: {conflict}")
                return jsonify({
                    'success': False,
                    'message': '該時段已有其他任務',
                    'conflicting_task': {
                        'id': str(conflict.get('_id')),
                        'title': conflict.get('title'),
                        'start_time': conflict.get('start_time'),
                        'end_time': conflict.get('end_time')
                    }
                }), 400
        except Exception as e:
            print(f"[POST] 檢查時間衝突時出錯: {e}")
            # 繼續創建任務，不因衝突檢查失敗而中斷
        
        # 創建任務 - 確保包含用戶ID
        print(f"[POST] 創建Task物件...")
        try:
            task = Task(
                user_id=str(user_id),  # 確保是字符串
                title=title,
                date=date,
                start_time=start_time,
                end_time=end_time,
                desc=desc
            )
            
            print(f"[POST] Task物件創建成功: {task.to_dict()}")
        except Exception as e:
            print(f"[POST] 創建Task物件失敗: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': '創建任務物件失敗',
                'error': str(e)
            }), 500
        
        # 保存任務到資料庫
        print(f"[POST] 保存任務到資料庫...")
        try:
            task.save(mongo.db)
            print(f"[POST] 任務保存成功，ID: {task.id}")
        except Exception as e:
            print(f"[POST] 保存任務失敗: {e}")
            traceback.print_exc()
            return jsonify({
                'success': False,
                'message': '保存任務到資料庫失敗',
                'error': str(e)
            }), 500
        
        print("[POST] 任務創建成功！")
        print("=" * 60)
        
        return jsonify({
            'success': True,
            'message': '任務創建成功',
            'task': task.to_dict()
        }), 201
        
    except Exception as e:
        print("!" * 60)
        print(f"[POST] 創建任務整體錯誤: {str(e)}")
        traceback.print_exc()
        print("!" * 60)
        
        return jsonify({
            'success': False,
            'message': '創建任務失敗',
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

@tasks_bp.route('/<task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    """獲取單個任務"""
    try:
        user_id = get_jwt_identity()
        print(f"[GET by ID] 獲取任務 - 用戶ID: {user_id}, 任務ID: {task_id}")
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': '用戶未認證'
            }), 401
        
        # 查找任務 - 確保是當前用戶的任務
        task = Task.find_by_id(mongo.db, task_id, user_id)
        if not task:
            print(f"[GET by ID] 任務不存在或無權限查看")
            return jsonify({
                'success': False,
                'message': '任務不存在或無權限查看'
            }), 404
        
        print(f"[GET by ID] 找到任務: {task.title}")
        
        return jsonify({
            'success': True,
            'task': task.to_dict()
        })
        
    except Exception as e:
        print(f"[GET by ID] 取得單一任務錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': '取得任務失敗',
            'error': str(e)
        }), 500

@tasks_bp.route('/<task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    try:
        user_id = get_jwt_identity()
        print(f"[PUT] 更新任務 - 用戶ID: {user_id}, 任務ID: {task_id}")
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': '用戶未認證'
            }), 401
        
        if not request.is_json:
            return jsonify({
                'success': False,
                'message': '請求格式必須為JSON'
            }), 400
        
        data = request.json
        print(f"[PUT] 更新數據: {data}")
        
        # 查找任務 - 確保是當前用戶的任務
        task = Task.find_by_id(mongo.db, task_id, user_id)
        if not task:
            print(f"[PUT] 任務不存在或無權限修改")
            return jsonify({
                'success': False,
                'message': '任務不存在或無權限修改'
            }), 404
        
        # 更新任務數據
        updates = {}
        if 'title' in data:
            task.title = data['title']
            updates['title'] = data['title']
        
        if 'date' in data:
            if not validate_date_format(data['date']):
                return jsonify({
                    'success': False,
                    'message': '日期格式不正確，應為 YYYY-MM-DD'
                }), 400
            task.date = data['date']
            updates['date'] = data['date']
        
        if 'startTime' in data or 'start_time' in data:
            start_time = data.get('startTime') or data.get('start_time')
            if not validate_time_format(start_time):
                return jsonify({
                    'success': False,
                    'message': '開始時間格式不正確，應為 HH:MM'
                }), 400
            task.start_time = start_time
            updates['start_time'] = start_time
        
        if 'endTime' in data or 'end_time' in data:
            end_time = data.get('endTime') or data.get('end_time')
            if not validate_time_format(end_time):
                return jsonify({
                    'success': False,
                    'message': '結束時間格式不正確，應為 HH:MM'
                }), 400
            task.end_time = end_time
            updates['end_time'] = end_time
        
        if 'desc' in data:
            task.desc = data['desc']
            updates['desc'] = data['desc']
        
        # 驗證時間邏輯
        if hasattr(task, 'start_time') and hasattr(task, 'end_time'):
            if task.start_time >= task.end_time:
                return jsonify({
                    'success': False,
                    'message': '結束時間必須晚於開始時間'
                }), 400
        
        print(f"[PUT] 執行更新: {updates}")
        
        # 保存更新
        task.save(mongo.db)
        
        print(f"[PUT] 任務更新成功")
        
        return jsonify({
            'success': True,
            'message': '任務更新成功',
            'task': task.to_dict()
        })
        
    except Exception as e:
        print(f"[PUT] 更新任務錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': '更新任務失敗',
            'error': str(e)
        }), 500

@tasks_bp.route('/<task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    try:
        user_id = get_jwt_identity()
        print(f"[DELETE] 刪除任務 - 用戶ID: {user_id}, 任務ID: {task_id}")
        
        if not user_id:
            return jsonify({
                'success': False,
                'message': '用戶未認證'
            }), 401
        
        # 查找任務 - 確保是當前用戶的任務
        task = Task.find_by_id(mongo.db, task_id, user_id)
        if not task:
            print(f"[DELETE] 任務不存在或無權限刪除")
            return jsonify({
                'success': False,
                'message': '任務不存在或無權限刪除'
            }), 404
        
        print(f"[DELETE] 找到任務: {task.title}")
        
        # 刪除任務
        result = task.delete(mongo.db)
        
        if result.deleted_count == 1:
            print(f"[DELETE] 任務刪除成功")
            return jsonify({
                'success': True,
                'message': '任務刪除成功',
                'deleted_task_id': task_id
            })
        else:
            print(f"[DELETE] 刪除失敗，刪除數量: {result.deleted_count}")
            return jsonify({
                'success': False,
                'message': '任務刪除失敗'
            }), 500
        
    except Exception as e:
        print(f"[DELETE] 刪除任務錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': '刪除任務失敗',
            'error': str(e)
        }), 500

@tasks_bp.route('/test', methods=['GET'])
def test_tasks_api():
    """測試 API 是否正常工作"""
    return jsonify({
        'success': True,
        'message': 'Tasks API 正常運行',
        'endpoints': {
            'GET /': '獲取任務列表',
            'POST /': '創建新任務',
            'GET /<id>': '獲取單個任務',
            'PUT /<id>': '更新任務',
            'DELETE /<id>': '刪除任務'
        },
        'timestamp': datetime.utcnow().isoformat()
    })
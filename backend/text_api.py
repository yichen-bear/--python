import requests
import json

# 登入獲取 token
def login_and_get_token():
    login_url = "http://127.0.0.1:5000/api/auth/login"
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    response = requests.post(login_url, json=login_data)
    print("登入響應:", response.status_code, response.json())
    
    if response.status_code == 200:
        return response.json()['token']
    return None

# 創建任務測試
def test_create_task(token):
    create_url = "http://127.0.0.1:5000/api/tasks/"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    task_data = {
        "title": "測試任務",
        "date": "2025-12-27",
        "startTime": "10:00",
        "endTime": "11:00",
        "desc": "測試描述"
    }
    
    response = requests.post(create_url, headers=headers, json=task_data)
    print("創建任務響應:", response.status_code, response.json())
    
    return response.json()

# 主測試函數
def main():
    print("開始測試 API...")
    
    # 先註冊測試用戶（如果需要）
    # register_url = "http://127.0.0.1:5000/api/auth/register"
    # register_data = {
    #     "username": "testuser",
    #     "email": "test@example.com",
    #     "password": "password123"
    # }
    # response = requests.post(register_url, json=register_data)
    # print("註冊響應:", response.status_code, response.json())
    
    # 登入獲取 token
    token = login_and_get_token()
    
    if token:
        # 測試創建任務
        test_create_task(token)
        
        # 測試獲取任務
        get_url = "http://127.0.0.1:5000/api/tasks/"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(get_url, headers=headers)
        print("獲取任務響應:", response.status_code, response.json())
    else:
        print("獲取 token 失敗")

if __name__ == "__main__":
    main()
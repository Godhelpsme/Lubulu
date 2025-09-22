# Lubulu 云存储架构设计

## 技术选型

- **后端**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **认证**: JWT + 密码哈希
- **前端**: 保持现有HTML/CSS/JS架构

## 数据库设计

### 1. users 表
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. user_settings 表
```sql
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pity_days INTEGER DEFAULT 0,
    lu_probability INTEGER DEFAULT 1,
    multi_mode BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### 3. spin_history 表
```sql
CREATE TABLE spin_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    result VARCHAR(20) NOT NULL, -- 'success' or 'failure'
    spin_count INTEGER DEFAULT 1,
    is_pity_triggered BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

### 4. daily_spin_counts 表
```sql
CREATE TABLE daily_spin_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```

## API 设计

### 认证相关

#### POST /api/auth/register
```json
Request:
{
    "username": "string",
    "email": "string", // 可选
    "password": "string"
}

Response:
{
    "success": true,
    "data": {
        "token": "jwt_token",
        "user": {
            "id": 1,
            "username": "user123"
        }
    }
}
```

#### POST /api/auth/login
```json
Request:
{
    "username": "string",
    "password": "string"
}

Response:
{
    "success": true,
    "data": {
        "token": "jwt_token",
        "user": {
            "id": 1,
            "username": "user123"
        }
    }
}
```

#### POST /api/auth/logout
认证: Bearer Token
```json
Response:
{
    "success": true,
    "message": "Logged out successfully"
}
```

### 用户设置相关

#### GET /api/settings
认证: Bearer Token
```json
Response:
{
    "success": true,
    "data": {
        "pityDays": 0,
        "luProbability": 1,
        "multiMode": false
    }
}
```

#### PUT /api/settings
认证: Bearer Token
```json
Request:
{
    "pityDays": 0,
    "luProbability": 1,
    "multiMode": false
}

Response:
{
    "success": true,
    "data": {
        "pityDays": 0,
        "luProbability": 1,
        "multiMode": false
    }
}
```

### 抽取历史相关

#### GET /api/history
认证: Bearer Token
```json
Query Params: ?date=2024-01-01 (可选，获取特定日期)

Response:
{
    "success": true,
    "data": {
        "2024-01-01": "success",
        "2024-01-02": "failure"
    }
}
```

#### POST /api/history
认证: Bearer Token
```json
Request:
{
    "date": "2024-01-01",
    "result": "success", // 'success' or 'failure'
    "isPityTriggered": false
}

Response:
{
    "success": true,
    "data": {
        "date": "2024-01-01",
        "result": "success",
        "isPityTriggered": false
    }
}
```

#### PUT /api/history/:date
认证: Bearer Token
```json
Request:
{
    "result": "success" // 'success' or 'failure'
}

Response:
{
    "success": true,
    "data": {
        "date": "2024-01-01",
        "result": "success"
    }
}
```

#### DELETE /api/history/:date
认证: Bearer Token
```json
Response:
{
    "success": true,
    "message": "History deleted successfully"
}
```

### 抽取次数相关

#### GET /api/spin-count
认证: Bearer Token
```json
Query Params: ?date=2024-01-01 (可选，默认今天)

Response:
{
    "success": true,
    "data": {
        "date": "2024-01-01",
        "count": 3
    }
}
```

#### POST /api/spin-count
认证: Bearer Token
```json
Request:
{
    "date": "2024-01-01", // 可选，默认今天
    "count": 1
}

Response:
{
    "success": true,
    "data": {
        "date": "2024-01-01",
        "count": 1
    }
}
```

### 数据同步相关

#### POST /api/sync/export
认证: Bearer Token
```json
Response:
{
    "success": true,
    "data": {
        "history": {
            "2024-01-01": "success",
            "2024-01-02": "failure"
        },
        "settings": {
            "pityDays": 0,
            "luProbability": 1,
            "multiMode": false
        },
        "exportDate": "2024-01-01T00:00:00.000Z",
        "version": "2.0"
    }
}
```

#### POST /api/sync/import
认证: Bearer Token
```json
Request:
{
    "history": {
        "2024-01-01": "success",
        "2024-01-02": "failure"
    },
    "settings": {
        "pityDays": 0,
        "luProbability": 1,
        "multiMode": false
    },
    "version": "2.0"
}

Response:
{
    "success": true,
    "message": "Data imported successfully"
}
```

## 前端改造要点

1. **添加用户界面**
   - 登录/注册页面
   - 用户信息显示
   - 登出功能

2. **数据存储层重构**
   - 创建 API 客户端类
   - 将所有 localStorage 操作替换为 API 调用
   - 添加离线缓存机制

3. **错误处理**
   - 网络错误处理
   - 认证失败处理
   - 数据同步冲突处理

4. **用户体验优化**
   - 加载状态显示
   - 离线提示
   - 同步状态显示

## 部署配置

### Workers 配置
```toml
name = "lubulu-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
D1_DATABASE = "lubulu-prod"
JWT_SECRET = "your-jwt-secret-here"

[env.development]
D1_DATABASE = "lubulu-dev"
JWT_SECRET = "dev-jwt-secret"
```

### 环境变量
- `JWT_SECRET`: JWT 签名密钥
- `D1_DATABASE`: D1 数据库绑定名称
- `ALLOWED_ORIGINS`: CORS 允许的来源
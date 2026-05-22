# 커피 주문 앱 (Coffee Order App)

소프트웨어전공탐색 7장 강의자료를 바탕으로 만든 풀스택 커피 주문 웹 앱입니다.

## 기능

- **주문하기**: 메뉴 조회, 옵션 선택(HOT/ICE, 샷, 시럽), 장바구니, 주문
- **관리자**: 재고 관리(+/−), 주문 현황, 상태 변경(주문 접수 → 제조 중 → 제조 완료)

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프런트엔드 | React, Vite |
| 백엔드 | Node.js, Express |
| DB | PostgreSQL |

## 폴더 구조

```
order-app/
├── docs/PRD.md      # 기획 문서
├── ui/              # React 프런트엔드 (포트 5173)
└── server/          # Express API (포트 3001)
```

## 실행 방법

### 1. PostgreSQL 설치

[PostgreSQL 다운로드](https://www.postgresql.org/download/) 후 설치하고 비밀번호를 기억해 두세요.

### 2. 백엔드 설정

```bash
cd server
npm install
```

`server/.env.example`을 복사해 `server/.env` 파일을 만든 뒤 DB 비밀번호를 입력합니다.

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_order_db
DB_USER=postgres
DB_PASSWORD=여기에_비밀번호
```

데이터베이스와 샘플 메뉴를 초기화합니다.

```bash
npm run init-db
npm run dev
```

브라우저에서 http://localhost:3001 접속 시 API 서버 메시지가 보이면 성공입니다.

### 3. 프런트엔드 실행

새 터미널에서:

```bash
cd ui
npm install
npm run dev
```

http://localhost:5173 에서 앱을 사용할 수 있습니다.

## API

| Method | URL | 설명 |
|--------|-----|------|
| GET | /api/menus | 메뉴 목록 |
| PATCH | /api/menus/:id/stock | 재고 수정 |
| POST | /api/orders | 주문 생성 |
| GET | /api/orders | 주문 목록 |
| PATCH | /api/orders/:id/status | 주문 상태 변경 |

## 배포 (Render)

강의자료 7-4절 참고:

1. GitHub에 `order-app` 업로드
2. Render에서 PostgreSQL 생성 후 `server/.env`에 연결 정보 입력
3. Web Service: Root `server`, Start `node index.js`
4. Static Site: Root `ui`, Build `npm install && npm run build`, Publish `dist`
5. 프런트엔드에 `VITE_API_URL` 환경 변수로 백엔드 URL 설정

## GitHub에 푸시하기

저장소: https://github.com/chocoarcher/order-app

### Cursor에서 (GUI)

1. 왼쪽 **소스 제어** 클릭
2. 변경 파일 옆 **+** (Stage) 또는 **모두 스테이징**
3. 메시지 입력 (예: `fix: UI 배포 설정 수정`)
4. **Commit** 클릭
5. **Sync Changes** 또는 **Publish Branch** 클릭

### 터미널 / 스크립트

프로젝트 상위 폴더(`소프트`)에서:

```powershell
cd "c:\Users\user 10\Desktop\소프트"
.\scripts\git-push.ps1 "커밋 메시지"
```

또는 직접:

```powershell
cd "c:\Users\user 10\Desktop\소프트"
git add -A
git commit -m "커밋 메시지"
git push order-app main
```

푸시 후 Render → **Manual Deploy** → **Deploy latest commit**

## 사용 흐름

1. **주문하기** 탭에서 메뉴 선택 → 장바구니 담기 → 주문하기
2. **관리자** 탭에서 재고 확인 및 주문 상태 변경
3. 주문 시 재고가 자동으로 차감됩니다.

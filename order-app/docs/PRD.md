# 커피 주문 앱

## 1. 프로젝트 개요

### 1.1 프로젝트명
커피 주문 앱

### 1.2 프로젝트 목적
사용자가 커피 메뉴를 주문하고, 관리자가 주문을 관리할 수 있는 간단한 풀스택 웹 앱

### 1.3 개발 범위
- 주문하기 화면(메뉴 선택 및 장바구니 기능)
- 관리자 화면(재고 관리 및 주문 상태 관리)
- 데이터를 생성/조회/수정/삭제할 수 있는 기능

## 2. 기술 스택
- 프런트엔드: HTML, CSS, React, JavaScript
- 백엔드: Node.js, Express
- 데이터베이스: PostgreSQL

## 3. 기본 사항
- 프런트엔드와 백엔드를 따로 개발
- 학습 목적이므로 사용자 인증이나 결제 기능은 제외
- 메뉴는 커피 메뉴만 있음
- 관리자는 1명만 있음

## 4. 주문하기 화면

### 4.1 레이아웃
- 상단: 브랜드명, 주문하기/관리자 탭
- 메뉴 카드 그리드: 이미지, 이름, 가격, 옵션, 담기 버튼
- 하단: 장바구니(선택 메뉴, 수량, 금액), 주문하기 버튼

### 4.2 기능
- DB에서 메뉴 목록 조회 및 표시
- 옵션 선택: 샷 추가(+500원), 시럽 추가(+0원), ICE/HOT
- 장바구니에 담기, 수량 조절, 항목 삭제
- 주문하기 클릭 시 주문 생성 및 완료 메시지

## 5. 관리자 화면

### 5.1 레이아웃
- 재고 현황: 메뉴별 재고 수량, +/- 버튼
- 주문 현황: 주문 시간, 메뉴 내역, 금액, 상태 버튼

### 5.2 기능
- 재고 수량 조회 및 수정
- 주문 목록 조회 (최신순)
- 주문 상태 변경: 주문 접수 → 제조 중 → 제조 완료

## 6. 데이터 모델

### menus
| 필드 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | PK |
| name | VARCHAR | 메뉴명 |
| description | TEXT | 설명 |
| price | INTEGER | 기본 가격(원) |
| image_url | VARCHAR | 이미지 경로 |
| stock | INTEGER | 재고 수량 |

### orders
| 필드 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | PK |
| created_at | TIMESTAMP | 주문 시간 |
| status | VARCHAR | 주문 접수 / 제조 중 / 제조 완료 |
| total_amount | INTEGER | 총 금액 |

### order_items
| 필드 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | PK |
| order_id | INTEGER | FK → orders |
| menu_id | INTEGER | FK → menus |
| menu_name | VARCHAR | 주문 시점 메뉴명 |
| quantity | INTEGER | 수량 |
| options | JSONB | 선택 옵션 |
| unit_price | INTEGER | 단가 |
| line_total | INTEGER | 소계 |

## 7. API

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/menus | 메뉴 목록 |
| PATCH | /api/menus/:id/stock | 재고 수정 |
| POST | /api/orders | 주문 생성 |
| GET | /api/orders | 주문 목록 |
| PATCH | /api/orders/:id/status | 주문 상태 변경 |

# AURUM — 고급 시계 데모

로컬에서 정적 웹페이지로 실행합니다.

사용 방법

- `index.html`을 브라우저에서 열어 확인합니다.
- 권장: VS Code에서 `Live Server` 확장 사용 또는 간단한 로컬 서버 실행:

```bash
# Python 3
python -m http.server 8000

# 또는 (Node.js가 설치된 경우)
npx serve .
```

구성

- `data.json`에서 제품 정보(브랜드, 이름, 가격, 설명)와 색상/재질/스트랩 파라미터를 수정하면 UI와 3D 모델이 반영됩니다.

파일

- `index.html` — 페이지 구조
- `styles.css` — 브랜드 스타일
- `script.js` — Three.js 렌더러 및 제품 바인딩
- `data.json` — 구성 및 제품 메타데이터

원하시면 구매 모달, 장바구니 연동, 또는 반응형 갤러리 추가를 도와드리겠습니다.

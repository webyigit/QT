# 하루하루 말씀카드

매일 한 구절의 말씀을 카드로 펼치고, 카드 뒷면에 묵상을 적어 친구와 나누는 모바일 웹앱(PWA)입니다.

## 기능
- 어제·오늘·내일 카드가 3D 원형으로 배치, 좌우 스와이프로 회전 / 중앙 카드 부유 효과
- 카드 탭 → 뒤집기 → 묵상 작성(자동 저장), 친구 묵상 함께 보기
- 읽음 표시(하트)와 읽은 카드 수, 공유와 공유 수, 카드 이미지(PNG) 저장
- 년/월/일 검색(달력에 읽은 날·묵상한 날 표시), 다크/라이트 모드, 오프라인·홈 화면 설치

## 성경 본문
개역한글판(1961, 대한성서공회) 244구절. 저작권 보호기간이 끝나 공개된 본문입니다.
데이터는 npm `@scoynim/bible` 0.1.1 의 한국어 본문에서 추출했습니다.

## 실행
정적 파일이라 아무 웹서버로 열면 됩니다. 예: `python3 -m http.server`

## 친구 기능(선택, 무료)
1. Supabase 무료 프로젝트 생성 → Authentication에서 **Anonymous sign-ins** 켜기
2. SQL Editor에서 `supabase/schema.sql` 실행
3. GitHub 저장소 Settings → Secrets and variables → Actions 에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 등록
4. Settings → Pages → Source: **GitHub Actions** 선택 후 main에 push

설정이 없으면 체험 모드(가상 친구 데이터, 기기 내 저장)로 동작합니다. 키는 저장소에 커밋하지 않습니다.

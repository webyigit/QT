// 배포 시 GitHub Actions가 시크릿(SUPABASE_URL, SUPABASE_ANON_KEY)으로 이 파일을 덮어씁니다.
// 비어 있으면 "체험 모드"(가상 친구 데이터, 이 기기에만 저장)로 동작합니다. 키를 이 파일에 직접 커밋하지 마세요.
export const CONFIG = { supabaseUrl: '', supabaseAnonKey: '' };

const catalogItems = [
  { id: 1, name: '웹 서버 배포', description: 'Nginx/Apache 웹 서버 최신 버전 배포', duration: '5분', requiresApproval: false },
  { id: 2, name: 'DB 마이그레이션', description: '데이터베이스 스키마 마이그레이션 실행', duration: '10분', requiresApproval: true },
  { id: 3, name: 'SSL 인증서 갱신', description: "Let's Encrypt SSL 인증서 갱신", duration: '3분', requiresApproval: false },
  { id: 4, name: '로그 로테이션', description: '서버 로그 파일 로테이션 및 정리', duration: '2분', requiresApproval: false },
  { id: 5, name: '보안 패치 적용', description: 'OS 보안 패치 일괄 적용', duration: '15분', requiresApproval: true },
  { id: 6, name: '서비스 재시작', description: '지정 서비스 Rolling Restart', duration: '5분', requiresApproval: true },
]

export default function SelfService() {
  const handleRequest = (itemId: number) => {
    // TODO: API 연동 - 셀프서비스 요청 생성
    console.log('Request item:', itemId)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {catalogItems.map((item) => (
        <div key={item.id} className="card p-5 hover:shadow-md transition-shadow flex flex-col">
          <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center text-brand text-lg mb-3 flex-shrink-0">
            ⚙
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
          <p className="text-sm text-gray-500 mb-4 flex-1">{item.description}</p>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
            <span>소요시간: {item.duration}</span>
            {item.requiresApproval && (
              <span className="text-orange-500 font-medium">승인 필요</span>
            )}
          </div>
          <button
            onClick={() => handleRequest(item.id)}
            className="btn-primary w-full justify-center"
          >
            요청하기
          </button>
        </div>
      ))}
    </div>
  )
}

import { useState } from 'react'
import type { Role, PlaybookPermission } from '@/types'

// TODO: API 연동 - 현재 목업 데이터
const mockRoles: Role[] = [
  { id: 1, name: 'admin', description: '시스템 관리자' },
  { id: 2, name: 'senior', description: '시니어 엔지니어' },
  { id: 3, name: 'operator', description: '운영자' },
]

const mockPermissions: PlaybookPermission[] = [
  { playbook: 'deploy-app', role_id: 1, role_name: 'admin', can_execute: true, can_view: true, require_approval: 'none' },
  { playbook: 'deploy-app', role_id: 2, role_name: 'senior', can_execute: true, can_view: true, require_approval: 'none' },
  { playbook: 'deploy-app', role_id: 3, role_name: 'operator', can_execute: true, can_view: true, require_approval: 'senior' },
]

export default function RBAC() {
  const [roles] = useState<Role[]>(mockRoles)
  const [permissions] = useState<PlaybookPermission[]>(mockPermissions)
  const playbooks = [...new Set(permissions.map((p) => p.playbook))]

  return (
    <div className="space-y-6">
      {/* Roles */}
      <div className="bg-white rounded-lg border">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">역할 목록</h2>
        </div>
        <div className="divide-y">
          {roles.map((role) => (
            <div key={role.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">{role.name}</span>
                <span className="text-sm text-gray-500 ml-3">{role.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-lg border">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">플레이북 권한 매트릭스</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">플레이북</th>
                <th className="px-5 py-3 text-left">역할</th>
                <th className="px-5 py-3 text-center">실행</th>
                <th className="px-5 py-3 text-center">조회</th>
                <th className="px-5 py-3 text-left">승인 요구</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {playbooks.map((pb) =>
                permissions
                  .filter((p) => p.playbook === pb)
                  .map((perm, i) => (
                    <tr key={`${perm.playbook}-${perm.role_id}`} className="hover:bg-gray-50">
                      {i === 0 && (
                        <td
                          className="px-5 py-3 font-medium text-gray-900"
                          rowSpan={permissions.filter((p) => p.playbook === pb).length}
                        >
                          {pb}
                        </td>
                      )}
                      <td className="px-5 py-3">{perm.role_name}</td>
                      <td className="px-5 py-3 text-center">{perm.can_execute ? '✓' : '—'}</td>
                      <td className="px-5 py-3 text-center">{perm.can_view ? '✓' : '—'}</td>
                      <td className="px-5 py-3">{perm.require_approval === 'none' ? '—' : perm.require_approval}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import clsx from 'clsx'
import type { WorkflowStep } from '@/types'

interface Props {
  steps: WorkflowStep[]
}

const stepColors: Record<WorkflowStep['status'], string> = {
  idle: 'border-gray-300 bg-gray-50 text-gray-500',
  running: 'border-blue-400 bg-blue-50 text-blue-700',
  done: 'border-green-400 bg-green-50 text-green-700',
  failed: 'border-red-400 bg-red-50 text-red-700',
  waiting: 'border-yellow-400 bg-yellow-50 text-yellow-700',
}

const stepIcons: Record<WorkflowStep['status'], string> = {
  idle: '○',
  running: '◉',
  done: '✓',
  failed: '✗',
  waiting: '◷',
}

export default function WorkflowPipeline({ steps }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-4">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={clsx(
              'flex flex-col items-center justify-center rounded-lg border-2 px-4 py-3 min-w-[120px]',
              stepColors[step.status],
            )}
          >
            <span className="text-xl mb-1">
              {step.icon ?? stepIcons[step.status]}
            </span>
            <span className="text-xs font-medium text-center">{step.name}</span>
            <span className="text-[10px] opacity-60 capitalize">{step.type}</span>
          </div>
          {i < steps.length - 1 && (
            <span className="text-gray-300 text-xl">→</span>
          )}
        </div>
      ))}
    </div>
  )
}
